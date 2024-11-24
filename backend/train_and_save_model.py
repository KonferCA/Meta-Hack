import torch
from transformers import LlamaForCausalLM, LlamaTokenizer
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
        
        # Load tokenizer
        self.tokenizer = LlamaTokenizer.from_pretrained(base_model_path, use_auth_token=use_auth)
        if self.tokenizer.pad_token is None:
            self.tokenizer.add_special_tokens({'pad_token': '[PAD]'})
            
        # Load model in 8-bit to reduce memory usage
        self.base_model = LlamaForCausalLM.from_pretrained(
            base_model_path,
            load_in_8bit=True,
            device_map="auto",
            torch_dtype=torch.float16,
            use_auth_token=use_auth
        )
        
        # Prepare model for k-bit training
        self.base_model = prepare_model_for_kbit_training(self.base_model)

    def create_lora_config(self, rank: int = 8) -> LoraConfig:
        """Create LoRA configuration"""
        return LoraConfig(
            r=rank,  # Rank of update matrices
            lora_alpha=32,  # Alpha parameter for LoRA scaling
            target_modules=["q_proj", "v_proj"],  # Which modules to apply LoRA to
            lora_dropout=0.05,
            bias="none",
            task_type=TaskType.CAUSAL_LM
        )

    def prepare_training_args(self) -> dict:
        """Prepare training arguments"""
        return {
            "per_device_train_batch_size": 4,
            "gradient_accumulation_steps": 4,
            "warmup_steps": 100,
            "max_steps": 1000,
            "learning_rate": 2e-4,
            "fp16": True,
            "logging_steps": 10,
            "output_dir": self.output_dir,
        }

    def train_user_model(self, user_id: str, user_data: List[Dict]):
        """Train a LoRA adapter for a specific user"""
        # Create LoRA config
        lora_config = self.create_lora_config()
        
        # Create PEFT model
        model = get_peft_model(self.base_model, lora_config)
        
        # Format data
        formatted_data = []
        for item in user_data:
            text = f"### User: {item['prompt']}\n### Assistant: {item['response']}</s>"
            formatted_data.append({
                "text": text
            })
        
        # Create dataset
        dataset = Dataset.from_list(formatted_data)
        
        # Tokenize dataset
        def tokenize_function(examples):
            return self.tokenizer(
                examples["text"],
                padding="max_length",
                truncation=True,
                max_length=512
            )
        
        tokenized_dataset = dataset.map(tokenize_function, batched=True)
        
        # Train model
        training_args = self.prepare_training_args()
        trainer = transformers.Trainer(
            model=model,
            train_dataset=tokenized_dataset,
            args=transformers.TrainingArguments(**training_args)
        )
        
        trainer.train()
        
        # Save LoRA adapter
        model.save_pretrained(f"{self.output_dir}/{user_id}")
        
    def load_user_model(self, user_id: str):
        """Load a user's LoRA adapter"""
        # Load base model (can be shared across users)
        base_model = LlamaForCausalLM.from_pretrained(
            self.base_model_path,
            load_in_8bit=True,
            device_map="auto"
        )
        
        # Load LoRA adapter
        model = PeftModel.from_pretrained(
            base_model,
            f"{self.output_dir}/{user_id}"
        )
        
        return model

    def get_adapter_size(self, user_id: str) -> float:
        """Get size of user's LoRA adapter in MB"""
        adapter_path = f"{self.output_dir}/{user_id}"
        size_bytes = sum(
            os.path.getsize(os.path.join(adapter_path, f)) 
            for f in os.listdir(adapter_path) 
            if os.path.isfile(os.path.join(adapter_path, f))
        )
        return size_bytes / (1024 * 1024)  # Convert to MB

# Example usage
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

if __name__ == "__main__":
    asyncio.run(main())