import os
import logging
import torch
from sentencepiece import SentencePieceProcessor
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_DIR = os.path.expanduser("~/.llama/checkpoints/Llama3.2-11B-Vision")
MODEL_CHECKPOINT = os.path.join(MODEL_DIR, "consolidated.00.pth")
TOKENIZER_PATH = os.path.join(MODEL_DIR, "tokenizer.model")
PARAMS_FILE = os.path.join(MODEL_DIR, "params.json")

USER_WEIGHTS_DIR = "./user_weights"
if not os.path.exists(USER_WEIGHTS_DIR):
    os.makedirs(USER_WEIGHTS_DIR)

assert os.path.exists(MODEL_CHECKPOINT), f"Model checkpoint not found: {MODEL_CHECKPOINT}"
assert os.path.exists(TOKENIZER_PATH), f"Tokenizer file not found: {TOKENIZER_PATH}"
assert os.path.exists(PARAMS_FILE), f"Params file not found: {PARAMS_FILE}"

with open(PARAMS_FILE, "r") as f:
    config = json.load(f)

tokenizer = SentencePieceProcessor(model_file=TOKENIZER_PATH)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
state_dict = torch.load(MODEL_CHECKPOINT, map_location=device)

class LlamaForCausalLM(torch.nn.Module):
    def __init__(self, config):
        super().__init__()
        self.config = config
        self.model = torch.nn.Linear(config["hidden_size"], config["vocab_size"])

    def forward(self, input_ids, labels=None):
        logits = self.model(input_ids)
        loss = None
        if labels is not None:
            loss = torch.nn.functional.cross_entropy(logits, labels)
        return {"loss": loss, "logits": logits}

    def generate(self, input_ids, max_length=50):
        return input_ids

model = LlamaForCausalLM(config)
model.load_state_dict(state_dict)
model.to(device)

def fine_tune_user_model(user_email, user_model_data, label, db):
    if not user_model_data or label is None:
        print(f"No fine-tuning data provided for user: {user_email}. Skipping.")
        return

    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        print(f"User with email {user_email} not found.")
        return

    model.train()

    prompts = [f"User: {item['user_input']} Model: {item['model_output']}" for item in user_model_data]
    labels = [label] * len(user_model_data)
    data = {'prompt': prompts, 'label': labels}

    def tokenize_function(example):
        encoded_prompt = tokenizer.encode(example['prompt'], out_type=int)
        return {"input_ids": encoded_prompt, "labels": encoded_prompt}

    tokenized_dataset = [tokenize_function({'prompt': p}) for p in prompts]

    # Fine-tuning logic (simplified)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5)
    for epoch in range(1):  # Single epoch for simplicity
        for item in tokenized_dataset:
            input_ids = torch.tensor(item["input_ids"]).unsqueeze(0).to(device)
            labels = torch.tensor(item["labels"]).unsqueeze(0).to(device)
            outputs = model(input_ids, labels=labels)
            loss = outputs["loss"]
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        print(f"Epoch {epoch + 1}, Loss: {loss.item()}")

    user_weights_path = os.path.join(USER_WEIGHTS_DIR, f"{user.id}.pth")
    torch.save(model.state_dict(), user_weights_path)
    print(f"Weights saved for user: {user.email}")

    user.weight_path = user_weights_path
    db.commit()

def load_user_model(user_email, db):
    user = db.query(User).filter(User.email == user_email).first()
    if user and user.weight_path and os.path.exists(user.weight_path):
        print(f"Loading model for user: {user_email}")
        user_model = LlamaForCausalLM(config)
        user_model.load_state_dict(torch.load(user.weight_path))
        user_model.to(device)
        return user_model
    else:
        print(f"No weights found for user: {user_email}. Using base model.")
        return model

def main():
    user_email = "user123@example.com"
    user_model_data = [
        {"user_input": "What is the capital of France?", "model_output": "The capital of France is Paris."},
        {"user_input": "Explain quantum computing in simple terms.", "model_output": "Quantum computing uses qubits."},
    ]
    label = 1

    db = next(get_db())

    fine_tune_user_model(user_email, user_model_data, label, db)

    user_model = load_user_model(user_email, db)
    user_model.to(device)

    user_model.eval()
    input_prompt = "Describe the benefits of AI in healthcare."
    input_ids = tokenizer.encode(input_prompt, out_type=int)
    input_tensor = torch.tensor(input_ids).unsqueeze(0).to(device)
    outputs = user_model.generate(input_tensor, max_length=50)
    decoded_output = tokenizer.decode(outputs[0].tolist())
    print(f"Generated Response: {decoded_output}")

if __name__ == "__main__":
    main()
