import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, Trainer, TrainingArguments, DataCollatorForLanguageModeling
from datasets import Dataset
from sqlalchemy.orm import Session
from database import get_db, UserWeights

# Initialize tokenizer and base model
MODEL_NAME = "meta-llama/Llama-3.2-11B-Vision"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)

# Directory for storing user-specific weights
USER_WEIGHTS_DIR = "./user_weights"
if not os.path.exists(USER_WEIGHTS_DIR):
    os.makedirs(USER_WEIGHTS_DIR)

def fine_tune_user_model(user_id, user_model_data, label, db: Session):
    if not user_model_data or label is None:
        print(f"No fine-tuning data provided for user: {user_id}. Skipping.")
        return

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)

    # Prepare the dataset for fine-tuning
    prompts = [f"User: {item['user_input']} Model: {item['model_output']}" for item in user_model_data]
    labels = [label] * len(user_model_data)  # Apply the same label to all prompts

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
    user_weights_path = os.path.join(USER_WEIGHTS_DIR, f"{user_id}")
    model.save_pretrained(user_weights_path)
    tokenizer.save_pretrained(user_weights_path)
    print(f"Weights saved for user: {user_id}")

    # Save the path to the database
    user_entry = db.query(UserWeights).filter(UserWeights.user_id == user_id).first()
    if user_entry:
        user_entry.weight_path = user_weights_path
    else:
        new_entry = UserWeights(user_id=user_id, weight_path=user_weights_path)
        db.add(new_entry)
    db.commit()

def load_user_model(user_id, db: Session):
    user_entry = db.query(UserWeights).filter(UserWeights.user_id == user_id).first()
    if user_entry and user_entry.weight_path and os.path.exists(user_entry.weight_path):
        print(f"Loading model for user: {user_id}")
        user_model = AutoModelForCausalLM.from_pretrained(user_entry.weight_path)
        return user_model
    else:
        print(f"No weights found for user: {user_id}. Using base model.")
        return AutoModelForCausalLM.from_pretrained(MODEL_NAME)

def main():
    user_id = "user123"  # Example user ID
    user_model_data = [
        {"user_input": "What is the capital of France?", "model_output": "The capital of France is Paris."},
        {"user_input": "Explain quantum computing in simple terms.", "model_output": "Quantum computing uses qubits."},
    ]
    label = 1  # Example feedback: 1 = like, 0 = dislike

    # Get a database session
    db = next(get_db())

    # Fine-tune the model based on user feedback
    fine_tune_user_model(user_id, user_model_data, label, db)

    # Load the user-specific model
    user_model = load_user_model(user_id, db)
    user_model.to("cuda" if torch.cuda.is_available() else "cpu")

    # Test generating a response with the user-specific model
    input_prompt = "Describe the benefits of AI in healthcare."
    inputs = tokenizer(input_prompt, return_tensors="pt").to(user_model.device)
    outputs = user_model.generate(inputs["input_ids"], max_length=50)
    print(f"Generated response: {tokenizer.decode(outputs[0], skip_special_tokens=True)}")

if __name__ == "__main__":
    main()
