import pandas as pd
import json
import os
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score

TARGETS = [
    "y_hyper_24",
    "y_hyper_72",
    "y_hypo_12",
    "y_hypo_24",
    "y_tir_drop_24",
    "y_tir_drop_72",
    "y_instability_24",
    "y_instability_72"
]

# The level 2 model feature structure exactly as requested
FEATURES = [
    "delta_glucose_cv",
    "delta_TAR",
    "delta_TBR",
    "pci",
    "glucose_trend_7d",
    "delta_sleep",
    "delta_stress"
]

def train_models():
    if not os.path.exists("ml/data/synthetic.csv"):
        print("Dataset not found. Run generate_synthetic.py first.")
        return

    df = pd.read_csv("ml/data/synthetic.csv")
    
    X = df[FEATURES]
    
    os.makedirs("ml/models", exist_ok=True)

    for target in TARGETS:
        y = df[target]
        
        # Scaling
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Modeling
        model = LogisticRegression(max_iter=1000)
        model.fit(X_scaled, y)
        
        # Eval
        preds = model.predict_proba(X_scaled)[:, 1]
        auc = roc_auc_score(y, preds)
        print(f"Target: {target} | AUC: {auc:.4f}")
        
        # Export
        export_data = {
            "feature_names": FEATURES,
            "scaler_mean": scaler.mean_.tolist(),
            "scaler_scale": scaler.scale_.tolist(),
            "coef": model.coef_[0].tolist(),
            "intercept": model.intercept_[0]
        }
        
        with open(f"ml/models/{target}.json", "w") as f:
            json.dump(export_data, f, indent=2)

if __name__ == "__main__":
    train_models()
