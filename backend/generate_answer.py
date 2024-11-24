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

def generate_initial_note(page_content, model, tokenizer):
    inputs = tokenizer(f"Generate notes for the given content: {page_content}", return_tensors="pt")
    outputs = model.generate(**inputs)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

def generate_note(page_content, note_content, model, tokenizer):
    inputs = tokenizer(f"I did not like this note: {note_content}. Generate new notes for the given content: {page_content}", return_tensors="pt")
    outputs = model.generate(**inputs)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

def generate_quiz_review(origin_content, wrong_questions, model, tokenizer):
    inputs = tokenizer(f"I generated note based on this content: {origin_content} and I got these questions wrong: {wrong_questions}. Help me to generate review based on wrong questions", return_tensors="pt")
    outputs = model.generate(**inputs)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)