import os
import logging
import torch
from transformers import LlamaForCausalLM
from datasets import Dataset
from sqlalchemy.orm import Session
from database import get_db
from models import User
from sentencepiece import SentencePieceProcessor

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_DIR = os.path.expanduser("~/.llama/checkpoints/Llama3.2-11B-Vision")
MODEL_CHECKPOINT = os.path.join(MODEL_DIR, "consolidated.00.pth")
TOKENIZER_PATH = os.path.join(MODEL_DIR, "tokenizer.model")
PARAMS_FILE = os.path.join(MODEL_DIR, "params.json")

assert os.path.exists(MODEL_CHECKPOINT), f"Model checkpoint not found: {MODEL_CHECKPOINT}"
assert os.path.exists(TOKENIZER_PATH), f"Tokenizer file not found: {TOKENIZER_PATH}"
assert os.path.exists(PARAMS_FILE), f"Params file not found: {PARAMS_FILE}"

class Tokenizer:
    def __init__(self, model_path):
        # Reload tokenizer
        assert os.path.isfile(model_path), model_path
        self.sp_model = SentencePieceProcessor(model_file=model_path)
        logger.info(f"Reloaded SentencePiece model from {model_path}")

        # BOS / EOS token IDs
        self.n_words: int = self.sp_model.vocab_size()
        self.bos_id: int = self.sp_model.bos_id()
        self.eos_id: int = self.sp_model.eos_id()
        self.pad_id: int = self.sp_model.pad_id()
        logger.info(
            f"#words: {self.n_words} - BOS ID: {self.bos_id} - EOS ID: {self.eos_id}"
        )
        assert self.sp_model.vocab_size() == self.sp_model.get_piece_size()

    def encode(self, s, bos=True, eos=True):
        assert type(s) is str
        t = self.sp_model.encode(s)
        if bos:
            t = [self.bos_id] + t
        if eos:
            t = t + [self.eos_id]
        return t

    def decode(self, t):
        return self.sp_model.decode(t)

tokenizer = Tokenizer(model_path=TOKENIZER_PATH)

# Load model
model = LlamaForCausalLM.from_pretrained(
    MODEL_DIR,
    state_dict=torch.load(MODEL_CHECKPOINT),
    config=PARAMS_FILE,
)

USER_WEIGHTS_DIR = "./user_weights"
if not os.path.exists(USER_WEIGHTS_DIR):
    os.makedirs(USER_WEIGHTS_DIR)

def fine_tune_user_model(user_email, user_model_data, label, db: Session):
    if not user_model_data or label is None:
        print(f"No fine-tuning data provided for user: {user_email}. Skipping.")
        return

    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        print(f"User with email {user_email} not found.")
        return

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)

    # Prepare the dataset
    prompts = [f"User: {item['user_input']} Model: {item['model_output']}" for item in user_model_data]
    labels = [label] * len(user_model_data)
    data = {'prompt': prompts, 'label': labels}
    dataset = Dataset.from_dict(data)

    def tokenize_function(example):
        encoded_prompt = tokenizer.encode(example['prompt'], bos=True, eos=True)
        return {"input_ids": encoded_prompt, "labels": encoded_prompt}

    tokenized_dataset = dataset.map(tokenize_function)

    # Fine-tuning logic (simplified)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5)
    model.train()
    for epoch in range(1):  # Single epoch for simplicity
        for item in tokenized_dataset:
            input_ids = torch.tensor(item["input_ids"]).unsqueeze(0).to(device)
            labels = torch.tensor(item["labels"]).unsqueeze(0).to(device)
            outputs = model(input_ids, labels=labels)
            loss = outputs.loss
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        print(f"Epoch {epoch + 1}, Loss: {loss.item()}")

    # Save fine-tuned weights
    user_weights_path = os.path.join(USER_WEIGHTS_DIR, f"{user.id}.pth")
    torch.save(model.state_dict(), user_weights_path)
    print(f"Weights saved for user: {user.email}")

    # Update database
    user.weight_path = user_weights_path
    db.commit()

def load_user_model(user_email, db: Session):
    user = db.query(User).filter(User.email == user_email).first()
    if user and user.weight_path and os.path.exists(user.weight_path):
        print(f"Loading model for user: {user_email}")
        user_model = LlamaForCausalLM.from_pretrained(MODEL_DIR)
        user_model.load_state_dict(torch.load(user.weight_path))
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

    # Get a database session
    db = next(get_db())

    # Fine-tune the model based on user feedback
    fine_tune_user_model(user_email, user_model_data, label, db)

    # Load the user-specific model
    user_model = load_user_model(user_email, db)
    user_model.to("cuda" if torch.cuda.is_available() else "cpu")

    # Test the user-specific model
    input_prompt = "Describe the benefits of AI in healthcare."
    input_ids = torch.tensor([tokenizer.encode(input_prompt, bos=True, eos=True)]).to(user_model.device)
    user_model.eval()
    with torch.no_grad():
        outputs = user_model.generate(input_ids, max_length=50)
        decoded_output = tokenizer.decode(outputs[0].tolist())
        print(f"Generated Response: {decoded_output}")

if __name__ == "__main__":
    main()
