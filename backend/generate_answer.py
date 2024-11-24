from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
from config import Config
from typing import AsyncGenerator
from huggingface_hub import login
from lora import fine_tune_and_save_lora_weights, apply_lora_weights_to_model

def load_base_model():
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(Config.mro, token=Config.HUGGINGFACE_ACCESS_TOKEN)
        
    # Load model in 8-bit to reduce memory usage
    base_model = AutoModelForCausalLM.from_pretrained(Config.MODEL_NAME, token=Config.HUGGINGFACE_ACCESS_TOKEN)
        
    return base_model, tokenizer

def load_user_model(user_id):
    model_name = Config.MODEL_NAME
    lora_weights_dir = f"./user_{user_id}/lora_weights"

    model, tokenizer = apply_lora_weights_to_model(
        base_model_name=model_name,
        lora_weights_dir=lora_weights_dir
    )
    return model, tokenizer

def fine_tune_model(user_id, data):
    # data should be an array if dict with input, output, feedback
    model_name = Config.MODEL_NAME
    lora_weights_dir = f"./user_{user_id}/lora_weights"

    fine_tune_and_save_lora_weights(
        model_name=model_name,
        data=data,
        output_dir=lora_weights_dir
    )


def get_device():
    return "cuda" if torch.cuda.is_available() else "cpu"
