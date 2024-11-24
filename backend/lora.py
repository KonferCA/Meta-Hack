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

# configure model loading with quantization
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=False
)

# modify tokenizer initialization
tokenizer = AutoTokenizer.from_pretrained(
    model_id, 
    token=Config.HUGGINGFACE_ACCESS_TOKEN,
    padding_side="right",  # explicit padding side
    truncation_side="right"  # explicit truncation side
)
tokenizer.pad_token = tokenizer.eos_token

# modify model loading
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    token=Config.HUGGINGFACE_ACCESS_TOKEN,
    device_map="auto",
    quantization_config=bnb_config,
    torch_dtype=torch.float16,
)
model.config.pad_token_id = tokenizer.pad_token_id
model.config.use_cache = False  # disable cache for training

# modify preprocessing function
def preprocess_function(examples):
    texts = examples["text"] if "text" in examples else examples["review"]
    
    outputs = tokenizer(
        texts,
        truncation=True,
        max_length=128,
        padding="max_length",
        return_tensors=None
    )
    
    input_ids = torch.tensor(outputs["input_ids"])
    embedding_size = model.get_input_embeddings().num_embeddings
    assert input_ids.max() < embedding_size, f"index {input_ids.max()} out of range dum dum! max should be < {embedding_size}"
    
    # ensure labels are properly formatted
    outputs["labels"] = outputs["input_ids"].copy()
    return outputs

# modify dataset loading and preprocessing
dataset = load_dataset("imdb", split="train")
tokenized_dataset = dataset.map(
    preprocess_function,
    batched=True,
    remove_columns=dataset.column_names,
    desc="tokenizing dataset"
)

# Fix 1: Enable input gradients before creating PEFT model
model.enable_input_require_grads()

# modify LoRA config
lora_config = LoraConfig(
    r=8,
    lora_alpha=32,
    target_modules=['q_proj', 'v_proj'],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
    inference_mode=False  # ensure training mode
)

# get peft model
model = get_peft_model(model, lora_config)

# create trainer with training args
training_args = TrainingArguments(
    output_dir="./results",  # add output directory
    num_train_epochs=5,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=16,
    learning_rate=2e-4,
    fp16=True,
    save_total_limit=3,
    logging_dir='./logs',
    logging_steps=10,
    max_steps=100,
    save_steps=50,
    warmup_steps=10,
    optim="paged_adamw_32bit"
)

# create trainer directly without SFTConfig
trainer = SFTTrainer(
    model=model,
    train_dataset=tokenized_dataset,
    args=training_args,
    tokenizer=tokenizer,
    max_seq_length=128,
    dataset_text_field="text"
)

# ensure model is in training mode
model.train()

trainer.train()
