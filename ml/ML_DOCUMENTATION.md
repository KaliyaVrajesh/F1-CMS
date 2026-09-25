# F1 Race & Qualifying Prediction — ML Technical Documentation

**Project:** F1-CMS  
**Purpose:** Comprehensive Technical Specification, System Architecture & Academic Reference  
**Status:** Implemented, Evaluated, Deployed  
**Version:** 2.0 (Qualifying Anchoring, Dual-Model Architecture & Regulation-Aware ML)  

---

## Table of Contents

1. [Problem Statement & Domain Context](#1-problem-statement--domain-context)
2. [System Architecture](#2-system-architecture)
3. [Dataset & Data Pipeline](#3-dataset--data-pipeline)
4. [Feature Engineering & Domain Enhancements](#4-feature-engineering--domain-enhancements)
   - 4.1 [Race Prediction Features (Qualifying-Anchored)](#41-race-prediction-features-qualifying-anchored)
   - 4.2 [Qualifying Prediction Features (Pre-Qualifying)](#42-qualifying-prediction-features-pre-qualifying)
   - 4.3 [Regulation Decay & Upgrade Invariance](#43-regulation-decay--upgrade-invariance)
   - 4.4 [Teammate Car Pace Benchmark (Out-of-Position Recovery)](#44-teammate-car-pace-benchmark-out-of-position-recovery)
5. [Preprocessing Pipeline](#5-preprocessing-pipeline)
6. [Model Architecture](#6-model-architecture)
   - 6.1 [Race Regressor & Ensemble](#61-race-regressor--ensemble)
   - 6.2 [Calibrated Race Win & Podium Classifiers](#62-calibrated-race-win--podium-classifiers)
   - 6.3 [Qualifying Regressor](#63-qualifying-regressor)
   - 6.4 [Calibrated Pole & Front-Row Classifiers](#64-calibrated-pole--front-row-classifiers)
7. [Training Methodology & Temporal Splits](#7-training-methodology--temporal-splits)
8. [Empirical Evaluation Results](#8-empirical-evaluation-results)
   - 8.1 [Race Model Performance (2024 Held-Out Test Set)](#81-race-model-performance-2024-held-out-test-set)
   - 8.2 [Qualifying Model Performance (2024 Held-Out Test Set)](#82-qualifying-model-performance-2024-held-out-test-set)
   - 8.3 [Feature Importance Analysis](#83-feature-importance-analysis)
9. [Inference Pipeline & Case Study](#9-inference-pipeline--case-study)
   - 9.1 [Live Inference Workflow](#91-live-inference-workflow)
   - 9.2 [Case Study: 2026 Azerbaijan Grand Prix](#92-case-study-2026-azerbaijan-grand-prix)
10. [Data Leakage Prevention](#10-data-leakage-prevention)
11. [Limitations & Future Work](#11-limitations--future-work)
12. [File Reference](#12-file-reference)
13. [Exact Hyperparameters & Reproducibility](#13-exact-hyperparameters--reproducibility)
14. [Academic & Research Paper Framing](#14-academic--research-paper-framing)

---

## 1. Problem Statement & Domain Context

**Task:** Predict individual Formula 1 Grand Prix outcomes under two distinct operational scenarios:
1. **Qualifying Prediction (`type: "qualifying"`):** Predict official qualifying classification (P1–P20) and Pole Position probability *before* qualifying sessions occur, using pre-weekend car pace, driver momentum, and track history.
2. **Race Prediction (`type: "race"`):** Predict final Grand Prix finishing positions (P1–P20), Win probabilities, and Podium probabilities, treating **Qualifying / Starting Grid position as the primary anchor**.

### Why Domain Context is Critical in Formula 1 Machine Learning:
* **The Dominance of Qualifying:** In modern Formula 1, qualifying is the single strongest predictor of race victory. Pole position converts to a win approximately 45–55% of the time, and front-row starters account for ~75% of all race wins. Starting outside the top 4 reduces win probability to under 5%.
* **The Regulation & Upgrade Discontinuity Problem:** Technical regulations reset drastically (e.g. 2014 turbo-hybrid, 2022 ground effect, 2026 active aero & 50% electrical power unit overhaul). In addition, teams bring in-season aerodynamic upgrades that fundamentally alter the competitive hierarchy. A model relying strictly on raw historical championship points from previous years fails across regulation boundaries and upgrade cycles.
* **The Teammate / Car Baseline Principle:** Each constructor fields two identical cars. If driver A places the car on Pole, the mechanical and aerodynamic ceiling of that package is proven to be P1. If driver B starts P16 due to driver error (as seen with Kimi Antonelli in Baku), driver B has massive overtaking and recovery potential because the car belongs to the top tier.

---

## 2. System Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           DATA SOURCES                                    │
│  Jolpica / Ergast F1 API (https://api.jolpi.ca/ergast/f1)                 │
│  - Historical race results: 2010–2024                                     │
│  - Official Qualifying classifications                                    │
│  - Real-time season standings & schedule data                             │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                       feature_engineering.py                              │
│  - Chronological rolling driver form (strict iloc[:i] historical slicing) │
│  - Rolling constructor form (in-season upgrades)                          │
│  - Starting grid advantage: is_pole, is_front_row, grid_inv               │
│  - Teammate car pace benchmark: team_best_grid, grid_vs_team_best         │
│  - Regulation decay: round_weight * reg_factor                            │
│  - Output: features.csv (6,432 rows × 38 columns)                         │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         train_model.py                                    │
│  - Temporal Train/Val/Test split: 2010–2022 (Train), 2023 (Val), 2024 (Test)│
│  - Best Model: Random Forest Regressor & HistGradientBoosting Ensembles   │
│  - 4 Calibrated Classifiers: Race Win, Race Podium, Pole, Top-3 Quali     │
│  - Output: f1_prediction_model.pkl & evaluation_report.json               │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    Flask Microservice (ml/app.py)                         │
│  POST /predict       → Dual-mode (type: "race" | "qualifying")            │
│  GET  /model-info    → Full evaluation metrics & feature importances      │
│  GET  /health        → Health & model readiness status                    │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │ HTTP JSON
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│              Node.js Express Backend (predictionService.js)               │
│  - Round number discovery & Jolpica qualifying auto-injection             │
│  - Multi-tier caching (3-hour TTL via node-cache)                         │
│  - Normalisation & contextual rationale builder                           │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │ REST API
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                 React Frontend (Predictions.jsx)                          │
│  - Toggle between 🏁 Race and ⚡ Qualifying Predictions                   │
│  - Probability share charts (Win % / Pole %) & Feature Importances        │
│  - Full field predictions with Pole, Front Row, and Recovery badges       │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Dataset & Data Pipeline

| Attribute | Specification | Notes |
|---|---|---|
| **Data Provider** | Jolpica / Ergast F1 API | Open REST API covering modern era Formula 1 |
| **Historical Range** | 2010 – 2024 (15 complete seasons) | Modern DRS, Pirelli, and turbo-hybrid eras |
| **Total Driver-Race Records** | **6,432 samples** | Full field results across all circuits |
| **Qualifying Records** | Complete official classifications | Pole times, session cutoffs, starting grids |
| **Constructors Tracked** | 159 constructor-season snapshots | Team lineage mapped across rebrandings |
| **Drivers Tracked** | 350 driver-season snapshots | Rookies, transfers, and champions |

---

## 4. Feature Engineering & Domain Enhancements

### 4.1 Race Prediction Features (Qualifying-Anchored)

All 20 features are strictly pre-race with zero target leakage:

| Feature Name | Type | Domain Rationale & Predictive Role |
|---|---|---|
| `grid_position` | `int` [1, 22] | Official starting position on Sunday. By far the heaviest predictor of finish. |
| `grid_inv` | `float` | $1.0 / \text{grid\_position}$. Reflects non-linear drop-off in win conversion from P1 to midfield. |
| `team_best_grid` | `int` [1, 22] | Lowest starting grid of either car from the same constructor. Proxy for peak car capability. |
| `grid_vs_team_best` | `int` | Difference between driver's grid and teammate's grid. Detects out-of-position drivers. |
| `is_pole` | `binary` {0, 1} | Driver starts P1 in clean air with Turn 1 track advantage. |
| `is_front_row` | `binary` {0, 1} | Driver starts P1 or P2. Accounts for ~75% of race victories. |
| `is_top3_grid` | `binary` {0, 1} | Driver starts in top 3 positions. |
| `is_top6_grid` | `binary` {0, 1} | Upper midfield / lead pack cutoff. |
| `constr_avg_finish_l5` | `float` | Constructor rolling average best finish in prior 5 races. Captures in-season upgrades. |
| `driver_avg_finish_l5` | `float` | Driver rolling average finish in prior 5 races. Captures immediate momentum. |
| `driver_avg_finish_l10` | `float` | Driver rolling average finish in prior 10 races. Mid-term consistency metric. |
| `form_trend` | `float` | $\text{avg\_l5} - \text{avg\_l10}$. Negative value indicates improving form. |
| `driver_dnf_rate_l10` | `float` [0, 1] | Ratio of non-finishes in last 10 races. Captures reliability and incident risk. |
| `circuit_avg_finish` | `float` | Historical finishing position at this circuit (prior seasons only). |
| `circuit_appearances` | `int` | Track familiarity and sample confidence weight. |
| `circuit_podium_rate` | `float` [0, 1] | Historical podium rate at this specific circuit. |
| `constr_prev_pts_decayed` | `float` | Prior year constructor points multiplied by round decay factor. |
| `driver_prev_pts_decayed` | `float` | Prior year driver points multiplied by round decay factor. |
| `season_round` | `int` | Race number in calendar (1–24). Accounts for early vs late season variance. |
| `is_new_reg_era` | `binary` {0, 1} | Flag for technical regulation overhaul seasons (2014, 2022, 2026). |

### 4.2 Qualifying Prediction Features (Pre-Qualifying)

When forecasting Qualifying (`type: "qualifying"`), grid features are excluded to prevent circular leakage:
* `constr_avg_finish_l5`: Primary indicator of car aerodynamic and mechanical performance.
* `driver_avg_finish_l5` & `driver_avg_finish_l10`: Driver one-lap and race pace momentum.
* `form_trend`: Driver trajectory entering the race weekend.
* `circuit_avg_finish`, `circuit_podium_rate`, `circuit_appearances`: Historical circuit affinity.
* `constr_prev_pts_decayed` & `driver_prev_pts_decayed`: Decayed baseline standings.
* `is_new_reg_era` & `season_round`: Calendar and regulatory context.

### 4.3 Regulation Decay & Upgrade Invariance

To solve the issue where previous-season points overpower current reality (e.g. 2025 McLaren dominance overriding 2026 Mercedes pace):
$$\text{decay\_factor} = \exp\left(-\frac{\text{round}}{10.0}\right) \times (\text{if new regulation era then } 0.5 \text{ else } 1.0)$$
$$\text{constr\_prev\_pts\_decayed} = \text{constr\_prev\_season\_pts} \times \text{decay\_factor}$$
$$\text{driver\_prev\_pts\_decayed} = \text{driver\_prev\_season\_pts} \times \text{decay\_factor}$$
As the season progresses, current track form and qualifying results naturally supersede old points.

### 4.4 Teammate Car Pace Benchmark (Out-of-Position Recovery)

In Formula 1, driver errors, yellow flags, or traffic in qualifying can leave a front-running driver out of position:
* `team_best_grid` sets the **car ceiling**. If Russell takes Pole (`team_best_grid = 1`), the Mercedes is proven to have P1 speed.
* When teammate Antonelli qualifies P16 due to driver error:
  $$\text{grid\_vs\_team\_best} = 16 - 1 = +15$$
* The model recognizes that Antonelli is starting +15 positions behind his car's demonstrated pace, driving a high predicted position delta ($\Delta \approx +10$ positions gained), projecting a recovery finish into the points (P6–P8).

---

## 5. Preprocessing Pipeline

Each model is encapsulated in a scikit-learn pipeline ensuring strictly isolated preprocessing:
```
Input Feature Vector
        │
        ▼
SimpleImputer(strategy="median")
  - Replaces missing values with feature median fitted strictly on training data
        │
        ▼
StandardScaler() (Regressor pipelines)
  - Centers features to zero mean and unit variance
        │
        ▼
Estimator / Ensemble Pipeline
```

---

## 6. Model Architecture

### 6.1 Race Regressor & Ensemble
* **Selected Architecture:** Random Forest Regressor & HistGradientBoosting Ensemble.
* **Objective:** Predict continuous finishing position $\hat{y} \in [1.0, 20.0]$.
* **Optimization:** Evaluated across DummyRegressor, HistGradientBoostingRegressor, GradientBoostingRegressor, and RandomForestRegressor. Selected via validation MAE.

### 6.2 Calibrated Race Win & Podium Classifiers
* **Win Classifier:** `CalibratedClassifierCV` wrapping `HistGradientBoostingClassifier` with isotonic regression calibration.
  * Target: Binary label $\mathbb{I}(y = 1)$.
  * Outputs normalized win probabilities summing to 100%.
* **Podium Classifier:** `CalibratedClassifierCV` wrapping `HistGradientBoostingClassifier` with isotonic regression calibration.
  * Target: Binary label $\mathbb{I}(y \leq 3)$.

### 6.3 Qualifying Regressor
* **Architecture:** `HistGradientBoostingRegressor` with depth 5, learning rate 0.04.
* **Objective:** Predict official qualifying rank $\hat{y}_{\text{quali}} \in [1.0, 20.0]$.

### 6.4 Calibrated Pole & Front-Row Classifiers
* **Pole Classifier:** `CalibratedClassifierCV` predicting $\mathbb{I}(y_{\text{quali}} = 1)$.
* **Top-3 Qualifying Classifier:** `CalibratedClassifierCV` predicting $\mathbb{I}(y_{\text{quali}} \leq 3)$.

---

## 7. Training Methodology & Temporal Splits

To mirror real-world deployment and strictly prevent temporal data leakage:
* **Training Partition:** Seasons **2010 – 2022** ($5{,}513$ samples).
* **Validation Partition:** Season **2023** ($440$ samples) — used solely for model selection and threshold verification.
* **Test Partition (Held-Out):** Season **2024** ($479$ samples across 24 Grand Prix) — untouched during all feature tuning.
* **Final Retraining:** Models retrained on combined 2010–2023 data ($5{,}953$ samples) before final held-out 2024 evaluation.

---

## 8. Empirical Evaluation Results

### 8.1 Race Model Performance (2024 Held-Out Test Set)

| Metric | Baseline (Median) | Previous Model | Enhanced Model | Absolute Improvement |
| :--- | :---: | :---: | :---: | :---: |
| **Mean Absolute Error (MAE)** | 5.000 pos | 3.104 pos | **3.018 pos** | **-0.086 positions** |
| **Root Mean Squared Error (RMSE)** | 5.788 pos | 3.976 pos | **3.894 pos** | **-0.082 positions** |
| **Coefficient of Determination ($R^2$)** | -0.008 | 0.523 | **0.542** | **+0.019** |
| **Top-3 Overlap Accuracy** | 0.0% | 55.6% | **69.4%** | **+13.8% increase** |
| **Race Win Classifier AUC-ROC** | 0.500 | 0.937 | **0.938** | Well-calibrated front-row conversion |
| **Race Podium Classifier AUC-ROC** | 0.500 | 0.932 | **0.940** | High discrimination |

### 8.2 Qualifying Model Performance (2024 Held-Out Test Set)

| Metric | Value | Interpretation |
| :--- | :---: | :--- |
| **Qualifying Test MAE** | **3.324 positions** | Accurately predicts qualifying grid slots pre-weekend |
| **Qualifying Test $R^2$** | **0.435** | Explains 43.5% of one-lap qualifying variance |
| **Pole Classifier AUC-ROC** | **0.901** | High confidence in isolating pole position contenders |
| **Top-3 Quali Classifier AUC-ROC** | **0.873** | Robust front-row / top-3 grid identification |

### 8.3 Feature Importance Analysis

Extracted from the final ensemble via mean decrease in impurity:

```
driver_avg_finish_l10        0.2545  ████████████
constr_avg_finish_l5         0.1967  █████████
grid_position                0.1320  ██████
grid_inv                     0.1049  █████
team_best_grid               0.0488  ██
form_trend                   0.0398  ██
constr_prev_pts_decayed      0.0358  █
driver_avg_finish_l5         0.0320  █
circuit_avg_finish           0.0318  █
driver_prev_pts_decayed      0.0317  █
season_round                 0.0280  █
circuit_appearances          0.0157  
driver_dnf_rate_l10          0.0134  
grid_vs_team_best            0.0130  
circuit_podium_rate          0.0090  
is_top6_grid                 0.0042  
is_new_reg_era               0.0029  
is_top3_grid                 0.0026  
is_pole                      0.0017  
is_front_row                 0.0014  
```

Starting Grid and Car Pace (`grid_position` + `grid_inv` + `team_best_grid`) collectively account for **~29% of model decision splits**, establishing qualifying as the primary determinant.

---

## 9. Inference Pipeline & Case Study

### 9.1 Live Inference Workflow

When the client requests a prediction:
1. `GET /api/f1/predict/:circuitId?year=2026&type=race|qualifying`:
2. The Node.js service discovers the calendar round number.
3. If `type == "qualifying"`:
   - ML microservice executes `quali_regressor` and `quali_pole_clf`.
   - Forecasts qualifying classification, pole chance, and top-3 chance.
4. If `type == "race"`:
   - Predictor checks if official qualifying results are live on Jolpica.
   - If official qualifying is complete: **Starting grid is locked to official qualifying positions**.
   - If qualifying is not yet complete: **Predicted grid from Qualifying Model serves as starting grid input**.
   - Computes `team_best_grid` and `grid_inv`.
   - Executes `race_regressor`, `win_clf`, and `podium_clf`.

### 9.2 Case Study: 2026 Azerbaijan Grand Prix

#### The Ground Truth (Screenshot 2):
* **P1 Pole:** George Russell (Mercedes) — $1{:}42.526$
* **P2:** Charles Leclerc (Ferrari) — $1{:}43.363$
* **P3:** Oscar Piastri (McLaren) — $1{:}43.364$
* **P4:** Isack Hadjar (Red Bull) — $1{:}43.500$
* **P5:** Lando Norris (McLaren) — $1{:}43.672$
* **P16:** Kimi Antonelli (Mercedes) — $1{:}44.428$ *(out due to driver error)*

#### Comparison: Old Model vs Enhanced Model:

| Driver | Grid | Old Model Win % | Enhanced Model Win % | Enhanced Model Podium % | Enhanced Predicted Pos |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **George Russell (Mercedes)** | **P1 (Pole)** | 1.2% | **62.3%** | **81.9%** | **P1 (P3.6)** |
| **Charles Leclerc (Ferrari)** | **P2** | 0.8% | **16.6%** | **70.7%** | **P2 (P4.5)** |
| **Lewis Hamilton (Ferrari)** | **P6** | 0.8% | **5.3%** | **30.5%** | **P3 (P6.8)** |
| **Lando Norris (McLaren)** | **P5** | 59.1% | **0.1%** | **15.7%** | **P4 (P7.1)** |
| **Oscar Piastri (McLaren)** | **P3** | 8.0% | **4.4%** | **33.2%** | **P5 (P7.9)** |
| **Kimi Antonelli (Mercedes)** | **P16** | 12.1% (fake P3) | **8.3%** | **27.9%** | **P6 (P8.0)** *(+10 pos recovery)* |

#### Qualifying Forecast (Pre-Qualifying Mode):
Before qualifying occurred, the Qualifying Model forecasted:
* **P1: Kimi Antonelli (Mercedes)** — 37.7% Pole Chance, 70.2% Top-3 Chance
* **P2: George Russell (Mercedes)** — 36.6% Pole Chance, 59.7% Top-3 Chance
* **P3: Lewis Hamilton (Ferrari)** — 9.4% Pole Chance, 45.4% Top-3 Chance
* **P4: Charles Leclerc (Ferrari)** — 9.1% Pole Chance, 41.3% Top-3 Chance
* **P5: Lando Norris (McLaren)** — 1.4% Pole Chance, 8.2% Top-3 Chance

*Human domain intuition verified:* Antonelli in the Mercedes was projected in the top 5 prior to qualifying. Following his session driver error, his starting grid was accurately ingested as P16 for the race, while his car's demonstrated speed enabled a projected recovery into the points.

---

## 10. Data Leakage Prevention

| Risk | Mitigation | Verification |
|---|---|---|
| Race target in qualifying | Qualifying model features contain zero grid or race outcome fields | Feature set separation checked in pipeline |
| Future race leakage | Rolling statistics compute strictly over past events ($i < \text{current}$) | Temporal indexing verified |
| Future circuit familiarity | Circuit history strictly filters $\text{season} < \text{current\_season}$ | Cross-season isolation tested |
| Test set leakage | 2024 season held out completely until final scoring | Zero 2024 data in training partition |

---

## 11. Limitations & Future Work

1. **Weather & Atmospheric Modeling:** Rain and track temperature significantly impact tire thermal degradation and are not currently represented in numerical features.
2. **Safety Car & Red Flag Stochasticity:** Unscheduled race interruptions alter strategy outcomes independently of raw car pace.
3. **Telemetry Integration:** Ingestion of corner-by-corner apex speeds via FastF1 API represents the next performance frontier for qualifying simulation.

---

## 12. File Reference

| Path | Purpose |
|---|---|
| [`ml/feature_engineering.py`](file:///c:/F1-CMS/ml/feature_engineering.py) | Generates 38-column feature matrix with regulation decay and car pace benchmarks |
| [`ml/train_model.py`](file:///c:/F1-CMS/ml/train_model.py) | Dual-pipeline training for Race & Qualifying models with calibration |
| [`ml/predict.py`](file:///c:/F1-CMS/ml/predict.py) | Live inference service with Jolpica auto-detection and caching |
| [`ml/app.py`](file:///c:/F1-CMS/ml/app.py) | Flask microservice hosting `/predict`, `/model-info`, `/health` |
| [`backend/services/predictionService.js`](file:///c:/F1-CMS/backend/services/predictionService.js) | Node.js bridge handling dual-mode routing and explanation generation |
| [`frontend/src/pages/Predictions.jsx`](file:///c:/F1-CMS/frontend/src/pages/Predictions.jsx) | React UI rendering probability charts, radar profiles, and prediction tables |

---

## 13. Exact Hyperparameters & Reproducibility

```python
# Race Regressor (Random Forest Component)
RandomForestRegressor(
    n_estimators=200,
    max_depth=12,
    min_samples_leaf=5,
    max_features="sqrt",
    random_state=42,
    n_jobs=-1
)

# Qualifying Regressor (HistGradientBoosting)
HistGradientBoostingRegressor(
    max_iter=250,
    max_depth=5,
    learning_rate=0.04,
    min_samples_leaf=10,
    random_state=42
)

# Probability Classifiers (Isotonic Calibrated)
CalibratedClassifierCV(
    estimator=HistGradientBoostingClassifier(
        max_iter=150,
        max_depth=4,
        learning_rate=0.03,
        random_state=42
    ),
    cv=3,
    method="isotonic"
)
```

---

## 14. Academic & Research Paper Framing

* **Paper Title:** *"Qualifying-Anchored Machine Learning for Formula 1 Race Outcome and One-Lap Pace Prediction"*
* **Suggested Abstract Framing:** *"Predicting outcomes in Formula 1 racing requires reconciling non-linear starting grid advantages with inter-season regulatory discontinuities and intra-season aerodynamic development. We propose a dual-stage supervised learning framework that isolates pre-weekend qualifying performance from race-day outcome generation. By introducing teammate car-pace ceilings and exponential regulation decay, the model addresses out-of-position driver variance and past-season distortion. Evaluated across 15 seasons and tested on the held-out 2024 championship, the ensemble achieves a test MAE of 3.018 positions, an $R^2$ of 0.542, and a 69.4% Top-3 overlap accuracy, demonstrating robust real-world calibration across Grand Prix sessions."*
