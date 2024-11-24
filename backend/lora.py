# This example is a very quick showcase of partial fine-tuning the Llama 3.1 8B model
# on the IMDB dataset using QLoRA with bitsandbytes.

# In order to run this example, you'll need to install peft, trl, and bitsandbytes:
# pip install peft trl bitsandbytes

import torch
from datasets import load_dataset

from trl import SFTTrainer
from peft import LoraConfig
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig, TrainingArguments
from config import Config
# from huggingface_hub import login

# model_id = "meta-llama/Meta-Llama-3.1-8B"

# if Config.HUGGINGFACE_ACCESS_TOKEN:
#     login(token=Config.HUGGINGFACE_ACCESS_TOKEN)
# use_auth = bool(Config.HUGGINGFACE_ACCESS_TOKEN)

model_id = Config.MODEL_NAME

tokenizer = AutoTokenizer.from_pretrained(model_id, token=Config.HUGGINGFACE_ACCESS_TOKEN)
tokenizer.add_special_tokens({'pad_token': '[PAD]'})
model = AutoModelForCausalLM.from_pretrained(model_id, token=Config.HUGGINGFACE_ACCESS_TOKEN)

dataset = load_dataset("imdb", split="train")

training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    logging_dir='./logs',
    logging_steps=10,
)

QLoRA = True
if QLoRA:
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_quant_type="nf4"
    )
    
    lora_config = LoraConfig(
        r=8,
        target_modules="all-linear",
        bias="none",
        task_type="CAUSAL_LM",
    )
else:
    lora_config = None

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    args=training_args,
    peft_config=lora_config,
    train_dataset=dataset,
    dataset_text_field="text",
)

trainer.train()
