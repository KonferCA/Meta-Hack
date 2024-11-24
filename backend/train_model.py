from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
from config import Config
from huggingface_hub import login
import asyncio

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"API Using Device: {device}")

if Config.HUGGINGFACE_ACCESS_TOKEN:
    login(token=Config.HUGGINGFACE_ACCESS_TOKEN)
use_auth = bool(Config.HUGGINGFACE_ACCESS_TOKEN)

tokenizer = AutoTokenizer.from_pretrained(Config.MODEL_NAME, use_auth_token=use_auth)
model = AutoModelForCausalLM.from_pretrained(Config.MODEL_NAME, use_auth_token=use_auth).to(device)

async def generate_tokens(input_text: str, max_tokens: int, temperature: float) -> AsyncGenerator[str, None]:
    input_ids = tokenizer.encode(input_text, return_tensors="pt").to(device)
    attention_mask = torch.ones_like(input_ids).to(device)
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

async def main():
    input_text = "Who is the Prime Minister of Canada?"
    max_tokens = 50
    temperature = 0.7
    
    response = ""
    
    async for token in generate_tokens(input_text, max_tokens, temperature):
        response += token
        print(token, end="", flush=True)
    
    print("\n\nFinal Response:")
    print(response)

if __name__ == "__main__":
    asyncio.run(main())
