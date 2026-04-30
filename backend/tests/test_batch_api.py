import json
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import requests

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

@pytest.fixture
def client(monkeypatch):
    # Setup mock app state
    monkeypatch.setenv("API_KEY", "")
    main.MODELS["loaded"] = True
    main.FIRESTORE_STATE["connected"] = True
    main.FIRESTORE_STATE["client"] = MagicMock()
    
    with TestClient(main.app) as c:
        yield c

from unittest.mock import MagicMock

def test_batch_prediction_with_data_json(client):
    """
    Test the /predict/batch endpoint using real samples from data.json.
    Mocks the HF Space inference call.
    """
    # 1. Load data from data.json
    data_path = os.path.join(os.path.dirname(__file__), "..", "data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        full_data = json.load(f)
    
    # Take 5 samples with mixed fields
    samples = full_data[:5]
    
    # 2. Prepare request payload (only required fields)
    batch_payload = {
        "reviews": [
            {
                "review_body": s["review_body"],
                "review_title": s.get("review_title"),
                "product_category": s.get("product_category", "other"),
                "language": s.get("language")
            }
            for s in samples
        ]
    }
    
    # 3. Mock the HF Space response
    mock_hf_predictions = [
        {
            "predicted_stars": s.get("predicted_stars", 3),
            "sentiment": s.get("sentiment", "neutral"),
            "confidence": s.get("confidence", 0.8),
            "model_used": "model_b",
            "resolved_language": s.get("language", "en"),
            "language_was_detected": False
        }
        for s in samples
    ]
    
    with patch("router.engine.requests.post") as mock_post:
        mock_post.return_value = MockResponse(mock_hf_predictions)
        
        # 4. Call the batch endpoint
        response = client.post("/predict/batch", json=batch_payload)
        
        # 5. Assertions
        assert response.status_code == 200
        result = response.json()
        
        assert "predictions" in result
        assert "summary" in result
        assert len(result["predictions"]) == 5
        assert result["summary"]["count"] == 5
        assert "average_stars" in result["summary"]
        assert "sentiment_distribution" in result["summary"]
        
        # Verify first prediction content
        p0 = result["predictions"][0]
        assert p0["predicted_stars"] == samples[0]["predicted_stars"]
        assert p0["sentiment"] == samples[0]["sentiment"]

if __name__ == "__main__":
    # Manual run if not using pytest
    pass
