import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
    DataCollatorForLanguageModeling
)
from peft import (
    get_peft_model,
    LoraConfig,
    TaskType,
    PeftModel,
    prepare_model_for_kbit_training
)
from datasets import Dataset
import os
from typing import List, Dict
from config import Config
from generate_answer import generate_tokens
import asyncio
from huggingface_hub import login
import gc

class EfficientPerUserTrainer:
    def __init__(
        self,
        output_dir: str,
        device: str = "cuda" if torch.cuda.is_available() else "cpu"
    ):
        if Config.HUGGINGFACE_ACCESS_TOKEN:
            login(token=Config.HUGGINGFACE_ACCESS_TOKEN)
        use_auth = bool(Config.HUGGINGFACE_ACCESS_TOKEN)

        self.base_model_path = Config.MODEL_NAME
        self.output_dir = output_dir
        self.device = device
        print(f"Using model: {self.base_model_path}")
        
        # Clear CUDA cache
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.base_model_path, 
            token=Config.HUGGINGFACE_ACCESS_TOKEN if use_auth else None
        )
        if self.tokenizer.pad_token is None:
            self.tokenizer.add_special_tokens({'pad_token': '[PAD]'})
            
        # Load model in 8-bit to reduce memory usage
        self.base_model = AutoModelForCausalLM.from_pretrained(
            self.base_model_path,
            torch_dtype=torch.float16,
            load_in_8bit=True,
            device_map="auto",
            token=Config.HUGGINGFACE_ACCESS_TOKEN if use_auth else None
        )
        
        # Prepare model for training
        self.base_model = prepare_model_for_kbit_training(self.base_model)

    def detect_target_modules(self):
        """Detect appropriate target modules for the model architecture"""
        model_architecture = self.base_model.config.architectures[0].lower() if self.base_model.config.architectures else ""
        
        if "llama" in model_architecture:
            return ["q_proj", "v_proj"]
        elif "gpt" in model_architecture:
            return ["c_attn"]
        elif "opt" in model_architecture:
            return ["q_proj", "k_proj", "v_proj"]
        else:
            # Default to a common pattern
            potential_targets = ["query", "value", "q_proj", "v_proj", "c_attn"]
            available_modules = [name for name, _ in self.base_model.named_modules()]
            return [target for target in potential_targets if any(target in module for module in available_modules)]

    def create_lora_config(self, rank: int = 8) -> LoraConfig:
        """Create LoRA configuration based on model architecture"""
        target_modules = self.detect_target_modules()
        print(f"Using target modules: {target_modules}")
        
        return LoraConfig(
            r=rank,
            lora_alpha=32,
            target_modules=target_modules,
            lora_dropout=0.05,
            bias="none",
            task_type=TaskType.CAUSAL_LM
        )

    def prepare_training_args(self) -> TrainingArguments:
        """Prepare training arguments with memory optimization"""
        return TrainingArguments(
            output_dir=self.output_dir,
            per_device_train_batch_size=1,
            gradient_accumulation_steps=4,
            warmup_steps=100,
            max_steps=1000,
            learning_rate=2e-4,
            fp16=True,
            logging_steps=10,
            gradient_checkpointing=True,
            optim="paged_adamw_32bit",
        )

    def train_user_model(self, user_id: str, user_data: List[Dict]):
        """Train a LoRA adapter for a specific user"""
        # Clear CUDA cache before training
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
            
        # Create LoRA config
        lora_config = self.create_lora_config()
        
        # Create PEFT model
        model = get_peft_model(self.base_model, lora_config)
        
        # Format data
        formatted_data = []
        for item in user_data:
            if not isinstance(item.get('prompt', ''), str) or not isinstance(item.get('response', ''), str):
                raise ValueError("Prompt and response must be strings")
            text = f"### User: {item['prompt']}\n### Assistant: {item['response']}</s>"
            formatted_data.append({
                "text": text
            })
        
        # Create dataset
        try:
            dataset = Dataset.from_list(formatted_data)
        except Exception as e:
            raise ValueError(f"Error creating dataset: {str(e)}")
        
        # Tokenize dataset
        def tokenize_function(examples):
            if not isinstance(examples["text"], (str, list)):
                raise ValueError(f"Invalid text format: {type(examples['text'])}")
            tokens = self.tokenizer(
                examples["text"],
                padding="max_length",
                truncation=True,
                max_length=512,
                return_tensors="pt"
            )
            return {
                "input_ids": tokens["input_ids"].squeeze(0),
                "attention_mask": tokens["attention_mask"].squeeze(0)
            }
        
        try:
            tokenized_dataset = dataset.map(
                tokenize_function,
                batched=True,
                remove_columns=dataset.column_names
            )
        except Exception as e:
            raise ValueError(f"Error tokenizing dataset: {str(e)}")
        
        # Use Hugging Face's data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=self.tokenizer,
            mlm=False  # Causal LM, not masked LM
        )
        
        # Train model
        training_args = self.prepare_training_args()
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=tokenized_dataset,
            data_collator=data_collator
        )
        
        trainer.train()
        
        # Save LoRA adapter
        model.save_pretrained(f"{self.output_dir}/{user_id}")
        
        # Clear memory
        del model
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()

    def load_user_model(self, user_id: str):
        """Load a user's LoRA adapter"""
        use_auth = bool(Config.HUGGINGFACE_ACCESS_TOKEN)
        
        # Load base model (can be shared across users)
        base_model = AutoModelForCausalLM.from_pretrained(
            self.base_model_path,
            torch_dtype=torch.float16,
            load_in_8bit=True,
            device_map="auto",
            token=Config.HUGGINGFACE_ACCESS_TOKEN if use_auth else None
        )
        
        # Load LoRA adapter
        adapter_path = f"{self.output_dir}/{user_id}"
        if not os.path.exists(adapter_path):
            raise ValueError(f"No adapter found for user {user_id} at {adapter_path}")
            
        model = PeftModel.from_pretrained(
            base_model,
            adapter_path
        )
        
        return model

    def get_adapter_size(self, user_id: str) -> float:
        """Get size of user's LoRA adapter in MB"""
        adapter_path = f"{self.output_dir}/{user_id}"
        if not os.path.exists(adapter_path):
            raise ValueError(f"No adapter found for user {user_id} at {adapter_path}")
            
        size_bytes = sum(
            os.path.getsize(os.path.join(adapter_path, f)) 
            for f in os.listdir(adapter_path) 
            if os.path.isfile(os.path.join(adapter_path, f))
        )
        return size_bytes / (1024 * 1024)  # Convert to MB


async def main():
    trainer = EfficientPerUserTrainer(
        output_dir="user_adapters"
    )
    
    # Example user data
    user_data = [
        {
            "prompt": "What's your favorite color?",
            "response": "I like blue because it reminds me of the ocean."
        },
        {
            "prompt": "Tell me about your hobbies.",
            "response": "I enjoy reading science fiction and playing chess."
        }
    ]
    
    try:
        # Train adapter for a specific user
        trainer.train_user_model("user123", user_data)
        
        # Print adapter size
        adapter_size = trainer.get_adapter_size("user123")
        print(f"LoRA adapter size: {adapter_size:.2f} MB")
        
        # Load user-specific model
        user_model = trainer.load_user_model("user123")

        input_text = "Who is the Prime Minister of Canada?"
        max_tokens = 50
        temperature = 0.7
        
        response = ""
        
        async for token in generate_tokens(user_model, trainer.tokenizer, input_text, max_tokens, temperature):
            response += token
            print(token, end="", flush=True)
        
        print("\n\nFinal Response:")
        print(response)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        if hasattr(e, '__traceback__'):
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
