"""
ReviewRoute API
---------------
FastAPI service that wraps the three-model inference engine.

Run locally:
    uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

Interactive docs:
    http://localhost:8000/docs      (Swagger UI)
    http://localhost:8000/redoc     (ReDoc)
    http://localhost:8000/openapi.json
"""

import logging
import os
import sys
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
from time import perf_counter
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request, status, Depends, Security
from fastapi.security.api_key import APIKeyHeader

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import requests

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def get_api_key(api_key: str = Security(api_key_header)):
    expected_key = os.getenv("API_KEY")
    # If no API_KEY is set in environment, allow all (for local dev convenience)
    if not expected_key:
        return api_key
    if api_key == expected_key:
        return api_key
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate API Key",
    )

# Ensure project root is on the path so `router` can be imported when the
# module is launched from any working directory.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from router.engine import compute_text_signals, preprocess_incoming_review, run_inference, run_batch_inference  # noqa: E402

from api.firestore_service import (  # noqa: E402
    get_firestore_client,
    get_latest_drift_metrics,
    list_human_review_queue,
    log_inference_and_maybe_enqueue,
    log_batch_inference,
    run_drift_detection,
    submit_human_label,
)

from api.schemas import (  # noqa: E402
    DriftMetricResponse,
    DriftRunResponse,
    ErrorResponse,
    HealthResponse,
    HumanLabelRequest,
    HumanLabelResponse,
    HumanReviewQueueItem,
    PredictionResponse,
    ReviewRequest,
    BatchReviewRequest,
    BatchPredictionResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global model registry populated at startup
# ---------------------------------------------------------------------------
MODELS: dict[str, Any] = {}
FIRESTORE_STATE: dict[str, Any] = {
    "client": None,
    "connected": False,
    "error": None,
}




# ---------------------------------------------------------------------------
# Lifespan: load / unload models
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting API. ML Inference is offloaded to Hugging Face Spaces.")
    
    # Models are technically always "loaded" since they are external
    MODELS["loaded"] = True

    firestore_client, firestore_error = get_firestore_client()
    if firestore_client is not None:
        FIRESTORE_STATE["client"] = firestore_client
        FIRESTORE_STATE["connected"] = True
        FIRESTORE_STATE["error"] = None
        log.info("Firestore connected.")
    else:
        FIRESTORE_STATE["client"] = None
        FIRESTORE_STATE["connected"] = False
        FIRESTORE_STATE["error"] = firestore_error
        if firestore_error:
            log.warning("Firestore unavailable: %s", firestore_error)

    yield

    MODELS.clear()
    FIRESTORE_STATE["client"] = None
    FIRESTORE_STATE["connected"] = False
    FIRESTORE_STATE["error"] = None
    log.info("API shut down.")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ReviewRoute API",
    description=(
        "REST API for the ReviewRoute multi-model star-rating predictor.\n\n"
        "The service routes each review to one of three models:\n"
        "- **Model A** – TF-IDF + Logistic Regression (fast, language-specific variants)\n"
        "- **Model B** – XLM-RoBERTa transformer (multilingual)\n"
        "- **Model C** – Stacking ensemble (selected product categories)\n\n"
        "Confidence-based escalation: if Model A confidence < 0.55, Model B is used automatically."
    ),
    version="1.0.0",
    contact={"name": "ReviewRoute"},
    license_info={"name": "MIT"},
    lifespan=lifespan,
)

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for the demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Return a structured 422 with field-level error details."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get(
    "/health",
    tags=["Health"],
    summary="Service health check",
    description="Returns whether the API is running and all models are loaded.",
)
async def health():
    loaded = MODELS.get("loaded", False)
    firestore_connected = bool(FIRESTORE_STATE.get("connected"))
    firestore_enabled = os.getenv("FIRESTORE_ENABLED", "true").strip().lower() in {
        "1", "true", "yes", "y", "on"
    }

    detail = MODELS.get("load_error") if not loaded else None
    if loaded and firestore_enabled and not firestore_connected:
        detail = FIRESTORE_STATE.get("error") or "Firestore is not connected."

    # Check Hugging Face Space Status
    hf_status = "unknown"
    hf_url = os.getenv("HF_SPACE_URL")
    if hf_url:
        try:
            resp = requests.get(f"{hf_url}/health", timeout=5)
            if resp.status_code == 200:
                hf_status = resp.json().get("status", "unknown")
            else:
                hf_status = f"error_{resp.status_code}"
        except Exception:
            hf_status = "unreachable"

    overall_status = "ok" if (loaded and hf_status == "ok") else "loading"

    return {
        "status": overall_status,
        "models_loaded": loaded,
        "detail": detail,
        "firestore_connected": firestore_connected,
        "hf_status": hf_status
    }


def _require_firestore_client() -> Any:
    client = FIRESTORE_STATE.get("client")
    if client is None or not FIRESTORE_STATE.get("connected"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firestore is not configured or unavailable.",
        )
    return client


@app.post(
    "/predict",
    response_model=PredictionResponse,
    dependencies=[Depends(get_api_key)],
    tags=["Prediction"],
    summary="Predict star rating for a review",
    description=(
        "Submit a review and receive a 1–5 star prediction, a sentiment label, "
        "a confidence score, and information about which model was used."
    ),
    responses={
        200: {"description": "Successful prediction", "model": PredictionResponse},
        422: {"description": "Validation error – check request fields", "model": ErrorResponse},
        503: {"description": "Models not yet loaded", "model": ErrorResponse},
        500: {"description": "Inference error", "model": ErrorResponse},
    },
)
async def predict(review: ReviewRequest) -> PredictionResponse:
    if not MODELS.get("loaded"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Models are not loaded. The service may still be starting up.",
        )

    start_time = perf_counter()

    try:
        result = run_inference(
            review_body=review.review_body,
            language=review.language,
            product_category=review.product_category,
            models=MODELS,
            review_title=review.review_title,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        log.exception("Inference failed for request: %s", review.model_dump())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Inference failed. Please try again.",
        )

    latency_ms = (perf_counter() - start_time) * 1000.0

    result.setdefault("inference_id", None)
    result.setdefault("queued_for_review", False)
    result.setdefault("review_reasons", [])
    result.setdefault("resolved_language", review.language or "en")
    result.setdefault("language_was_detected", review.language is None)

    firestore_client = FIRESTORE_STATE.get("client")
    if firestore_client is not None and FIRESTORE_STATE.get("connected"):
        try:
            prepared = preprocess_incoming_review(review.review_body, review.review_title)
            signals = compute_text_signals(prepared["review_body"])
            review_data_for_storage = review.model_dump()
            review_data_for_storage["language"] = result.get("resolved_language")

            persist_result = log_inference_and_maybe_enqueue(
                client=firestore_client,
                review_data=review_data_for_storage,
                prediction=result,
                text_length=prepared["text_length"],
                non_ascii_ratio=float(signals["non_ascii_ratio"]),
                latency_ms=latency_ms,
            )
            result["inference_id"] = persist_result.get("inference_id")
            result["queued_for_review"] = bool(persist_result.get("queued_for_review", False))
            result["review_reasons"] = persist_result.get("review_reasons", [])
        except Exception as exc:
            log.warning("Failed to persist inference in Firestore: %s", exc)

    return PredictionResponse(**result)


@app.post(
    "/predict/batch",
    response_model=BatchPredictionResponse,
    dependencies=[Depends(get_api_key)],
    tags=["Prediction"],
    summary="Predict star ratings for a batch of reviews",
    description=(
        "Submit multiple reviews and receive predictions for all, "
        "along with summary statistics and batch-optimized storage."
    ),
)
async def predict_batch(request: BatchReviewRequest) -> BatchPredictionResponse:
    if not MODELS.get("loaded"):
        raise HTTPException(status_code=503, detail="Models not loaded")

    start_time = perf_counter()
    
    try:
        # 1. Inference
        batch_inputs = [r.model_dump() for r in request.reviews]
        predictions = run_batch_inference(batch_inputs)
    except Exception as exc:
        log.exception("Batch inference failed")
        raise HTTPException(status_code=500, detail=str(exc))

    latency_ms_total = (perf_counter() - start_time) * 1000.0
    latency_per_item = latency_ms_total / len(request.reviews)

    # 2. Enrich and Log
    enriched_predictions = []
    firestore_data = []
    
    for i, pred in enumerate(predictions):
        orig_req = request.reviews[i]
        
        # Default fields
        pred.setdefault("inference_id", None)
        pred.setdefault("queued_for_review", False)
        pred.setdefault("review_reasons", [])
        pred.setdefault("resolved_language", orig_req.language or "en")
        pred.setdefault("language_was_detected", orig_req.language is None)
        
        enriched_predictions.append(PredictionResponse(**pred))
        
        # Prep for Firestore
        prep = preprocess_incoming_review(orig_req.review_body, orig_req.review_title)
        signals = compute_text_signals(prep["review_body"])
        
        firestore_data.append({
            "review_data": orig_req.model_dump(),
            "prediction": pred,
            "text_length": prep["text_length"],
            "non_ascii_ratio": float(signals["non_ascii_ratio"]),
            "latency_ms": latency_per_item
        })

    # Batch Firestore Write
    client = FIRESTORE_STATE.get("client")
    if client and FIRESTORE_STATE.get("connected"):
        try:
            log_results = log_batch_inference(client, firestore_data)
            for i, log_res in enumerate(log_results):
                enriched_predictions[i].inference_id = log_res.get("inference_id")
                enriched_predictions[i].queued_for_review = log_res.get("queued_for_review", False)
                enriched_predictions[i].review_reasons = log_res.get("review_reasons", [])
        except Exception as exc:
            log.warning("Batch Firestore logging failed: %s", exc)

    # 3. Summary Stats
    stars = [p.predicted_stars for p in enriched_predictions]
    sentiments = [p.sentiment for p in enriched_predictions]
    
    summary = {
        "count": len(stars),
        "average_stars": round(sum(stars) / len(stars), 2) if stars else 0,
        "sentiment_distribution": {
            "positive": sentiments.count("positive"),
            "neutral": sentiments.count("neutral"),
            "negative": sentiments.count("negative")
        },
        "total_latency_ms": round(latency_ms_total, 2)
    }

    return BatchPredictionResponse(
        predictions=enriched_predictions,
        summary=summary
    )


@app.get(
    "/human-review/queue",
    response_model=list[HumanReviewQueueItem],
    dependencies=[Depends(get_api_key)],
    tags=["Human Review"],
    summary="List queued reviews for human verification",
)
async def human_review_queue(
    status_filter: str = Query("pending", alias="status"),
    limit: int = Query(50, ge=1, le=200),
) -> list[HumanReviewQueueItem]:
    client = _require_firestore_client()
    try:
        rows = list_human_review_queue(client=client, status=status_filter, limit=limit)
    except Exception as exc:
        log.exception("Failed to list human review queue")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list review queue: {exc}",
        )

    return [HumanReviewQueueItem(**row) for row in rows]


@app.post(
    "/human-review/{queue_id}/label",
    response_model=HumanLabelResponse,
    dependencies=[Depends(get_api_key)],
    tags=["Human Review"],
    summary="Submit a human label for a queued review",
)
async def label_human_review(queue_id: str, payload: HumanLabelRequest) -> HumanLabelResponse:
    client = _require_firestore_client()
    try:
        row = submit_human_label(
            client=client,
            queue_id=queue_id,
            human_stars=payload.human_stars,
            reviewer_id=payload.reviewer_id,
            notes=payload.notes,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        log.exception("Failed to submit human label")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit human label: {exc}",
        )

    return HumanLabelResponse(**row)


@app.post(
    "/drift/run",
    response_model=DriftRunResponse,
    dependencies=[Depends(get_api_key)],
    tags=["Drift"],
    summary="Run drift detection against Firestore inference logs",
)
async def drift_run(
    lookback_hours: int = Query(24, ge=1, le=168),
    baseline_days: int = Query(30, ge=1, le=365),
    min_samples: int = Query(200, ge=1, le=100000),
) -> DriftRunResponse:
    client = _require_firestore_client()
    try:
        summary = run_drift_detection(
            client=client,
            lookback_hours=lookback_hours,
            baseline_days=baseline_days,
            min_samples=min_samples,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        log.exception("Failed to run drift detection")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Drift detection failed: {exc}",
        )

    return DriftRunResponse(**summary)


@app.get(
    "/drift/latest",
    response_model=list[DriftMetricResponse],
    dependencies=[Depends(get_api_key)],
    tags=["Drift"],
    summary="Get latest persisted drift metrics",
)
async def drift_latest(limit: int = Query(20, ge=1, le=200)) -> list[DriftMetricResponse]:
    client = _require_firestore_client()
    try:
        rows = get_latest_drift_metrics(client=client, limit=limit)
    except Exception as exc:
        log.exception("Failed to read latest drift metrics")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read drift metrics: {exc}",
        )

    return [DriftMetricResponse(**row) for row in rows]
