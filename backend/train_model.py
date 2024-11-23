import os
import logging
import torch
import json
from transformers import AutoTokenizer, LlamaForCausalLM
from trl import PPOConfig, PPOTrainer
import sentencepiece as spm
from sqlalchemy.orm import Session
from database import get_db
from models import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_DIR = os.path.expanduser("~/.llama/checkpoints/Llama3.2-11B-Vision")
MODEL_CHECKPOINT = os.path.join(MODEL_DIR, "consolidated.00.pth")
PARAMS_FILE = os.path.join(MODEL_DIR, "params.json")

USER_WEIGHTS_DIR = "./user_weights"
if not os.path.exists(USER_WEIGHTS_DIR):
    os.makedirs(USER_WEIGHTS_DIR)

assert os.path.exists(MODEL_CHECKPOINT), f"Model checkpoint not found: {MODEL_CHECKPOINT}"
assert os.path.exists(PARAMS_FILE), f"Params file not found: {PARAMS_FILE}"

sp = spm.SentencePieceProcessor()
sp.load(os.path.join(MODEL_DIR, "tokenizer.model"))


class CustomTokenizer:
    def __init__(self, sp_processor):
        self.sp = sp_processor
        self.pad_token_id = self.sp.pad_id()
        self.eos_token_id = self.sp.eos_id()
        self.vocab_size = self.sp.vocab_size()

    def encode(self, text, add_special_tokens=True, return_tensors=None):
        ids = self.sp.encode(text)

        if return_tensors == "pt":
            return torch.tensor([ids])
        
        return ids

    def decode(self, ids, skip_special_tokens=True):
        if isinstance(ids, torch.Tensor):
            ids = ids.tolist()
        if isinstance(ids, list) and isinstance(ids[0], list):
            return [self.sp.decode(seq) for seq in ids]

        return self.sp.decode(ids)
    
    def batch_encode_plus(self, texts, padding=True, truncation=True, max_length=None, return_tensors="pt"):
        batch_ids = [self.sp.encode(text) for text in texts]
        
        if padding:
            max_len = max(len(ids) for ids in batch_ids)
            batch_ids = [ids + [self.pad_token_id] * (max_len - len(ids)) for ids in batch_ids]
        if return_tensors == "pt":
            return {"input_ids": torch.tensor(batch_ids)}
        
        return {"input_ids": batch_ids}


class RLTrainer:
    def __init__(self):
        self.tokenizer = CustomTokenizer(sp)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        self.model = LlamaForCausalLM.from_pretrained(
            MODEL_DIR,
            state_dict=torch.load(MODEL_CHECKPOINT),
            config=json.load(open(PARAMS_FILE))
        ).to(self.device)
        
        self.ppo_config = PPOConfig(
            learning_rate=1e-5,
            batch_size=1,
            mini_batch_size=1,
            gradient_accumulation_steps=1,
            optimize_cuda_cache=True,
            target_kl=0.1
        )

        self.user_weights_dir = "./user_weights"
        if not os.path.exists(self.user_weights_dir):
            os.makedirs(self.user_weights_dir)

    def _prepare_training_data(self, user_model_data, label):
        prepared_data = []
        for item in user_model_data:
            prepared_data.append({
                "prompt": item["user_input"],
                "response": item["model_output"],
                "reward": 1.0 if label == 1 else -1.0
            })
        return prepared_data

    def fine_tune_user_model(self, user_email, user_model_data, label, db: Session):
        if not user_model_data or label is None:
            print(f"No fine-tuning data provided for user: {user_email}. Skipping.")
            return

        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            print(f"User with email {user_email} not found.")
            return

        training_data = self._prepare_training_data(user_model_data, label)

        ppo_trainer = PPOTrainer(
            config=self.ppo_config,
            model=self.model,
            tokenizer=self.tokenizer,
        )

        for item in training_data:
            query_tensor = self.tokenizer.encode(item["prompt"], return_tensors="pt").to(self.device)
            response_tensor = self.tokenizer.encode(item["response"], return_tensors="pt").to(self.device)
            reward_tensor = torch.tensor([item["reward"]]).to(self.device)

            ppo_trainer.step(
                queries=query_tensor,
                responses=response_tensor,
                rewards=reward_tensor
            )

        user_weights_path = os.path.join(self.user_weights_dir, f"{user.id}.pth")
        torch.save(self.model.state_dict(), user_weights_path)
        
        user.weight_path = user_weights_path
        db.commit()
        
        print(f"Model fine-tuned and saved for user: {user.email}")
        return user_weights_path

    def load_user_model(self, user_email, db: Session):
        user = db.query(User).filter(User.email == user_email).first()
        if user and user.weight_path and os.path.exists(user.weight_path):
            print(f"Loading model for user: {user_email}")
            user_model = LlamaForCausalLM.from_pretrained(user.weight_path)
            user_model.load_state_dict(torch.load(user.weight_path))
            return user_model.to(self.device)
        else:
            print(f"No weights found for user: {user_email}. Using base model.")
            return self.model

    def generate_response(self, prompt, user_model):
        input_ids = self.tokenizer.encode(prompt, return_tensors="pt").to(self.device)
        
        outputs = user_model.generate(
            input_ids,
            max_length=512,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            pad_token_id=self.tokenizer.pad_token_id,
            eos_token_id=self.tokenizer.eos_token_id
        )
        
        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)


def main():
    user_email = "user123@example.com"
    user_model_data = [
        {"user_input": "What is the capital of France?", "model_output": "The capital of France is Paris."},
        {"user_input": "Explain quantum computing in simple terms.", "model_output": "Quantum computing uses qubits."},
    ]
    label = 1  

    db = next(get_db())

    trainer = RLTrainer()

    trainer.fine_tune_user_model(user_email, user_model_data, label, db)

    user_model = trainer.load_user_model(user_email, db)

    input_prompt = "Describe the benefits of AI in healthcare."
    response = trainer.generate_response(input_prompt, user_model)
    print(f"Generated response: {response}")


if __name__ == "__main__":
    main()
