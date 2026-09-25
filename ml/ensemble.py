"""
ensemble.py
───────────
Ensemble regressor utilities for F1 prediction pipelines.
Provides a clean, scikit-learn-compatible wrapper for blending diverse models.
"""

import numpy as np


class BlendedRegressor:
    """
    Weighted linear blend of pre-configured regression estimators.
    Adheres to scikit-learn estimator interface: fit(X, y) and predict(X).
    """

    def __init__(self, estimators_with_weights: list[tuple[any, float]], name: str = "BlendedRegressor"):
        self.estimators_with_weights = estimators_with_weights
        self.name = name

    def fit(self, X, y):
        for est, _ in self.estimators_with_weights:
            est.fit(X, y)
        return self

    def predict(self, X):
        preds = np.zeros(len(X), dtype=float)
        total_weight = sum(w for _, w in self.estimators_with_weights)
        for est, weight in self.estimators_with_weights:
            preds += (weight / total_weight) * est.predict(X)
        return preds

    def get_params(self, deep=True):
        return {"estimators_with_weights": self.estimators_with_weights, "name": self.name}

    def set_params(self, **parameters):
        for parameter, value in parameters.items():
            setattr(self, parameter, value)
        return self
