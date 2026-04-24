from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
from datetime import datetime
import json

app = FastAPI()

class TrainingSample(BaseModel):
    text: str
    label: int
    originalScore: float

class TrainingRequest(BaseModel):
    samples: List[TrainingSample]
    epochs: int = 3
    learningRate: float = 2e-5
    batchSize: int = 8
    validationSplit: float = 0.2
    errorAnalysis: Dict = {}

class SentimentTrainer:
    def __init__(self):
        self.model_name = "camembert-base"
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name,
            num_labels=5
        )
        
    def prepare_dataset(self, samples: List[TrainingSample]):
        texts = [s.text for s in samples]
        labels = [s.label for s in samples]
        
        encodings = self.tokenizer(
            texts,
            truncation=True,
            padding=True,
            max_length=512,
            return_tensors="pt"
        )
        
        return encodings, torch.tensor(labels)
    
    def train(self, samples: List[TrainingSample], epochs: int = 3):
        encodings, labels = self.prepare_dataset(samples)
        
        optimizer = torch.optim.AdamW(self.model.parameters(), lr=2e-5)
        self.model.train()
        
        for epoch in range(epochs):
            total_loss = 0
            outputs = self.model(**encodings, labels=labels)
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()
            total_loss += loss.item()
            
            print(f"Epoch {epoch+1}/{epochs}, Loss: {total_loss:.4f}")
        
        return {"loss": total_loss, "epochs": epochs}
    
trainer = SentimentTrainer()

@app.post("/api/training/retrain")
async def retrain_model(request: TrainingRequest):
    try:
        print(f"📊 Début entraînement avec {len(request.samples)} échantillons")
        print(f"📈 Analyse erreurs: {request.errorAnalysis}")
        
        result = trainer.train(request.samples, request.epochs)
        
        # Sauvegarder le modèle
        trainer.model.save_pretrained("./models/latest")
        trainer.tokenizer.save_pretrained("./models/latest")
        
        return {
            "status": "success",
            "samples_used": len(request.samples),
            "metrics": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/training/samples")
async def receive_samples(data: Dict):
    print(f"📥 Reçu {len(data.get('samples', []))} échantillons")
    # Sauvegarder pour analyse future
    with open("training_samples.json", "a") as f:
        json.dump(data, f)
        f.write("\n")
    return {"status": "received"}

@app.get("/api/training/metrics")
async def get_metrics():
    return {
        "model_loaded": True,
        "last_training": "2024-01-01",
        "samples_count": 0
    }