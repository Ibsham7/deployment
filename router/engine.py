import os
import requests

def compute_text_signals(text: str) -> dict:
    """
    Derive script-level signals from the raw review body.
    """
    if not text:
        return {
            "non_ascii_ratio": 0.0,
            "has_cjk": False,
            "has_arabic": False,
            "has_cyrillic": False,
            "is_low_quality": False,
        }

    total = len(text)
    non_ascii = sum(1 for c in text if ord(c) > 127)

    has_cjk = any(
        "\u4e00" <= c <= "\u9fff" or "\u3040" <= c <= "\u30ff"
        for c in text
    )
    has_arabic   = any("\u0600" <= c <= "\u06ff" for c in text)
    has_cyrillic = any("\u0400" <= c <= "\u04ff" for c in text)

    # Quality signals
    words = text.split()
    alpha = [c for c in text if c.isalpha()]
    all_caps = bool(alpha) and (sum(1 for c in alpha if c.isupper()) / len(alpha)) > 0.8
    high_repetition = bool(words) and (max(words.count(w) for w in set(words)) / len(words)) > 0.5
    is_low_quality  = all_caps or high_repetition

    return {
        "non_ascii_ratio": non_ascii / total,
        "has_cjk":         has_cjk,
        "has_arabic":      has_arabic,
        "has_cyrillic":    has_cyrillic,
        "is_low_quality":  is_low_quality,
    }

def preprocess_incoming_review(review_body: str, review_title: str | None = None) -> dict:
    body = str(review_body).strip()
    if review_title is None or str(review_title).strip() == "":
        fallback_title = " ".join(body.split()[:5]) + "..."
        title = fallback_title
    else:
        title = str(review_title).strip()

    model_text = (title + " " + body).strip()
    text_length = len(body.split())

    return {
        "review_body": body,
        "review_title": title,
        "model_text": model_text,
        "text_length": text_length,
    }

def run_inference(review_body: str, language: str | None, product_category: str,
                  models: dict, review_title: str | None = None) -> dict:
    """
    Calls the Hugging Face Space API to run the ML inference.
    """
    hf_space_url = os.getenv("HF_SPACE_URL")
    if not hf_space_url:
        # Fallback to localhost if testing the HF space locally
        hf_space_url = "http://localhost:7860"
        
    payload = {
        "review_body": review_body,
        "review_title": review_title,
        "language": language,
        "product_category": product_category
    }
    
    url = f"{hf_space_url.rstrip('/')}/predict"
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as exc:
        raise ValueError(f"Inference API request failed: {exc}")
