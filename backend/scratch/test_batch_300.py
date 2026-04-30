import json
import os
import time
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import requests

# Add current dir to path to import api
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import main

# Mock Response for internal requests.post calls
class MockResponse:
    def __init__(self, json_data, status_code=200):
        self.json_data = json_data
        self.status_code = status_code
    def json(self):
        return self.json_data
    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.exceptions.HTTPError(f"Error {self.status_code}")

def run_300_batch_test():
    print("Starting Batch Inference Test (300 reviews)...")
    
    # 1. Load data
    data_path = os.path.join(os.path.dirname(__file__), "..", "data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        full_data = json.load(f)
    
    samples = full_data[:300]
    print(f"Loaded {len(samples)} reviews from data.json")
    
    # 2. Setup App State
    main.MODELS["loaded"] = True
    main.FIRESTORE_STATE["connected"] = True
    main.FIRESTORE_STATE["client"] = MagicMock() # Mock Firestore to avoid real DB writes
    
    client = TestClient(main.app)
    
    # 3. Prepare Payload
    batch_payload = {
        "reviews": [
            {
                "review_body": s["review_body"],
                "review_title": s.get("review_title"),
                "product_category": s.get("product_category", "electronics"),
                "language": s.get("language")
            }
            for s in samples
        ]
    }
    
    # 4. Mock the HF Space Response
    # We generate mock predictions for all 300 items
    mock_hf_predictions = [
        {
            "predicted_stars": s.get("predicted_stars", 5),
            "sentiment": s.get("sentiment", "positive"),
            "confidence": s.get("confidence", 0.95),
            "model_used": "model_b",
            "resolved_language": s.get("language", "en"),
            "language_was_detected": False
        }
        for s in samples
    ]
    
    start_time = time.perf_counter()
    
    with patch("router.engine.requests.post") as mock_post:
        mock_post.return_value = MockResponse(mock_hf_predictions)
        
        print("Sending batch request to /predict/batch...")
        response = client.post("/predict/batch", json=batch_payload)
        
        duration = time.perf_counter() - start_time
        
        if response.status_code == 200:
            result = response.json()
            summary = result["summary"]
            print("\nBatch Test Successful!")
            print(f"Total Time: {duration:.2f} seconds")
            print(f"Summary Stats:")
            print(f"   - Total Processed: {summary['count']}")
            print(f"   - Average Stars: {summary['average_stars']}")
            print(f"   - Sentiment Distribution: {summary['sentiment_distribution']}")
            print(f"   - Internal Total Latency: {summary['total_latency_ms']:.2f}ms")
            
            # Verify one result
            print(f"\nSample Prediction [0]:")
            print(f"   - Body: {samples[0]['review_body'][:60]}...")
            print(f"   - Stars: {result['predictions'][0]['predicted_stars']}")
        else:
            print(f"Batch Test Failed with status {response.status_code}")
            print(response.text)

if __name__ == "__main__":
    run_300_batch_test()
