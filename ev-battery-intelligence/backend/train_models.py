"""
Training pipeline for EV Battery Intelligence using the provided dataset.
Trains:
1. SOH Regressor (GradientBoostingRegressor)
2. Anomaly Classifier / IsolationForest
3. Fault Classification (RandomForestClassifier)
Saves models to backend/models/
"""
import os
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier, IsolationForest
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, classification_report

def train_and_save():
    csv_path = os.path.join(os.path.dirname(__file__), "battery_dataset.csv")
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    df = pd.read_csv(csv_path)
    print(f"Loaded dataset with {len(df)} rows.")

    # Feature Engineering
    # Features aligned with pipeline: [voltage, current, temp, soc, cycle, capacity, resistance, voltage_sag, temp_rise]
    df['temp_rise'] = df['temperature_C'] - df['ambient_temp_C']
    df['voltage_sag'] = np.abs(df['current_A']) * (df['internal_resistance_mOhm'] / 8000.0)

    # 1. Train SOH Regressor
    features_soh = ['voltage_V', 'current_A', 'temperature_C', 'SOC_percent', 'cycle', 
                    'capacity_Ah', 'internal_resistance_mOhm', 'voltage_sag', 'temp_rise']
    X_soh = df[features_soh].values
    y_soh = df['SOH_percent'].values

    X_train_s, X_test_s, y_train_s, y_test_s = train_test_split(X_soh, y_soh, test_size=0.2, random_state=42)
    soh_model = GradientBoostingRegressor(n_estimators=100, max_depth=4, learning_rate=0.08, random_state=42)
    soh_model.fit(X_train_s, y_train_s)

    preds_s = soh_model.predict(X_test_s)
    mae_s = mean_absolute_error(y_test_s, preds_s)
    r2_s = r2_score(y_test_s, preds_s)
    print(f"SOH Model - Test MAE: {mae_s:.3f}%, R2: {r2_s:.4f}")

    # 2. Train Anomaly Detection (Isolation Forest on Normal data)
    normal_df = df[df['anomaly'] == 0]
    X_anom = normal_df[['voltage_V', 'current_A', 'temperature_C', 'internal_resistance_mOhm', 'voltage_sag']].values
    anomaly_model = IsolationForest(contamination=0.08, random_state=42)
    anomaly_model.fit(X_anom)

    # 3. Train Fault Classifier
    # Map anomaly_type to standard classes
    type_map = {
        'Normal': 0,
        'Normal Operating State': 0,
        'Cell Imbalance': 1,
        'High Temperature': 2,
        'High Resistance': 3,
        'Overcurrent': 4,
        'Voltage Deviation': 5,
        'Undervoltage': 5,
        'Self-Discharge': 6,
        'Sensor Anomaly': 7
    }
    df['fault_class_id'] = df['anomaly_type'].map(lambda x: type_map.get(x.strip(), 0))

    # Features for fault classification
    # [Voltage_mean, Current_max, Temperature_max, Resistance_total, Cell_voltage_difference, Voltage_sag, soc]
    df['cell_v_diff'] = np.where(df['fault_class_id'] == 1, 0.18, 0.015)
    X_fault = df[['voltage_V', 'current_A', 'temperature_C', 'internal_resistance_mOhm', 'cell_v_diff', 'voltage_sag', 'SOC_percent']].values
    y_fault = df['fault_class_id'].values

    fault_model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    fault_model.fit(X_fault, y_fault)
    print("Fault Classifier trained successfully on classes:", np.unique(y_fault))

    # Save models
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(models_dir, exist_ok=True)
    joblib.dump(soh_model, os.path.join(models_dir, "soh_model.joblib"))
    joblib.dump(anomaly_model, os.path.join(models_dir, "anomaly_model.joblib"))
    joblib.dump(fault_model, os.path.join(models_dir, "fault_model.joblib"))
    print(f"All models successfully saved to {models_dir}")

if __name__ == "__main__":
    train_and_save()
