import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from typing import Union, AsyncGenerator

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_base_model():
    model_name = "meta-llama/Llama-3.2-11B-Vision"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name).to(DEVICE)
    return model, tokenizer


def generate_note(content: str, max_tokens = 5000, temperature = 0.5):
    model, tokenizer = load_base_model()

    input_ids = tokenizer.encode(content, return_tensors="pt").to(DEVICE)
    attention_mask = torch.ones_like(input_ids).to(DEVICE)
    past = None
    
    for _ in range(max_tokens):
        with torch.no_grad():
            outputs = model(input_ids=input_ids, attention_mask=attention_mask, past_key_values=past, use_cache=True)
            logits = outputs.logits[:, -1, :]
    
            scaled_logits = logits / max(temperature, 1e-8)
            probs = torch.softmax(scaled_logits, dim=-1)
            token = torch.multinomial(probs, num_samples=1).squeeze(-1)
            
            token_str = tokenizer.decode(token.item())
            yield token_str

            if token.item() == tokenizer.eos_token_id:
                break
            
            input_ids = token.unsqueeze(0)
            attention_mask = torch.cat([attention_mask, torch.ones_like(input_ids)], dim=-1)
            past = outputs.past_key_values

if __name__ == '__main__':
    output = ""
    for token in generate_note("Who is the PM of canada?"):
        output += token
    print(output)

