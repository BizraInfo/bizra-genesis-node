"""SynapticProber
Identifies dormant neural regions via token probability analysis and attention statistics.
Integrates with synaptic_optimizer_refactored.py and bizra-dashboard/src/lib/synaptic-bridge.js.

Contracts:
- analyze_logits(logits: List[List[float]]) -> Dict
- select_tokens_by_threshold(probs: List[float], threshold: float=0.01) -> List[int]
- rare_path_report(...) -> Dict[str, Any]

Performance target: <100ms for 2K tokens on MSI i9-14900HX
"""
from __future__ import annotations
from typing import List, Dict, Any, Tuple
import numpy as np

class SynapticProber:
    def analyze_logits(self, logits: List[List[float]]) -> Dict[str, Any]:
        """Return rarity scores per token and attention-slot summaries."""
        arr = np.asarray(logits, dtype=np.float32)
        # Softmax in a numerically safe way
        maxes = arr.max(axis=1, keepdims=True)
        probs = np.exp(arr - maxes) / np.exp(arr - maxes).sum(axis=1, keepdims=True)
        top_p = probs.max(axis=1)
        rare_mask = top_p < 0.01
        return {
            "top_p": top_p.tolist(),
            "rare_mask": rare_mask.tolist(),
            "rare_ratio": float(rare_mask.mean())
        }

    def select_tokens_by_threshold(self, probs: List[float], threshold: float=0.01) -> List[int]:
        return [i for i, p in enumerate(probs) if p < threshold]

    def rare_path_report(self, logits: List[List[float]], threshold: float=0.01) -> Dict[str, Any]:
        info = self.analyze_logits(logits)
        rare_idx = self.select_tokens_by_threshold(info["top_p"], threshold)
        return {"rare_token_indices": rare_idx, "stats": info}
