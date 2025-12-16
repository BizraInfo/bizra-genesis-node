"""
Ihsān Vector — The 8-Dimensional Ethical Scoring System
========================================================
From the Blueprint:
  I_vec = Σ(w_i × d_i) where Σw_i = 1.0 and target I_vec ≥ 0.95

Dimensions and Weights:
  1. Correctness (0.22) — Factual accuracy, logical validity
  2. Safety (0.22) — No harm, secure execution
  3. User Benefit (0.14) — Genuine value delivered
  4. Efficiency (0.12) — Token efficiency, resource optimization
  5. Auditability (0.12) — Traceable, explainable actions
  6. Anti-Centralization (0.08) — Gini < 0.35, distributed
  7. Robustness (0.06) — Resilient to adversarial inputs
  8. Adl/Fairness (0.04) — Just, unbiased outcomes
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Optional
import json
import hashlib
from datetime import datetime


class IhsanDimension(Enum):
    """The 8 dimensions of the Ihsān Vector."""
    CORRECTNESS = "correctness"
    SAFETY = "safety"
    USER_BENEFIT = "user_benefit"
    EFFICIENCY = "efficiency"
    AUDITABILITY = "auditability"
    ANTI_CENTRALIZATION = "anti_centralization"
    ROBUSTNESS = "robustness"
    ADL_FAIRNESS = "adl_fairness"


# Weights from the Blueprint (sum = 1.0)
IHSAN_WEIGHTS: Dict[IhsanDimension, float] = {
    IhsanDimension.CORRECTNESS: 0.22,
    IhsanDimension.SAFETY: 0.22,
    IhsanDimension.USER_BENEFIT: 0.14,
    IhsanDimension.EFFICIENCY: 0.12,
    IhsanDimension.AUDITABILITY: 0.12,
    IhsanDimension.ANTI_CENTRALIZATION: 0.08,
    IhsanDimension.ROBUSTNESS: 0.06,
    IhsanDimension.ADL_FAIRNESS: 0.04,
}

# Threshold for passing Ihsān gate
IHSAN_THRESHOLD = 0.95


@dataclass
class IhsanVector:
    """
    The Ihsān Vector — composite ethical score for any action.
    
    Each dimension is scored 0.0-1.0, weighted, and combined.
    Actions with I_vec < 0.95 are escalated to FATE protocol.
    """
    
    scores: Dict[IhsanDimension, float] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    context: str = ""
    
    def __post_init__(self):
        # Initialize all dimensions to 1.0 (perfect) by default
        for dim in IhsanDimension:
            if dim not in self.scores:
                self.scores[dim] = 1.0
    
    @property
    def composite_score(self) -> float:
        """Calculate weighted composite Ihsān score."""
        return sum(
            IHSAN_WEIGHTS[dim] * self.scores.get(dim, 0.0)
            for dim in IhsanDimension
        )
    
    @property
    def passes_threshold(self) -> bool:
        """Check if composite score meets Ihsān threshold."""
        return self.composite_score >= IHSAN_THRESHOLD
    
    @property
    def failing_dimensions(self) -> Dict[IhsanDimension, float]:
        """Return dimensions that are dragging down the score."""
        return {
            dim: score
            for dim, score in self.scores.items()
            if score < 0.95
        }
    
    def set_score(self, dimension: IhsanDimension, score: float) -> "IhsanVector":
        """Set a dimension score (fluent interface)."""
        self.scores[dimension] = max(0.0, min(1.0, score))
        return self
    
    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            "scores": {dim.value: score for dim, score in self.scores.items()},
            "composite_score": self.composite_score,
            "passes_threshold": self.passes_threshold,
            "threshold": IHSAN_THRESHOLD,
            "timestamp": self.timestamp,
            "context": self.context,
        }
    
    def to_json(self) -> str:
        """Serialize to JSON."""
        return json.dumps(self.to_dict(), indent=2)
    
    def hash(self) -> str:
        """Create deterministic hash of the vector state."""
        canonical = json.dumps(
            {dim.value: self.scores[dim] for dim in IhsanDimension},
            sort_keys=True
        )
        return hashlib.sha256(canonical.encode()).hexdigest()[:16]
    
    @classmethod
    def from_agent_response(
        cls,
        response: str,
        latency_ms: int,
        token_count: int,
        rag_used: bool = False,
        agent_role: str = "",
    ) -> "IhsanVector":
        """
        Create an Ihsān Vector from an agent response.
        
        This is a heuristic scorer — in production, each dimension
        would have dedicated verification modules.
        """
        vec = cls(context=f"agent_response:{agent_role}")
        
        # Correctness: Heuristic based on response structure
        # (In production: verify against knowledge graph)
        has_structure = any(marker in response for marker in ["1.", "- ", "##", "```"])
        vec.scores[IhsanDimension.CORRECTNESS] = 0.95 if has_structure else 0.85
        
        # Safety: Check for harmful patterns
        # (In production: dedicated ThreatDetectionModule)
        unsafe_patterns = ["sudo rm", "DROP TABLE", "exec(", "eval("]
        is_safe = not any(p in response for p in unsafe_patterns)
        vec.scores[IhsanDimension.SAFETY] = 1.0 if is_safe else 0.0
        
        # User Benefit: Heuristic based on response length and substance
        # (In production: user feedback + outcome tracking)
        word_count = len(response.split())
        vec.scores[IhsanDimension.USER_BENEFIT] = min(1.0, 0.7 + (word_count / 500) * 0.3)
        
        # Efficiency: Token efficiency score
        # (In production: useful_tokens / total_tokens from SNR tracker)
        if token_count > 0:
            efficiency = min(1.0, 1000 / max(token_count, 1))
        else:
            efficiency = 0.9 if latency_ms < 2000 else 0.7
        vec.scores[IhsanDimension.EFFICIENCY] = efficiency
        
        # Auditability: RAG grounding improves auditability
        vec.scores[IhsanDimension.AUDITABILITY] = 1.0 if rag_used else 0.85
        
        # Anti-Centralization: Local inference is maximally decentralized
        vec.scores[IhsanDimension.ANTI_CENTRALIZATION] = 1.0
        
        # Robustness: Heuristic based on response consistency
        # (In production: adversarial probe results)
        vec.scores[IhsanDimension.ROBUSTNESS] = 0.95
        
        # Adl/Fairness: Assume fair unless detected otherwise
        # (In production: bias detection module)
        vec.scores[IhsanDimension.ADL_FAIRNESS] = 0.98
        
        return vec
    
    def __repr__(self) -> str:
        status = "✅ PASS" if self.passes_threshold else "❌ FAIL"
        return f"IhsanVector({self.composite_score:.3f} {status})"


def calculate_poi_multiplier(ihsan_score: float, gini_coefficient: float) -> float:
    """
    Calculate PoI multiplier from Ihsān score and decentralization metric.
    
    From Blueprint:
    PoI_Multiplier = NetworkMultiplier(Ihsān, Decentralization)
    """
    # Gini < 0.35 is target; penalize centralization
    decentralization_factor = max(0.0, 1.0 - (gini_coefficient / 0.5))
    
    # Ihsān must be >= 0.95 for full multiplier
    ihsan_factor = min(1.0, ihsan_score / 0.95)
    
    return ihsan_factor * decentralization_factor
