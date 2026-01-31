import joblib
import numpy as np
import os
from django.conf import settings

# Load the model only ONCE when Django starts
# (This prevents reloading it for every single request, which is slow)
MODEL_PATH = os.path.join(settings.BASE_DIR, 'api/threat_model.pkl')

try:
    print(f"Loading AI Model from {MODEL_PATH}...")
    model = joblib.load(MODEL_PATH)
    print("AI Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

def analyze_traffic(data):
    """
    Input: A dictionary of network features (e.g., packet size, port)
    Output: True (Threat) or False (Safe)
    """
    if not model:
        return False # Fail safe if model is broken

    # 1. Convert raw data to the format the model expects
    # (Your friend must tell you what order these numbers should be in!)
    features = [
        data.get('packet_size', 0),
        data.get('duration', 0),
        data.get('source_port', 0),
        # ... add other features your friend used for training ...
    ]
    
    # 2. Reshape for the model (1 row, many columns)
    features_array = np.array(features).reshape(1, -1)
    
    # 3. Ask the model to predict
    prediction = model.predict(features_array)
    
    # Assuming 1 = Threat, 0 = Safe
    return prediction[0] == 1 
