from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
from torch import nn
import numpy as np
from collections import deque
import random
import os

class RLModel(nn.Module):
    def __init__(self, base_model_name):
        super().__init__()
        self.tokenizer = AutoTokenizer.from_pretrained(base_model_name)
        self.model = AutoModelForCausalLM.from_pretrained(base_model_name)
        self.memory = deque(maxlen=1000)  # for remembering stuff
        self.gamma = 0.95  # discount idfk
        self.epsilon = 1.0  # how much we explore
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        
    def get_state(self, content, feedback):
        # encode stuff
        inputs = self.tokenizer(f"{content} {feedback}", return_tensors="pt")
        return inputs

    def act(self, state):
        if random.random() <= self.epsilon:
            # yolo mode: random output
            outputs = self.model.generate(
                **state,
                max_length=100,
                num_return_sequences=1,
                do_sample=True,
                temperature=0.7
            )
        else:
            # boring mode: best guess
            outputs = self.model.generate(
                **state,
                max_length=100,
                num_return_sequences=1,
                do_sample=False
            )
        return outputs

    def remember(self, state, action, reward, next_state):
        self.memory.append((state, action, reward, next_state))

    def replay(self, batch_size=32):
        if len(self.memory) < batch_size:
            return
        
        minibatch = random.sample(self.memory, batch_size)
        for state, action, reward, next_state in minibatch:
            target = reward
            if next_state is not None:
                # magic q-learning stuff
                next_outputs = self.model(**next_state)
                target = reward + self.gamma * torch.max(next_outputs.logits)
            
            # make model smarter
            outputs = self.model(**state)
            loss = nn.MSELoss()(outputs.logits, target)
            loss.backward()
            
        # make it explore less over time
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

    def save_state(self, path):
        """save model state and memory"""
        torch.save({
            'model_state': self.model.state_dict(),
            'memory': list(self.memory),
            'epsilon': self.epsilon
        }, path)
    
    def load_state(self, path):
        """load model state and memory"""
        if os.path.exists(path):
            checkpoint = torch.load(path)
            self.model.load_state_dict(checkpoint['model_state'])
            self.memory = deque(checkpoint['memory'], maxlen=1000)
            self.epsilon = checkpoint['epsilon']