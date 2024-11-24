# This example is a very quick showcase of partial fine-tuning the Llama 3.1 8B model
# on the IMDB dataset using QLoRA with bitsandbytes.

# In order to run this example, you'll need to install peft, trl, and bitsandbytes:
# pip install peft trl bitsandbytes

import torch
from datasets import load_dataset
from transformers import MllamaForConditionalGeneration, AutoProcessor, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer
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
model = AutoModelForCausalLM.from_pretrained(model_id, token=Config.HUGGINGFACE_ACCESS_TOKEN, device_map="auto")
# model = MllamaForConditionalGeneration.from_pretrained(
#         model_id,
#         torch_dtype=torch.bfloat16,
#         device_map="auto"
# )

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
    lora_config = LoraConfig(
        r=8,
        lora_alpha=8,
        lora_dropout=0.1,
        target_modules=['down_proj','o_proj','k_proj','q_proj','gate_proj','up_proj','v_proj'],
        use_dora=True, # optional DoRA 
        init_lora_weights="gaussian"
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
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
