# F1 Race Prediction — ML Technical Documentation

**Project:** F1-CMS  
**Purpose:** Reference document for draft report and research paper  
**Status:** Implemented, tested, deployed  
**Git commit:** `a7b1b9e`

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [System Architecture](#2-system-architecture)
3. [Dataset](#3-dataset)
4. [Feature Engineering](#4-feature-engineering)
5. [Preprocessing Pipeline](#5-preprocessing-pipeline)
6. [Models](#6-models)
7. [Training Methodology](#7-training-methodology)
8. [Evaluation Results](#8-evaluation-results)
9. [Inference Pipeline](#9-inference-pipeline)
10. [Data Leakage Prevention](#10-data-leakage-prevention)
11. [Limitations](#11-limitations)
12. [File Reference](#12-file-reference)
13. [Exact Hyperparameters](#13-exact-hyperparameters)
14. [Suggested Framing for Report / Paper](#14-suggested-framing-for-report--paper)

---

## 1. Problem Statement

**Task:** Given pre-race information about drivers, constructors, and a specific circuit, predict each driver's finishing position in a Formula 1 Grand Prix.

**Prediction targets:**
- **Primary:** Expected finishing position (regression, continuous value 1–20)
- **Derived:** Win probability — P(finish position = 1)
- **Derived:** Podium probability — P(finish position ≤ 3)

**Why this is non-trivial:**
- F1 has ~20 drivers competing simultaneously; ranking problems with many interacting entities are harder than binary classification
- Driver/constructor competitiveness shifts between seasons and within seasons
- Circuit characteristics interact differently with different car/driver combinations
- DNFs (did not finish) introduce outcome noise uncorrelated with driver skill
- The training distribution changes over time (regulation changes, new teams, new drivers)

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   DATA SOURCES                           │
│  Jolpica/Ergast API  (https://api.jolpi.ca/ergast/f1)   │
│  - Race results 2010–2024                               │
│  - Qualifying results                                   │
│  - End-of-season standings                              │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│              data_collection.py                          │
│  - Rate-limited fetcher (1 s/request, exp. back-off)    │
│  - 4 API calls per season × 15 seasons ≈ 60 requests    │
│  - Outputs: 4 raw CSV files                             │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│              feature_engineering.py                      │
│  - Rolling driver form (strict historical slicing)      │
│  - Rolling constructor form                             │
│  - Circuit-specific history (cross-season only)         │
│  - Previous season standings merge                      │
│  - Output: features.csv  (6,432 rows × 27 columns)      │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│                train_model.py                            │
│  Temporal split → 3 models compared → best selected     │
│  → Retrained on train+val → tested on 2024              │
│  → 2 calibrated classifiers trained (win, podium)       │
│  → Model bundle saved as .pkl                           │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│           Flask Microservice  (app.py, port 5001)        │
│  POST /predict   →  calls predict.py                    │
│  GET  /model-info → evaluation_report.json              │
│  GET  /health    → liveness                             │
└─────────────────────┬────────────────────────────────────┘
                      │  HTTP JSON
                      ▼
┌──────────────────────────────────────────────────────────┐
│    Node.js Express Backend  (predictionService.js)       │
│  - Bridges frontend requests to ML service              │
│  - Caches predictions 3 hours (node-cache)             │
│  - Handles ML service unavailability gracefully         │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│         React Frontend  (Predictions.jsx)                │
│  - Displays predicted positions, win %, podium %        │
│  - Feature importances chart                            │
│  - ML model metadata + real evaluation metrics          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Dataset

### Source
**Jolpica F1 API** (`https://api.jolpi.ca/ergast/f1`) — a free, open API that serves the entire Ergast F1 database (which covers every season from 1950 to present). No API key required.

### Coverage
| Attribute | Value |
|---|---|
| Seasons collected | 2010 – 2024 (15 seasons) |
| Total driver-race records | **6,432** |
| Qualifying records | 1,500 |
| Driver standings records | 350 |
| Constructor standings records | 159 |
| Approximate races per season | 19–24 |
| Drivers per race | ~20 |

### Raw files collected

| File | Rows | Description |
|---|---|---|
| `raw_results.csv` | 6,432 | One row per driver per race: position, grid, status, points |
| `raw_qualifying.csv` | 1,500 | One row per driver per qualifying session: classified position |
| `raw_driver_standings.csv` | 350 | End-of-season standings per driver per year |
| `raw_constructor_standings.csv` | 159 | End-of-season standings per constructor per year |

### Why 2010 onwards
The 2010 season marks the introduction of the modern double DRS era and a relatively stable regulatory framework. Starting here reduces distribution shift compared to including 1950s–2000s data where car performance gaps were completely different. It still gives 15 seasons — enough for the rolling-form features to be meaningful by mid-dataset.

### Data quality notes
- Grid position 0 (pit lane start) is treated as 20 in the feature
- DNF/DNS are preserved in the `status` column; used directly to compute `driver_dnf_rate_l10`
- Missing qualifying data for some early-season races falls back to grid_position
- Rookie drivers with no previous season data receive default values (described in §4)

---

## 4. Feature Engineering

All 17 features are **strictly pre-race** — they contain only information that would genuinely be available before the race being predicted. This is critical for ML integrity.

### Feature table

| # | Feature Name | Type | Description | Leakage Risk | Why It Matters |
|---|---|---|---|---|---|
| 1 | `grid_position` | int | Starting grid position from qualifying | None — set before race | Strongest single predictor; front-row cars have massive advantage at race start |
| 2 | `quali_position` | int | Official qualifying classification position | None | Captures the same signal as grid_pos but from the official timing sheet; correlated but not identical (e.g. penalties) |
| 3 | `driver_avg_finish_l5` | float | Driver's mean finishing position over last 5 completed races | None — computed from prior rounds only | Captures short-term momentum and form |
| 4 | `driver_avg_finish_l10` | float | Driver's mean finishing position over last 10 races | None | Broader form window; more stable estimate than L5 |
| 5 | `driver_dnf_rate_l10` | float [0,1] | Proportion of last 10 races where driver did not finish | None | Reliability proxy; high DNF rate predicts worse outcomes |
| 6 | `constr_avg_finish_l5` | float | Constructor's average best finishing position per race, last 5 races | None | Captures car pace and recent reliability at team level |
| 7 | `driver_prev_season_pts` | float | Driver's total championship points in the previous season | None — previous season is fully historical | Proxy for driver quality calibrated over a full season |
| 8 | `driver_prev_season_pos` | int | Driver's final championship position in previous season | None | Ordinal ranking; complements the points total |
| 9 | `driver_prev_season_wins` | int | Driver's wins in the previous season | None | Captures "winning habit" and peak performance ability |
| 10 | `constr_prev_season_pts` | float | Constructor's total points in previous season | None | Car competitiveness proxy; strong predictor of pace |
| 11 | `constr_prev_season_pos` | int | Constructor's final championship position in previous season | None | Ordinal team ranking |
| 12 | `constr_prev_season_wins` | int | Constructor's wins in previous season | None | Captures dominant team vs. also-ran distinction |
| 13 | `circuit_avg_finish` | float | Driver's mean finishing position at this circuit (prior seasons only) | None — prior seasons only | Captures circuit-specific driver affinity |
| 14 | `circuit_appearances` | int | Number of times driver has started at this circuit (prior seasons) | None | Weighting signal — low appearance count = less reliable circuit_avg_finish |
| 15 | `circuit_podium_rate` | float [0,1] | Fraction of prior appearances where driver finished in top 3 | None | Distinct from avg_finish; captures top-end performance specifically |
| 16 | `season_round` | int | Race number within the current season (1–24) | None | Early-season results are noisier; teams develop throughout the year |
| 17 | `season_year` | int | Calendar year of the race | None | Controls for era effects (turbohybrid era regulations, team eras) |

### Rolling form implementation detail

Rolling statistics use strict `iloc[:i]` indexing — for any race at position `i` in the chronologically sorted driver history, only rows `0` to `i-1` are used. There is no look-ahead.

```python
for i, row in grp.iterrows():
    past   = grp.iloc[:i]          # strictly before current row
    last5  = past.tail(5)
    last10 = past.tail(10)
    avg_l5  = last5["finish_position"].mean()   # NaN if no past races
    avg_l10 = last10["finish_position"].mean()
    dnf_l10 = last10["dnf_flag"].mean()
```

### Circuit history implementation detail

Circuit history uses only races from **previous seasons** (strict `season < current_season` filter), not the current season's earlier rounds. This prevents early-round circuit data from leaking into later-round predictions within the same season.

```python
past = grp[grp["season"] < row["season"]]   # prior seasons only
```

### Missing value defaults

| Feature | Default when missing | Reasoning |
|---|---|---|
| `driver_avg_finish_l5/l10` | 11.0 | Mid-field; conservative for rookies/no-data |
| `driver_dnf_rate_l10` | 0.1 | 10% DNF rate — slightly above average |
| `constr_avg_finish_l5` | 6.0 | Top half of grid; conservative mid-field |
| `circuit_avg_finish` | 11.0 | Mid-field when no circuit history |
| `circuit_appearances` | 0 | No appearances |
| `circuit_podium_rate` | 0.0 | No podiums in prior visits |
| `driver_prev_season_pts` | 0.0 | Rookie or no prior season |
| `driver_prev_season_pos` | 20 | Last place fallback |

---

## 5. Preprocessing Pipeline

Each model is wrapped in a scikit-learn `Pipeline`:

```
Input features (17 columns)
        ↓
SimpleImputer(strategy="median")
  - Fills any remaining NaN values with the median of that feature
  - Applied before scaling; ensures no NaN reaches the model
        ↓
StandardScaler()
  - Standardises each feature to zero mean and unit variance
  - Important for regularisation effects inside tree-based models;
    less critical for Random Forest but ensures consistent behaviour
        ↓
Model (RandomForestRegressor or GradientBoostingRegressor)
```

For the probability classifiers, a separate `SimpleImputer` is fitted on the training+validation data (`clf_imputer`) and applied before calling `CalibratedClassifierCV`.

---

## 6. Models

### 6.1 Baseline — DummyRegressor

- **Strategy:** Always predicts the median of the training target
- **Purpose:** Establishes the floor — any real model must beat this
- **Result:** MAE 5.000 (validation 2023)

### 6.2 Random Forest Regressor ← SELECTED

**What it is:** An ensemble of decision trees. Each tree is built on a bootstrap sample of the training data with a random subset of features at each split. The final prediction is the mean across all trees.

**Why chosen for this problem:**
- Handles non-linear feature interactions naturally (e.g. grid position matters much more for street circuits than high-speed circuits)
- Robust to outliers (DNFs, safety car races)
- Built-in feature importance via mean decrease in impurity
- Fast inference (important for live predictions)
- Does not overfit easily with sufficient trees

**Exact hyperparameters used:**
```python
RandomForestRegressor(
    n_estimators   = 200,     # 200 trees in the ensemble
    max_depth      = 12,      # maximum tree depth
    min_samples_leaf = 5,     # minimum samples required at each leaf
    max_features   = "sqrt",  # sqrt(17) ≈ 4 features considered at each split
    random_state   = 42,      # reproducibility seed
    n_jobs         = -1,      # use all available CPU cores
)
```

### 6.3 Gradient Boosting Regressor (compared, not selected)

**What it is:** Builds trees sequentially, each one correcting the errors of the previous. Uses gradient descent in function space.

**Why not selected:** Higher MAE on the 2023 validation set (3.777 vs 3.429 for Random Forest). Random Forest trains faster and generalises slightly better on this dataset size.

**Exact hyperparameters used:**
```python
GradientBoostingRegressor(
    n_estimators     = 300,    # 300 sequential trees
    max_depth        = 5,      # shallower trees than RF (by design for GB)
    learning_rate    = 0.05,   # conservative step size
    subsample        = 0.8,    # stochastic GB — 80% of data per tree
    min_samples_leaf = 5,
    random_state     = 42,
)
```

### 6.4 Win Probability Classifier

**What it is:** A Gradient Boosting Classifier wrapped in `CalibratedClassifierCV` with isotonic regression calibration.

**Training target:** Binary label — 1 if `finish_position == 1`, 0 otherwise.

**Why calibration matters:** An uncalibrated classifier might output `predict_proba = 0.8` for a driver who actually wins only 40% of the time. Isotonic regression calibration adjusts the probability outputs so that drivers the model says have a 30% win chance actually win approximately 30% of the time on held-out data.

**Exact hyperparameters:**
```python
CalibratedClassifierCV(
    estimator = GradientBoostingClassifier(
        n_estimators  = 200,
        max_depth     = 4,
        learning_rate = 0.05,
        subsample     = 0.8,
        random_state  = 42,
    ),
    cv     = 3,           # 3-fold cross-validation for calibration
    method = "isotonic",  # non-parametric calibration (better than Platt/sigmoid for larger data)
)
```

### 6.5 Podium Probability Classifier

Identical architecture to the win classifier.  
**Training target:** Binary label — 1 if `finish_position <= 3`, 0 otherwise.

---

## 7. Training Methodology

### 7.1 Temporal Split (critical design decision)

F1 data is **time series data**. Using random k-fold cross-validation would allow future races to appear in the training set when predicting earlier races — this is data leakage.

Instead, a strict **forward-chaining temporal split** is used:

```
2010 2011 2012 2013 2014 2015 2016 2017 2018 2019 2020 2021 2022 | 2023 | 2024
├────────────────────── TRAINING ──────────────────────────────┤  VAL  │ TEST │
                     4,953 samples                               440 s  479 s
```

- **Training set:** seasons 2010–2022 (4,953 samples) — used to fit all models
- **Validation set:** season 2023 (440 samples) — used to select between Random Forest and Gradient Boosting
- **Test set:** season 2024 (479 samples) — **held out entirely until final evaluation**
- **Final training:** best model (Random Forest) retrained on 2010–2023 combined (5,393 samples) before test evaluation

This mirrors real-world deployment: predict the 2026 season using a model trained on everything up to 2025.

### 7.2 Model Selection

Selection criterion: **lowest MAE on the 2023 validation set**.

| Model | Val MAE (2023) | Val RMSE | Val R² | Top-3 Acc |
|---|---|---|---|---|
| Baseline (median) | 5.000 | 5.788 | -0.008 | — |
| **Random Forest** | **3.429** | **4.362** | **0.428** | **0.591** |
| Gradient Boosting | 3.777 | 4.685 | 0.340 | 0.500 |

Random Forest was selected.

### 7.3 Final Training

After selection, the Random Forest was retrained on the combined 2010–2023 dataset (5,393 rows) to give it maximum historical information before evaluation on the 2024 test set.

The probability classifiers (win and podium) were also trained on the 2010–2023 combined dataset.

### 7.4 Reproducibility

All models use `random_state=42`. The feature engineering pipeline is deterministic (no random operations). Re-running `train_model.py` on the same data will produce identical results.

---

## 8. Evaluation Results

All numbers below are measured on the **2024 held-out test set** (479 samples from 24 races). The model had never seen any 2024 data during training.

### 8.1 Regression Performance (finish position prediction)

| Metric | Value | Interpretation |
|---|---|---|
| **MAE** | **3.104 positions** | On average, the model's predicted finishing position is 3.1 places away from the actual result |
| **RMSE** | **3.976 positions** | Root mean squared error; higher than MAE indicates occasional large errors |
| **R²** | **0.523** | The model explains 52.3% of the variance in finishing positions |
| **Top-3 Accuracy** | **55.6%** | In 55.6% of races, at least one of the model's predicted top-3 drivers actually finished in the top 3 |
| Baseline MAE | 5.000 | Predicting median position for every driver |
| **Improvement** | **+1.896 positions** | MAE improvement over the baseline |

**Interpreting R² = 0.52:** F1 finishing positions have high inherent randomness (safety cars, mechanical failures, tyre strategies, first-lap incidents). An R² of 0.52 on a target this noisy is meaningful. For comparison, purely luck-driven outcomes would give R² ≈ 0.

### 8.2 Classification Performance (probability outputs)

| Classifier | Metric | Value | Interpretation |
|---|---|---|---|
| Win probability | **AUC-ROC** | **0.937** | The model correctly ranks drivers by win likelihood 93.7% of the time |
| Podium probability | **AUC-ROC** | **0.932** | 93.2% correct ranking for podium prediction |

**Interpreting AUC = 0.937:** AUC-ROC measures the probability that the model will rank a driver who actually won higher than a driver who did not. 0.937 is a strong result and indicates the calibrated classifier is reliably distinguishing likely winners from non-winners. Random chance = 0.5, perfect = 1.0.

### 8.3 Feature Importances

Extracted from the Random Forest's mean decrease in impurity across all 200 trees:

| Rank | Feature | Importance | Notes |
|---|---|---|---|
| 1 | `quali_position` | **17.92%** | Highest single feature |
| 2 | `driver_avg_finish_l10` | **16.60%** | Rolling 10-race form |
| 3 | `constr_avg_finish_l5` | **14.18%** | Constructor pace proxy |
| 4 | `grid_position` | **13.56%** | Correlated with quali but not identical |
| 5 | `driver_avg_finish_l5` | **8.67%** | Shorter form window |
| 6 | `constr_prev_season_pts` | **5.57%** | Previous-season car quality |
| 7 | `constr_prev_season_pos` | **3.79%** | Constructor championship position |
| 8 | `driver_prev_season_pts` | **3.63%** | Previous-season driver quality |
| 9 | `season_round` | **2.69%** | Development/reliability trend |
| 10 | `circuit_avg_finish` | **2.65%** | Circuit-specific history |
| 11 | `driver_prev_season_pos` | **2.13%** | Driver championship pos |
| 12 | `season_year` | **2.07%** | Era/regulation context |
| 13 | `constr_prev_season_wins` | **1.59%** | Constructor winning habit |
| 14 | `circuit_appearances` | **1.45%** | Circuit experience |
| 15 | `driver_dnf_rate_l10` | **1.35%** | Reliability risk |
| 16 | `driver_prev_season_wins` | **1.12%** | Driver winning habit |
| 17 | `circuit_podium_rate` | **1.03%** | Circuit podium history |

**Key insight:** Grid/qualifying position and recent rolling form dominate (~61% combined), confirming that in F1, starting position and recent momentum are the strongest predictors of race outcome. Historical circuit performance has lower importance than commonly assumed.

---

## 9. Inference Pipeline

When a user requests a prediction for an upcoming race, the inference pipeline executes:

```
1. User requests: circuit_id="monza", year=2026
        ↓
2. Node.js backend looks up round number from Jolpica schedule API
        ↓
3. POST /predict sent to Flask ML service (port 5001)
        ↓
4. predict.py: assemble_features()
   For each of ~20 current-season drivers:
   a. Fetch current standings from /2026/driverStandings.json
   b. Fetch constructor standings from /2026/constructorStandings.json
   c. Fetch driver's 2026 race results from /2026/drivers/{id}/results.json
      → compute avg_finish_l5, avg_finish_l10, dnf_rate_l10
   d. Fetch constructor's 2026 results → compute constr_avg_finish_l5
   e. Fetch driver's circuit history at monza (prior seasons only)
      → compute circuit_avg_finish, circuit_appearances, circuit_podium_rate
   f. Set season_round = 16, season_year = 2026
        ↓
5. X = DataFrame of 17 features (one row per driver)
        ↓
6. Regressor (Pipeline): impute → scale → Random Forest
   → pred_positions: array of predicted finishing positions
        ↓
7. clf_imputer.transform(X) → X_imp
   win_clf.predict_proba(X_imp)[:, 1]    → win_probs_raw
   podium_clf.predict_proba(X_imp)[:, 1] → podium_probs_raw
        ↓
8. Post-processing:
   - Win probs: normalise to sum to 100%, clip [0.2%, 60%]
   - Podium probs: clip [0.2%, 75%]
        ↓
9. Sort drivers by predicted_position ascending → ranked list
        ↓
10. Return JSON with predictions, probabilities, and feature values
```

Total inference time: ~30–60 seconds on first call (network-bound: fetching live data for ~20 drivers). Subsequent calls within 3 hours are served from cache in <1 ms.

---

## 10. Data Leakage Prevention

Leakage is the biggest validity risk in an ML sports prediction project. Every design decision was made to prevent it.

### What could leak (and how it was prevented)

| Potential leak | How prevented |
|---|---|
| Using actual race result as a feature | The target (`finish_position`) is only ever used as the label, never as an input feature |
| Using post-race championship points | Standings features use **end of previous season** (`season+1` shift trick) |
| Using same-season circuit data | `circuit_avg_finish` filters `season < current_season` strictly |
| Look-ahead in rolling form | `iloc[:i]` indexing means only rows before the current race are used |
| Test data in training | Strict year-based split: test set = 2024, never seen during training or model selection |
| Random k-fold on time series | Not used; temporal split only |
| 2023 validation leaking into final training | Final model trained on 2010–2023 combined, then tested on 2024. 2023 was only used for model **selection**, not hyperparameter tuning in a way that would overfit to it |

---

## 11. Limitations

These should be explicitly stated in any report or paper for academic integrity.

### Known limitations

1. **No qualifying data for future races.** When predicting a race that hasn't had qualifying yet, `grid_position` and `quali_position` fall back to championship standing position. This introduces noise for early-season predictions where the championship hasn't established itself.

2. **Previous-season standings instead of pre-round snapshots.** The standings features reflect the previous season's final result, not the current season's standings before this specific race. Ideally you would use pre-round snapshots, but this required ~20 API requests per season and caused rate-limiting. For mid-season predictions, current-season standings are used via the predict.py inference path.

3. **No weather, strategy, or tyre modelling.** Circuit weather conditions (rain, temperature), pit strategy decisions, and tyre compound selection are not included. These are major race outcome determinants.

4. **No safety car / incident modelling.** Safety car deployments fundamentally change race outcomes and are not predictable from pre-race data.

5. **Circuit-specific patterns averaged out.** The model treats circuits as a categorical dimension via driver-circuit history but does not encode circuit characteristics (lap length, number of corners, overtaking difficulty). Monaco and Monza are treated equivalently from a feature standpoint.

6. **Regulation change discontinuities.** Major regulation changes (2014 turbo-hybrid, 2022 ground effect) shift car performance rankings sharply. The model learns from the full 2010–2023 span, meaning pre-2022 data has different dynamics to post-2022 data.

7. **Sample size for circuit history.** Some driver-circuit combinations have very few historical appearances (e.g. a driver in only their second year who joined when a new circuit was added). The circuit features default to conservative mid-field values.

8. **Class imbalance in probability classifiers.** In the win classifier, class 1 (race win) appears in approximately 1 in 20 rows (~5%). This is handled implicitly by the Gradient Boosting classifier but is worth noting — calibration is especially important here.

9. **No driver-team synergy encoding.** A driver switching teams mid-season or joining a clearly faster car is not immediately captured — the model relies on the new constructor's historical form data.

---

## 12. File Reference

| File | Purpose | Key functions |
|---|---|---|
| `ml/data_collection.py` | Fetch raw data from Jolpica API | `collect_seasons()`, `fetch_season_results()`, `fetch_qualifying_results()`, `fetch_season_driver_standings()`, `fetch_season_constructor_standings()` |
| `ml/feature_engineering.py` | Build feature matrix from raw data | `build_feature_matrix()`, `build_rolling_driver_form()`, `build_rolling_constructor_form()`, `build_circuit_history()` |
| `ml/train_model.py` | Train, compare, evaluate, and save models | `train()`, `evaluate_regression()`, `top3_accuracy()`, `build_regression_pipeline()` |
| `ml/predict.py` | Inference — build features from live API + run model | `predict_race()`, `assemble_features()`, `compute_probabilities()`, `get_driver_standings()`, `get_circuit_history_for_driver()` |
| `ml/app.py` | Flask microservice wrapping predict.py | Routes: `/predict`, `/model-info`, `/health` |
| `ml/requirements.txt` | Python dependencies | — |
| `ml/data/raw_results.csv` | 6,432 driver-race records | — |
| `ml/data/raw_qualifying.csv` | 1,500 qualifying records | — |
| `ml/data/raw_driver_standings.csv` | 350 end-of-season driver standings | — |
| `ml/data/raw_constructor_standings.csv` | 159 end-of-season constructor standings | — |
| `ml/data/features.csv` | 6,432 × 27 engineered feature matrix | — |
| `ml/model/f1_prediction_model.pkl` | Serialised model bundle (joblib) | Keys: `regressor`, `podium_clf`, `win_clf`, `clf_imputer`, `features`, `target` |
| `ml/model/evaluation_report.json` | Full evaluation metrics JSON | — |
| `backend/services/predictionService.js` | Node.js bridge to Flask service | `predict()`, `getModelInfo()`, `checkMLHealth()` |
| `backend/controllers/predictionController.js` | Express controller | `getPrediction()`, `getMLModelInfo()`, `getMLHealth()` |
| `frontend/src/pages/Predictions.jsx` | React prediction UI | — |

---

## 13. Exact Hyperparameters

Complete record for reproducibility.

### Random Forest Regressor (final model)
```python
RandomForestRegressor(
    n_estimators    = 200,
    max_depth       = 12,
    min_samples_leaf= 5,
    max_features    = "sqrt",   # floor(sqrt(17)) = 4 features per split
    random_state    = 42,
    n_jobs          = -1,
)
```
Wrapped in: `Pipeline([SimpleImputer(strategy="median"), StandardScaler(), model])`

### Gradient Boosting Regressor (compared, not selected)
```python
GradientBoostingRegressor(
    n_estimators    = 300,
    max_depth       = 5,
    learning_rate   = 0.05,
    subsample       = 0.8,
    min_samples_leaf= 5,
    random_state    = 42,
)
```

### Win / Podium Classifiers (both identical architecture)
```python
CalibratedClassifierCV(
    estimator = GradientBoostingClassifier(
        n_estimators    = 200,
        max_depth       = 4,
        learning_rate   = 0.05,
        subsample       = 0.8,
        random_state    = 42,
    ),
    cv     = 3,
    method = "isotonic",
)
```
Preceded by: `SimpleImputer(strategy="median")` (separate from the regressor pipeline)

### Library versions
```
scikit-learn == 1.5.2
pandas       == 2.2.3
numpy        == 1.26.4
joblib       == 1.4.2
flask        == 3.0.3
flask-cors   == 5.0.0
requests     == 2.32.3
python       == 3.12.6
```

---

## 14. Suggested Framing for Report / Paper

### Possible title directions
- "Supervised Machine Learning for Formula 1 Race Outcome Prediction"
- "A Random Forest Approach to F1 Finishing Position Prediction with Temporal Validation"
- "Feature Engineering and ML-Based Prediction in Formula 1 Racing"

### Abstract bullet points
- Problem: Predict F1 race finishing positions from pre-race data
- Data: 6,432 driver-race records, 15 seasons (2010–2024), Jolpica/Ergast API
- Method: Random Forest Regressor with calibrated Gradient Boosting probability classifiers
- Key design: Temporal train/test split preventing data leakage
- Results: MAE 3.10 positions, R² 0.52, Win AUC 0.937 on held-out 2024 season
- Application: Integrated into a full-stack CMS web application (MERN + Flask)

### Related work to cite (for your own research)
- Bayesian approaches to motorsport prediction (formula racing literature)
- scikit-learn documentation for RandomForestRegressor and CalibratedClassifierCV
- Ergast/Jolpica API for F1 data access
- Breiman (2001) — "Random Forests" — the original RF paper
- Friedman (2001) — "Greedy Function Approximation: A Gradient Boosting Machine"
- Platt (1999) and isotonic regression calibration for classifier probability calibration
- General sports prediction ML literature (football, basketball outcome prediction)

### Sections your report/paper should cover
1. Introduction — why F1 prediction is an interesting ML problem
2. Related Work — existing approaches to motorsport outcome prediction
3. Dataset & Data Collection — Jolpica API, seasons, preprocessing choices
4. Feature Engineering — the 17 features, justification for each, leakage prevention
5. Methodology — temporal split, models considered, selection criterion
6. Results — all numbers in §8 above, feature importances
7. Discussion — what the model captures well, known limitations (§11)
8. Conclusion — practical value, future improvements (weather, real-time qualifying)
9. Implementation — brief description of the Flask microservice + MERN integration

### Honest framing
The model is legitimate and the methodology is sound. However, the appropriate framing is: *"a data-driven prediction system that captures historical performance patterns"*, not *"an AI that definitively predicts race winners"*. F1 has high inherent randomness from incidents and strategy. An R² of 0.52 and Win AUC of 0.937 are good results given the problem difficulty.

---

*Document generated from source code at commit `a7b1b9e`. All numbers verified against actual training output.*
