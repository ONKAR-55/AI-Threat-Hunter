import pandas as pd
import joblib
import json
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report

# 1. Load Dataset
print("Loading dataset...")
df = pd.read_csv("dataset.csv")

# 2. Preprocess Data
# Encode Label: Normal -> 0, Attack -> 1
df['label'] = df['label'].apply(lambda x: 0 if x == "Normal" else 1)

# Define Features and Target
feature_columns = ["duration", "src_bytes", "dst_bytes", "packet_count", "failed_logins", "port_count"]
X = df[feature_columns]
y = df['label']

# Split Data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Scale Features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 3. Train Model
print("Training RandomForest Classifier...")
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train_scaled, y_train)

# 4. Evaluate
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy: {accuracy * 100:.2f}%")
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# 5. Save Artifacts
print("Saving artifacts...")
joblib.dump(model, "ml_service/model.pkl")
joblib.dump(scaler, "ml_service/scaler.pkl")

# Save feature names for inference
with open("ml_service/features.json", "w") as f:
    json.dump(feature_columns, f)

print("Training Complete. Artifacts saved in 'ml_service/'")
