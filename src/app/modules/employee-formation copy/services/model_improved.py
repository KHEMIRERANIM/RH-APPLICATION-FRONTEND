# model_improved.py
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import re

class ImprovedSentimentModel:
    def __init__(self):
        # Modèle CamemBERT pré-entraîné pour le français
        self.model_name = "camembert-base"
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            "bhadresh-savani/camembert-base-french-sentiment",
            num_labels=5  # 5 classes: très négatif à très positif
        )
        
    def analyze(self, text: str):
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        outputs = self.model(**inputs)
        scores = torch.softmax(outputs.logits, dim=1)
        
        return {
            'sentimentScore': float(scores[0][2] * 2 - 1),  # Convert to -1..1
            'emotions': {
                'positive': float(scores[0][3] + scores[0][4]),
                'neutral': float(scores[0][2]),
                'negative': float(scores[0][0] + scores[0][1])
            },
            'confidence': float(torch.max(scores))
        }