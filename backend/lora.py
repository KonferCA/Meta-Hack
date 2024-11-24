import torch
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig, TrainingArguments
from peft import LoraConfig, get_peft_model, PeftModel
from trl import SFTTrainer
from config import Config

def fine_tune_and_save_lora_weights(model_name, data, output_dir="./lora_weights", num_train_epochs=5, max_steps=100):
    """
    Fine-tunes the model using the given dataset and saves the LoRA weights.
    """
    dataset = Dataset.from_list(data)

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=False
    )

    tokenizer = AutoTokenizer.from_pretrained(model_name, padding_side="right", truncation_side="right")
    tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        device_map="auto",
        quantization_config=bnb_config,
        torch_dtype=torch.float16
    )
    model.config.pad_token_id = tokenizer.pad_token_id
    model.config.use_cache = False

    def preprocess_function(examples):
        inputs = [f"User: {i} Bot: {o}" for i, o in zip(examples["input"], examples["output"])]
        labels = ["positive" if f == "like" else "negative" for f in examples["feedback"]]

        tokenized_inputs = tokenizer(
            inputs,
            truncation=True,
            max_length=128,
            padding="max_length",
            return_tensors="pt"
        )
        tokenized_labels = tokenizer(
            labels,
            truncation=True,
            max_length=128,
            padding="max_length",
            return_tensors="pt"
        )

        tokenized_inputs["labels"] = tokenized_labels["input_ids"]
        return tokenized_inputs

    tokenized_dataset = dataset.map(preprocess_function, batched=True)

    model.enable_input_require_grads()

    lora_config = LoraConfig(
        r=8,
        lora_alpha=32,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        inference_mode=False
    )

    model = get_peft_model(model, lora_config)

    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=num_train_epochs,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=16,
        learning_rate=2e-4,
        fp16=True,
        save_total_limit=3,
        logging_dir="./logs",
        logging_steps=10,
        max_steps=max_steps,
        save_steps=50,
        warmup_steps=10,
        optim="paged_adamw_32bit"
    )

    trainer = SFTTrainer(
        model=model,
        train_dataset=tokenized_dataset,
        args=training_args,
        tokenizer=tokenizer,
        max_seq_length=128,
        dataset_text_field="input"
    )

    model.train()
    trainer.train()

    model.save_pretrained(output_dir)
    print(f"LoRA weights have been saved to {output_dir}")


def apply_lora_weights_to_model(base_model_name, lora_weights_dir):
    """
    Loads the base model and applies the saved LoRA weights.
    """
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=False
    )

    tokenizer = AutoTokenizer.from_pretrained(base_model_name, kwargs={"max_new_tokens": 8096})
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        device_map="auto",
        quantization_config=bnb_config,
        torch_dtype=torch.float16,
    )

    model = PeftModel.from_pretrained(base_model, lora_weights_dir)
    model.eval()
    print(f"LoRA weights from {lora_weights_dir} have been successfully applied to the base model.")

    return model, tokenizer


def main():
    """
    Main function to test fine-tuning and applying LoRA weights.
    """
    # Define custom dataset
    custom_data = [
        {"input": "What is the capital of France?", "output": "The capital of France is Paris.", "feedback": "like"},
        {"input": "Tell me a joke.", "output": "Why don't scientists trust atoms? Because they make up everything!", "feedback": "like"},
        {"input": "What is 2+2?", "output": "2+2 is 5.", "feedback": "dislike"},
    ]

    # Model name and weight directory
    model_name = Config.MODEL_NAME
    lora_weights_dir = "./lora_weights"

    # Step 1: Fine-tune and save LoRA weights
    print("Starting fine-tuning...")
    fine_tune_and_save_lora_weights(
        model_name=model_name,
        data=custom_data,
        output_dir=lora_weights_dir
    )

    # Step 2: Load base model and apply LoRA weights
    print("Applying LoRA weights to base model...")
    model, tokenizer = apply_lora_weights_to_model(
        base_model_name=model_name,
        lora_weights_dir=lora_weights_dir
    )

    # Test the model
    input_text = "What is the capital of Germany?"
    inputs = tokenizer(f"User: {input_text}", return_tensors="pt")
    outputs = model.generate(**inputs)
    print("Generated Response:", tokenizer.decode(outputs[0], skip_special_tokens=True))


if __name__ == "__main__":
    main()
