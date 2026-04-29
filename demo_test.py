"""
Demo script — sends 20 mixed reviews to the API and prints results nicely.
Run: python demo_test.py
"""

import requests

API = "http://localhost:8000"

REVIEWS = [
    {
        "label": "Positive English — Electronics (Model C)",
        "payload": {
            "review_body": "Absolutely incredible machine. The performance is outstanding, battery lasts all day, display is sharp and bright. Keyboard feels premium and the build quality is solid. Best purchase I have made in years.",
            "review_title": "Best laptop I've ever owned",
            "language": "en",
            "product_category": "electronics",
        },
    },
    {
        "label": "Negative English — Kitchen (Model A)",
        "payload": {
            "review_body": "Broke after two days. Cheap plastic, feels like it will break any second. Customer service was useless and refused a refund. Never buying from this brand again absolute rubbish.",
            "review_title": "Broke after two days",
            "language": "en",
            "product_category": "kitchen",
        },
    },
    {
        "label": "Neutral English — Apparel (Model A)",
        "payload": {
            "review_body": "Not bad but not great either. Does what it says on the box I suppose. Nothing special about it. Average quality for the price. Would maybe consider a different brand next time.",
            "review_title": "It is okay",
            "language": "en",
            "product_category": "apparel",
        },
    },
    {
        "label": "French — Auto Language Detection",
        "payload": {
            "review_body": "Produit excellent, livraison rapide et emballage soigne. Je recommande vivement a tous mes amis. Tres satisfait de mon achat je commanderai a nouveau.",
            "review_title": "Tres satisfait",
            "product_category": "apparel",
        },
    },
    {
        "label": "German — Auto Language Detection",
        "payload": {
            "review_body": "Sehr gutes Produkt. Die Qualitat ist hervorragend und der Preis ist mehr als fair. Ich bin sehr zufrieden mit meinem Kauf und wurde es definitiv weiterempfehlen.",
            "product_category": "electronics",
        },
    },
    {
        "label": "Short Review — Escalation to Model B",
        "payload": {
            "review_body": "It was okay I guess not sure",
            "language": "en",
            "product_category": "apparel",
        },
    },
    {
        "label": "Book — Model C Stacking Ensemble",
        "payload": {
            "review_body": "This book was absolutely wonderful. The writing style is engaging and the story kept me hooked until the very last page. One of the best novels I have read in years. Highly recommended to everyone.",
            "review_title": "A masterpiece",
            "language": "en",
            "product_category": "book",
        },
    },
    {
        "label": "Spanish — Auto Language Detection",
        "payload": {
            "review_body": "Producto terrible, llego completamente roto y el servicio al cliente no me ayudo para nada. Una perdida total de dinero, no lo recomiendo a nadie absolutamente.",
            "product_category": "kitchen",
        },
    },
    {
        "label": "Positive English — PC (Model C)",
        "payload": {
            "review_body": "This PC is a beast. Runs every game on ultra settings with no lag whatsoever. Setup was easy and it came well packaged. Absolutely worth every penny spent on it.",
            "review_title": "Incredible performance",
            "language": "en",
            "product_category": "pc",
        },
    },
    {
        "label": "Negative English — Book (Model C)",
        "payload": {
            "review_body": "Terrible book. Boring from the first page and the story goes nowhere. Characters are flat and the writing style is painful to read. I could not finish it. Do not waste your money on this.",
            "review_title": "Complete waste of money",
            "language": "en",
            "product_category": "book",
        },
    },
    {
        "label": "eBook — Digital Purchase (Model C)",
        "payload": {
            "review_body": "Loved this ebook. The content was insightful and well structured. The formatting was clean and easy to read on my tablet device. Finished it in one sitting and learned a great deal.",
            "review_title": "Excellent ebook",
            "language": "en",
            "product_category": "digital_ebook_purchase",
        },
    },
    {
        "label": "French — Negative Review",
        "payload": {
            "review_body": "Produit de tres mauvaise qualite. Il est tombe en panne apres deux jours seulement. Le service client etait completement inutile et n a pas voulu rembourser. Je suis tres decu.",
            "review_title": "Tres decu",
            "language": "fr",
            "product_category": "electronics",
        },
    },
    {
        "label": "Positive English — Sports (Model A)",
        "payload": {
            "review_body": "Fantastic running shoes. The cushioning is excellent and my feet feel great even after long runs. The fit is perfect and the material breathes well. Would highly recommend to any runner.",
            "review_title": "Best running shoes ever",
            "language": "en",
            "product_category": "sports",
        },
    },
    {
        "label": "Ambiguous Review — Low Confidence Flag",
        "payload": {
            "review_body": "I am not really sure what to think about this product honestly",
            "language": "en",
            "product_category": "apparel",
        },
    },
    {
        "label": "German — Negative Review",
        "payload": {
            "review_body": "Sehr schlechtes Produkt. Es ist nach zwei Tagen kaputt gegangen und der Kundendienst war vollig nutzlos. Ich bin sehr enttauscht und wurde es niemandem empfehlen.",
            "language": "de",
            "product_category": "kitchen",
        },
    },
    {
        "label": "Positive English — Home (Model B)",
        "payload": {
            "review_body": "Amazing sofa. The quality is outstanding and it looks exactly like the picture. Delivery was fast and the assembly was straightforward. Very comfortable and great value for money.",
            "review_title": "Love this sofa",
            "language": "en",
            "product_category": "home",
        },
    },
    {
        "label": "Spanish — Positive Review",
        "payload": {
            "review_body": "Producto excelente, calidad increible y envio muy rapido. Estoy muy satisfecho con mi compra y lo recomiendo a todos. Sin duda volvere a comprar en esta tienda.",
            "review_title": "Excelente producto",
            "language": "es",
            "product_category": "apparel",
        },
    },
    {
        "label": "Negative English — Electronics (Model C)",
        "payload": {
            "review_body": "Terrible laptop. The battery dies after one hour and the screen flickers constantly. The keyboard keys started falling off after a week. Worst purchase I have ever made in my life.",
            "review_title": "Avoid at all costs",
            "language": "en",
            "product_category": "electronics",
        },
    },
    {
        "label": "Very Short — Maximum Escalation",
        "payload": {
            "review_body": "Not good at all",
            "language": "en",
            "product_category": "apparel",
        },
    },
    {
        "label": "Positive English — Wireless (Model B)",
        "payload": {
            "review_body": "These wireless headphones are absolutely amazing. The sound quality is crystal clear and the noise cancellation works perfectly. Battery lasts over twenty hours and the comfort is exceptional.",
            "review_title": "Outstanding headphones",
            "language": "en",
            "product_category": "wireless",
        },
    },
]

SENTIMENT_ICON = {"positive": "✅", "neutral": "⚠️", "negative": "❌"}


def stars(n):
    return "★" * n + "☆" * (5 - n)


def run():
    print("\n" + "=" * 65)
    print("  ReviewRoute — Live Demo  (20 Reviews)")
    print("=" * 65)

    try:
        health = requests.get(f"{API}/health", timeout=5).json()
        status = "🟢 Online" if health["models_loaded"] else "🔴 Models not loaded"
        firestore = "🟢 Connected" if health["firestore_connected"] else "🔴 Disconnected"
        print(f"\n  API Status : {status}")
        print(f"  Firestore  : {firestore}")
    except Exception:
        print("  ❌ Cannot reach API — is the backend running?")
        return

    print("=" * 65)

    passed = 0
    failed = 0
    flagged = 0

    for i, test in enumerate(REVIEWS, 1):
        print(f"\n[{i:02d}/20] {test['label']}")
        print("-" * 55)
        try:
            res = requests.post(f"{API}/predict", json=test["payload"], timeout=30)
            if res.status_code == 200:
                d = res.json()
                icon = SENTIMENT_ICON.get(d["sentiment"], "?")
                detected = " (auto-detected)" if d.get("language_was_detected") else ""
                queued = d.get("queued_for_review", False)
                print(f"  Stars      : {stars(d['predicted_stars'])}  ({d['predicted_stars']}/5)")
                print(f"  Sentiment  : {icon} {d['sentiment']}")
                print(f"  Confidence : {round(d['confidence'] * 100)}%")
                print(f"  Model      : {d['model_used']}")
                if d.get("base_model_used"):
                    print(f"  Base Model : {d['base_model_used']}")
                if d.get("resolved_language"):
                    print(f"  Language   : {d['resolved_language']}{detected}")
                if queued:
                    reasons = ", ".join(d.get("review_reasons", []))
                    print(f"  🚩 Flagged : {reasons}")
                    flagged += 1
                passed += 1
            else:
                print(f"  ❌ Error {res.status_code}: {res.text[:100]}")
                failed += 1
        except Exception as e:
            print(f"  ❌ Request failed: {e}")
            failed += 1

    print("\n" + "=" * 65)
    print(f"  ✅ Passed  : {passed}/20")
    print(f"  🚩 Flagged : {flagged} reviews sent to Human Review queue")
    print(f"  ❌ Failed  : {failed}")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    run()
