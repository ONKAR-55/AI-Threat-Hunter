import joblib
import json
from llm_reasoner import explain_threat

# Load trained ML components
model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")

with open("features.json", "r") as f:
    features = json.load(f)

# -------------------------------
# Sample network flow (test input)
# -------------------------------
flow_data = {
    "duration": 0.5,
    "src_bytes": 1500,
    "dst_bytes": 3000,
    "packet_count": 70,
    "failed_logins": 7,
    "port_count": 25
}

# Prepare input in correct order
input_vector = [flow_data[f] for f in features]
input_scaled = scaler.transform([input_vector])

# ML prediction
prediction_label = "Normal" if model.predict(input_scaled)[0] == 0 else "Attack"
prediction = prediction_label
confidence = model.predict_proba(input_scaled)[0].max()

# LLM-style explanation
result = explain_threat(flow_data, prediction, confidence)

# -------------------------------
# Final SOC-style output
# -------------------------------
print("\nAI Threat Hunter Result")
print("Prediction :", result["prediction"])
print("Confidence :", result["confidence"])
print("Explanation:", result["explanation"])




# Print MITRE info if exists
if result["mitre"]:
    print("\nMITRE ATT&CK Mapping")
    print("Technique ID   :", result["mitre"]["technique_id"])
    print("Technique Name :", result["mitre"]["technique_name"])
    print("Tactic         :", result["mitre"]["tactic"])
