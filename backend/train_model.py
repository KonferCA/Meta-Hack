import os
import torch
from transformers import LlamaForCausalLM, LlamaTokenizer
from datasets import Dataset
from sqlalchemy.orm import Session
from database import get_db
from models import User

MODEL_DIR = os.path.expanduser("~/.llama/checkpoints/Llama3.2-11B-Vision")
MODEL_CHECKPOINT = os.path.join(MODEL_DIR, "consolidated.00.pth")
TOKENIZER_PATH = os.path.join(MODEL_DIR, "tokenizer.model")
PARAMS_FILE = os.path.join(MODEL_DIR, "params.json")

assert os.path.exists(MODEL_CHECKPOINT), f"Model checkpoint not found: {MODEL_CHECKPOINT}"
assert os.path.exists(TOKENIZER_PATH), f"Tokenizer file not found: {TOKENIZER_PATH}"
assert os.path.exists(PARAMS_FILE), f"Params file not found: {PARAMS_FILE}"

tokenizer = LlamaTokenizer(TOKENIZER_PATH)
model = LlamaForCausalLM.from_pretrained(
    MODEL_DIR,
    state_dict=torch.load(MODEL_CHECKPOINT),
    config=PARAMS_FILE
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

    prompts = [f"User: {item['user_input']} Model: {item['model_output']}" for item in user_model_data]
    labels = [label] * len(user_model_data)
    data = {'prompt': prompts, 'label': labels}
    dataset = Dataset.from_dict(data)

    def tokenize_function(example):
        tokenized = tokenizer(example['prompt'], padding="max_length", truncation=True, max_length=512)
        tokenized['labels'] = example['label']
        return tokenized

    tokenized_dataset = dataset.map(tokenize_function, batched=True)

    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    # Training arguments
    training_args = TrainingArguments(
        output_dir="./temp_results",
        evaluation_strategy="no",
        learning_rate=2e-5,
        per_device_train_batch_size=1,
        num_train_epochs=1,
        save_strategy="no",
        logging_dir='./logs',
        logging_steps=10,
        fp16=True if torch.cuda.is_available() else False,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator,
    )

    # Fine-tune the model
    trainer.train()

    # Save the fine-tuned weights for the specific user
    user_weights_path = os.path.join(USER_WEIGHTS_DIR, f"{user.id}")
    model.save_pretrained(user_weights_path)
    tokenizer.save_pretrained(user_weights_path)
    print(f"Weights saved for user: {user.email}")

    # Save the path to the database
    user.weight_path = user_weights_path
    db.commit()

def load_user_model(user_email, db: Session):
    user = db.query(User).filter(User.email == user_email).first()
    if user and user.weight_path and os.path.exists(user.weight_path):
        print(f"Loading model for user: {user_email}")
        user_model = LlamaForCausalLM.from_pretrained(user.weight_path)
        return user_model
    else:
        print(f"No weights found for user: {user_email}. Using base model.")
        return model  # Use the base model loaded earlier

def main():
    user_email = "user123@example.com"  # Example user email
    user_model_data = [
        {"user_input": "What is the capital of France?", "model_output": "The capital of France is Paris."},
        {"user_input": "Explain quantum computing in simple terms.", "model_output": "Quantum computing uses qubits."},
    ]
    label = 1  # Example feedback: 1 = like, 0 = dislike

    # Get a database session
    db = next(get_db())

    # Fine-tune the model based on user feedback
    fine_tune_user_model(user_email, user_model_data, label, db)

    # Load the user-specific model
    user_model = load_user_model(user_email, db)
    user_model.to("cuda" if torch.cuda.is_available() else "cpu")

    # Test generating a response with the user-specific model
    input_prompt = "Describe the benefits of AI in healthcare."
    inputs = tokenizer(input_prompt, return_tensors="pt").to(user_model.device)
    outputs = user_model.generate(inputs["input_ids"], max_length=50)
    print(f"Generated response: {tokenizer.decode(outputs[0], skip_special_tokens=True)}")

if __name__ == "__main__":
    main()
