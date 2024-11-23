from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, Trainer, TrainingArguments
import torch

def tokenize_function(example):
    return tokenizer(example['prompt'], padding="max_length", truncation=True)

def train_and_save_weight():
    dataset = load_dataset("lvwerra/stack-exchange-paired")
    formatted_data = []

    for entry in dataset['train']:
        question = entry['question']
        response_j = entry['response_j']
        response_k = entry['response_k']
        
        formatted_data.append({
            'prompt': question,
            'response_j': response_j,
            'response_k': response_k
        })

    model = "../.llama/checkpoints/Llama3.2-11B-Vision"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name)

    tokenized_data = list(map(tokenize_function, formatted_data))
    training_args = TrainingArguments(
        output_dir="./results",
        evaluation_strategy="epoch",
        learning_rate=2e-5,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        num_train_epochs=3,
        weight_decay=0.01,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_data,
        eval_dataset=tokenized_data,
    )

    trainer.train()
    torch.save(model.state_dict(), 'llama_model_weights.pth')