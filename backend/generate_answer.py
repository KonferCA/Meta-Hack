from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
from config import Config
from typing import AsyncGenerator
from huggingface_hub import login
from lora import fine_tune_and_save_lora_weights, apply_lora_weights_to_model
from rl_model import RLModel
import os
from groq import Groq

def load_base_model():
    # check if using groq
    if hasattr(Config, 'USE_GROQ') and Config.USE_GROQ:
        # initialize groq client
        client = Groq(api_key=Config.GROQ_API_KEY)
        return client, None
    
    # fallback to original huggingface implementation
    device = "cuda" if torch.cuda.is_available() else "cpu"
    tokenizer = AutoTokenizer.from_pretrained(Config.MODEL_NAME, 
        token=Config.HUGGINGFACE_ACCESS_TOKEN, 
        max_new_tokens=300)
    
    base_model = AutoModelForCausalLM.from_pretrained(Config.MODEL_NAME, 
        token=Config.HUGGINGFACE_ACCESS_TOKEN).to(device)
    
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
    device = "cuda" if torch.cuda.is_available() else "cpu"
    inputs = tokenizer(f"Generate notes for the given content: {page_content}\n\nDo not include the original content in your answer.", return_tensors="pt").to(device)
    outputs = model.generate(
        **inputs,
        max_length=2048,
        pad_token_id=tokenizer.eos_token_id,
        num_return_sequences=1,
        temperature=0.7
    )
    final_output = ""
    for output in outputs:
        final_output += tokenizer.decode(output, skip_special_tokens=True)
    return final_output

def generate_note(page_content, note_content, model, tokenizer):
    # get device and ensure model is on it
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    
    if isinstance(model, RLModel):
        state = model.get_state(page_content, note_content)
        outputs = model.act(state)
        return tokenizer.decode(outputs[0], skip_special_tokens=True)
    else:
        # fallback to original implementation
        inputs = tokenizer(f"I did not like this note: {note_content}. Generate new notes for the given content: {page_content}", return_tensors="pt")
        # move inputs to same device as model
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        outputs = model.generate(
            **inputs,
            max_length=2048,
            num_return_sequences=1,
            pad_token_id=tokenizer.eos_token_id,
            temperature=0.7,
        )
        return tokenizer.decode(outputs[0], skip_special_tokens=True)

def generate_quiz_review(origin_content, wrong_questions, student_history):
    rl_model = RLModel(Config.MODEL_NAME)
    
    # create state from content and wrong questions
    state = rl_model.get_state(
        content=origin_content,
        feedback=f"Previous wrong questions: {wrong_questions}\nStudent history: {student_history}"
    )
    
    # generate review using rl policy
    review_tokens = rl_model.act(state)
    review = rl_model.tokenizer.decode(review_tokens[0], skip_special_tokens=True)
    
    return {
        "review": review,
        "state": state,
        "action": review_tokens
    }
