"""
app.py  —  F1 ML Prediction Microservice
──────────────────────────────────────────
Flask API that wraps the trained ML model.
Called by the Node.js backend as an internal microservice.

Endpoints:
  GET  /health
       → {"status": "ok", "model_loaded": true}

  POST /predict
       Body: {
         "circuit_id":  "monza",
         "year":        2026,
         "round":       16,          ← optional
         "qualifying":  {            ← optional: pre-supplied grid
           "verstappen": 1,
           "leclerc":    2
         }
       }
       → { circuit_id, year, round, model, generated_at, predictions: [...] }

  GET  /model-info
       → Training metadata + evaluation metrics from report
"""

import os
import json
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS

from predict import predict_race, load_model

app = Flask(__name__)
CORS(app)  # allow Node.js backend on same host to call this

MODEL_DIR   = os.path.join(os.path.dirname(__file__), "model")
REPORT_PATH = os.path.join(MODEL_DIR, "evaluation_report.json")

# Pre-warm model on startup
try:
    load_model()
    _model_loaded = True
    print("[ML Service] Model loaded successfully.")
except Exception as e:
    _model_loaded = False
    print(f"[ML Service] WARNING: Model not loaded — {e}")
    print("[ML Service] Run train_model.py to generate the model.")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_loaded": _model_loaded})


@app.route("/predict", methods=["POST"])
def predict():
    if not _model_loaded:
        return jsonify({
            "error": "ML model not loaded. Run train_model.py first.",
            "model_loaded": False,
        }), 503

    body = request.get_json(silent=True) or {}
    circuit_id  = body.get("circuit_id")
    year        = int(body.get("year", 2026))
    round_num   = body.get("round")          # may be None
    quali_grid  = body.get("qualifying", {}) # optional {driver_id: position}

    pred_type   = body.get("type", "race")   # 'race' or 'qualifying'

    if not circuit_id:
        return jsonify({"error": "circuit_id is required"}), 400

    if round_num is not None:
        round_num = int(round_num)

    try:
        result = predict_race(
            circuit_id=circuit_id,
            year=year,
            round_num=round_num,
            qualifying_grid=quali_grid,
            prediction_type=pred_type,
            verbose=False,
        )
        return jsonify(result)
    except FileNotFoundError as e:
        return jsonify({"error": str(e), "hint": "Run train_model.py first"}), 503
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500


@app.route("/model-info", methods=["GET"])
def model_info():
    if not os.path.exists(REPORT_PATH):
        return jsonify({"error": "Evaluation report not found. Run train_model.py."}), 404
    with open(REPORT_PATH) as f:
        report = json.load(f)
    return jsonify(report)


if __name__ == "__main__":
    # Render injects $PORT; ML_PORT is a fallback for local/Docker use
    port = int(os.environ.get("PORT", os.environ.get("ML_PORT", 5001)))
    print(f"[ML Service] Starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
