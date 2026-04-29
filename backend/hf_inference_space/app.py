from contextlib import asynccontextmanager
import logging
import os
import joblib
import torch
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from huggingface_hub import snapshot_download

from engine import run_inference

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)

MODELS = {}

# Set this environment variable in your HF Space settings to point to your model repo
# e.g., "username/ReviewRoute-Models"
HF_MODEL_REPO = os.getenv("HF_MODEL_REPO")

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up HF Inference Space...")
    
    base_dir = os.path.dirname(__file__)
    models_dir = os.path.join(base_dir, "models", "saved")
    
    # Download models from HF Model Hub if repository is provided
    if HF_MODEL_REPO:
        log.info(f"Downloading models from {HF_MODEL_REPO}...")
        try:
            # This downloads the models to a local cache and symlinks them
            models_dir = snapshot_download(repo_id=HF_MODEL_REPO)
            log.info(f"Models successfully downloaded to {models_dir}")
        except Exception as exc:
            log.error(f"Failed to download models from {HF_MODEL_REPO}: {exc}")
    else:
        log.info("No HF_MODEL_REPO provided. Looking for models locally...")

    MODEL_A_PATH = os.path.join(models_dir, "model_a.pkl")
    MODEL_A_LANG_PATHS = {
        "de": os.path.join(models_dir, "model_a_de.pkl"),
        "es": os.path.join(models_dir, "model_a_es.pkl"),
        "fr": os.path.join(models_dir, "model_a_fr.pkl"),
    }
    MODEL_B_PATH = os.path.join(models_dir, "model_b")
    MODEL_C_PATH = os.path.join(models_dir, "model_c.pkl")
    MODEL_C_CAT_PATH = os.path.join(models_dir, "model_c_categories.pkl")

    log.info("Loading models into memory...")
    try:
        MODELS["model_a"] = joblib.load(MODEL_A_PATH)
        MODELS["model_a_by_language"] = {"en": MODELS["model_a"]}
        
        for language, model_path in MODEL_A_LANG_PATHS.items():
            if os.path.exists(model_path):
                MODELS["model_a_by_language"][language] = joblib.load(model_path)
                
        MODELS["model_c"] = joblib.load(MODEL_C_PATH)
        MODELS["model_c_categories"] = joblib.load(MODEL_C_CAT_PATH)
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        tokenizer_b = AutoTokenizer.from_pretrained(MODEL_B_PATH)
        model_b = AutoModelForSequenceClassification.from_pretrained(MODEL_B_PATH).to(device)
        model_b.eval()
        
        MODELS["model_b_tokenizer"] = tokenizer_b
        MODELS["model_b"] = model_b
        MODELS["loaded"] = True
        log.info("All models loaded successfully.")
    except Exception as exc:
        MODELS["loaded"] = False
        log.error("Model loading failed: %s", exc)

    yield
    MODELS.clear()

app = FastAPI(title="ReviewRoute Inference Engine", lifespan=lifespan)

class InferenceRequest(BaseModel):
    review_body: str
    review_title: str | None = None
    language: str | None = None
    product_category: str = "other"

@app.get("/health")
def health():
    return {"status": "ok" if MODELS.get("loaded") else "loading"}

@app.post("/predict")
def predict(req: InferenceRequest):
    if not MODELS.get("loaded"):
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    try:
        result = run_inference(
            review_body=req.review_body,
            language=req.language,
            product_category=req.product_category,
            models=MODELS,
            review_title=req.review_title,
        )
        return result
    except Exception as exc:
        log.exception("Inference error")
        raise HTTPException(status_code=500, detail=str(exc))
