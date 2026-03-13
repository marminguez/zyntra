import os
import random
import numpy as np
import pandas as pd

def clamp(val, min_val, max_val):
    return max(min_val, min(val, max_val))

def compute_pci_components(delta_hrv, delta_sleep, delta_stress, delta_resting_hr, delta_temp):
    c1 = clamp(-delta_hrv, -1.0, 1.0)
    c2 = clamp(-delta_sleep, -1.0, 1.0)
    c3 = clamp(delta_stress, -1.0, 1.0)
    c4 = clamp(delta_resting_hr, -1.0, 1.0)
    c5 = clamp(delta_temp, -1.0, 1.0)
    return c1, c2, c3, c4, c5

def compute_pci(delta_hrv, delta_sleep, delta_stress, delta_resting_hr, delta_temp):
    c1, c2, c3, c4, c5 = compute_pci_components(delta_hrv, delta_sleep, delta_stress, delta_resting_hr, delta_temp)
    pci_raw = 0.3 * c1 + 0.2 * c2 + 0.2 * c3 + 0.15 * c4 + 0.15 * c5
    pci = 1.0 / (1.0 + np.exp(-pci_raw))
    return pci

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))

def generate_data(num_rows=10000):
    np.random.seed(42)
    random.seed(42)

    # Base signals (baseline & current)
    hrv_base = np.random.normal(50, 15, num_rows)
    hrv_curr = hrv_base + np.random.normal(0, 10, num_rows)

    sleep_base = np.random.normal(7, 1.5, num_rows)
    sleep_curr = sleep_base + np.random.normal(0, 2, num_rows)

    stress_base = np.random.normal(30, 15, num_rows)
    stress_curr = stress_base + np.random.normal(0, 15, num_rows)

    resting_hr_base = np.random.normal(65, 10, num_rows)
    resting_hr_curr = resting_hr_base + np.random.normal(0, 8, num_rows)

    temp_base = np.random.normal(36.5, 0.4, num_rows)
    temp_curr = temp_base + np.random.normal(0, 0.5, num_rows)

    glucose_cv_base = np.random.normal(20, 5, num_rows)
    glucose_cv_curr = glucose_cv_base + np.random.normal(0, 10, num_rows)

    tar_base = np.random.normal(15, 10, num_rows)
    tar_curr = tar_base + np.random.normal(0, 15, num_rows)

    tbr_base = np.random.normal(3, 2, num_rows)
    tbr_curr = tbr_base + np.random.normal(0, 5, num_rows)

    avg_glucose_base = np.random.normal(120, 20, num_rows)
    avg_glucose_curr = avg_glucose_base + np.random.normal(0, 25, num_rows)

    glucose_trend_7d = np.random.normal(0, 3, num_rows)
    
    # Optional context
    adherence_proxy = np.random.uniform(0.5, 1.0, num_rows)
    insulin_bolus_curr = np.random.normal(10, 5, num_rows)
    insulin_bolus_base = insulin_bolus_curr + np.random.normal(0, 2, num_rows)
    meal_carb_base = np.random.normal(150, 40, num_rows)
    meal_carb_curr = meal_carb_base + np.random.normal(0, 30, num_rows)
    
    dataset = []

    for i in range(num_rows):
        def delta(curr, base):
            return (curr - base) / max(1e-6, abs(base))

        # Deltas
        d_hrv = delta(hrv_curr[i], hrv_base[i])
        d_sleep = delta(sleep_curr[i], sleep_base[i])
        d_stress = delta(stress_curr[i], stress_base[i])
        d_rhr = delta(resting_hr_curr[i], resting_hr_base[i])
        d_temp = delta(temp_curr[i], temp_base[i])
        
        d_g_cv = delta(glucose_cv_curr[i], glucose_cv_base[i])
        d_tar = delta(tar_curr[i], tar_base[i])
        d_tbr = delta(tbr_curr[i], tbr_base[i])
        d_avg_g = delta(avg_glucose_curr[i], avg_glucose_base[i])
        
        d_ins = delta(insulin_bolus_curr[i], insulin_bolus_base[i])
        d_meal = delta(meal_carb_curr[i], meal_carb_base[i])

        pci = compute_pci(d_hrv, d_sleep, d_stress, d_rhr, d_temp)

        # Labels (Probabilistic approach based on features to ensure correlation)
        # Hyper: driven by d_g_cv, d_tar, and overall PCI
        logit_hyper_24 = -2.0 + 3.0 * d_g_cv + 4.0 * d_tar + 1.5 * pci + 0.5 * glucose_trend_7d[i] - 1.0 * d_sleep + 0.5 * d_stress
        logit_hyper_72 = logit_hyper_24 * 0.8  # slightly less extreme
        
        # Hypo: driven by d_tbr and drops
        logit_hypo_24 = -2.5 + 4.0 * d_tbr + 2.0 * pci - 0.5 * glucose_trend_7d[i]
        logit_hypo_12 = logit_hypo_24 * 1.1

        # TIR Drop
        logit_tir = -1.5 + 2.0 * d_g_cv + 2.5 * pci + 1.5 * d_tar + 1.5 * d_tbr - 1.0 * adherence_proxy[i]
        
        # Instability
        logit_instability = -2.0 + 3.5 * d_g_cv + 3.0 * pci + 1.0 * abs(d_avg_g)

        def make_binary(logit):
            p = sigmoid(logit)
            return 1 if random.random() < p else 0

        row = {
            # Base features needed for model
            "delta_glucose_cv": d_g_cv,
            "delta_TAR": d_tar,
            "delta_TBR": d_tbr,
            "pci": pci,
            "glucose_trend_7d": glucose_trend_7d[i],
            "delta_sleep": d_sleep,
            "delta_stress": d_stress,
            "delta_avg_glucose": d_avg_g,
            "delta_insulin_bolus": d_ins,
            "delta_meal_carb": d_meal,
            "adherence_proxy": adherence_proxy[i],
            
            # Other features
            "delta_hrv": d_hrv,
            "delta_resting_hr": d_rhr,
            "delta_temp": d_temp,
            
            # Targets
            "y_hyper_24": make_binary(logit_hyper_24),
            "y_hyper_72": make_binary(logit_hyper_72),
            "y_hypo_12": make_binary(logit_hypo_12),
            "y_hypo_24": make_binary(logit_hypo_24),
            "y_tir_drop_24": make_binary(logit_tir),
            "y_tir_drop_72": make_binary(logit_tir * 0.9),
            "y_instability_24": make_binary(logit_instability),
            "y_instability_72": make_binary(logit_instability * 0.9),
        }
        dataset.append(row)

    df = pd.DataFrame(dataset)
    os.makedirs("ml/data", exist_ok=True)
    df.to_csv("ml/data/synthetic.csv", index=False)
    print(f"Generated {num_rows} rows at ml/data/synthetic.csv")

if __name__ == "__main__":
    generate_data()
