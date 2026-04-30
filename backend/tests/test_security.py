import pytest
from fastapi.testclient import TestClient
from api import main

def test_api_key_protection_enforced(monkeypatch):
    """Verify that 403 is returned when a wrong key is provided."""
    # Set a required API Key
    monkeypatch.setenv("API_KEY", "secret_test_key")
    main.MODELS["loaded"] = True
    
    with TestClient(main.app) as client:
        # 1. No key -> 403
        response = client.post("/predict", json={})
        assert response.status_code == 403
        
        # 2. Wrong key -> 403
        response = client.post("/predict", json={}, headers={"X-API-Key": "wrong_key"})
        assert response.status_code == 403
        
        # 3. Correct key -> but failing validation (due to empty body)
        # Note: it reaches validation AFTER passing security
        response = client.post("/predict", json={}, headers={"X-API-Key": "secret_test_key"})
        assert response.status_code == 422 # Passed security, failed validation

def test_health_remains_public(monkeypatch):
    """Verify that /health does not require an API key."""
    monkeypatch.setenv("API_KEY", "secret_test_key")
    main.MODELS["loaded"] = True
    
    with TestClient(main.app) as client:
        response = client.get("/health")
        assert response.status_code == 200
