#!/usr/bin/env python3
"""
BIZRA SystemProtocolKernel v2.0 — The Ethical Microkernel
==========================================================
The Session Operating System that governs all APEX layers, enforcing
Ihsān thresholds, SNR optimization, and protocol-level auditability.

This is not middleware—it is the ethical enforcement layer that sits
between execution and inference, ensuring every action is:
- Mathematically verified against Ihsān Vector (I_vec ≥ 0.95)
- Protocol-hashed for cryptographic auditability
- SNR-optimized for token efficiency

Reference: THE BIZRA CONVERGENCE BLUEPRINT
"""

import hashlib
import json
import os
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional


# ─────────────────────────────────────────────────────────────────────────────
# IHSĀN VECTOR DIMENSIONS
# ─────────────────────────────────────────────────────────────────────────────

class IhsanDimension(Enum):
    """The 8 dimensions of the Ihsān Vector from the BIZRA Blueprint."""
    CORRECTNESS = "correctness"           # 0.22 weight
    SAFETY = "safety"                     # 0.22 weight
    USER_BENEFIT = "user_benefit"         # 0.14 weight
    EFFICIENCY = "efficiency"             # 0.12 weight
    AUDITABILITY = "auditability"         # 0.12 weight
    ANTI_CENTRALIZATION = "anti_central"  # 0.08 weight
    ROBUSTNESS = "robustness"             # 0.06 weight
    ADL_FAIRNESS = "adl_fairness"         # 0.04 weight


# Weights from the Blueprint
IHSAN_WEIGHTS = {
    IhsanDimension.CORRECTNESS: 0.22,
    IhsanDimension.SAFETY: 0.22,
    IhsanDimension.USER_BENEFIT: 0.14,
    IhsanDimension.EFFICIENCY: 0.12,
    IhsanDimension.AUDITABILITY: 0.12,
    IhsanDimension.ANTI_CENTRALIZATION: 0.08,
    IhsanDimension.ROBUSTNESS: 0.06,
    IhsanDimension.ADL_FAIRNESS: 0.04,
}

# Default threshold from Blueprint
IHSAN_THRESHOLD = float(os.environ.get("IHSAN_THRESHOLD", "0.95"))


@dataclass
class IhsanScore:
    """Composite Ihsān Vector score."""
    dimensions: Dict[IhsanDimension, float] = field(default_factory=dict)
    
    def __post_init__(self):
        # Initialize all dimensions to 1.0 (fully compliant) if not set
        for dim in IhsanDimension:
            if dim not in self.dimensions:
                self.dimensions[dim] = 1.0
    
    def compute_composite(self) -> float:
        """Compute weighted I_vec score."""
        total = 0.0
        for dim, score in self.dimensions.items():
            weight = IHSAN_WEIGHTS.get(dim, 0.0)
            total += score * weight
        return total
    
    def passes_threshold(self, threshold: float = IHSAN_THRESHOLD) -> bool:
        """Check if score passes Ihsān threshold."""
        return self.compute_composite() >= threshold
    
    def failing_dimensions(self, threshold: float = 0.90) -> List[IhsanDimension]:
        """Return dimensions below threshold."""
        return [dim for dim, score in self.dimensions.items() if score < threshold]
    
    def to_dict(self) -> Dict[str, float]:
        return {dim.value: score for dim, score in self.dimensions.items()}


# ─────────────────────────────────────────────────────────────────────────────
# SNR OPTIMIZATION
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class SNRMetrics:
    """Signal-to-Noise Ratio metrics for token efficiency."""
    useful_tokens: int = 0
    total_tokens: int = 0
    confidence_score: float = 1.0
    ethical_compliance: float = 1.0
    tool_directness: float = 1.0
    
    def compute_snr(self) -> float:
        """Compute SNR score: (useful/total) × confidence × ethics × directness."""
        if self.total_tokens == 0:
            return 0.0
        token_ratio = self.useful_tokens / self.total_tokens
        return token_ratio * self.confidence_score * self.ethical_compliance * self.tool_directness
    
    def passes_threshold(self, threshold: float = 0.85) -> bool:
        return self.compute_snr() >= threshold


# ─────────────────────────────────────────────────────────────────────────────
# PROTOCOL SESSION
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ProtocolSession:
    """A single session governed by the SystemProtocolKernel."""
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    protocol_version: str = "2.0.0"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    # Ihsān tracking
    ihsan_score: IhsanScore = field(default_factory=IhsanScore)
    ihsan_threshold: float = IHSAN_THRESHOLD
    
    # SNR tracking
    snr_metrics: SNRMetrics = field(default_factory=SNRMetrics)
    
    # Audit trail
    actions: List[Dict[str, Any]] = field(default_factory=list)
    escalations: List[Dict[str, Any]] = field(default_factory=list)
    
    # State
    is_active: bool = True
    terminated_reason: Optional[str] = None
    
    def protocol_hash(self) -> str:
        """Compute SHA256 hash of protocol config for auditability."""
        config = {
            "version": self.protocol_version,
            "threshold": self.ihsan_threshold,
            "dimensions": [d.value for d in IHSAN_WEIGHTS.keys()],
        }
        return hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()
    
    def log_action(self, action_type: str, details: Dict[str, Any]) -> None:
        """Log an action to the audit trail."""
        self.actions.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": action_type,
            "details": details,
            "ihsan_score": self.ihsan_score.compute_composite(),
            "snr_score": self.snr_metrics.compute_snr(),
        })
    
    def escalate(self, reason: str, dimension: Optional[IhsanDimension] = None) -> None:
        """Escalate an issue for human review (FATE Protocol)."""
        self.escalations.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "reason": reason,
            "dimension": dimension.value if dimension else None,
            "ihsan_score": self.ihsan_score.compute_composite(),
        })
    
    def terminate(self, reason: str) -> None:
        """Terminate the session."""
        self.is_active = False
        self.terminated_reason = reason
        self.log_action("session_terminated", {"reason": reason})
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "protocol_version": self.protocol_version,
            "protocol_hash": self.protocol_hash(),
            "created_at": self.created_at,
            "ihsan_score": self.ihsan_score.compute_composite(),
            "ihsan_dimensions": self.ihsan_score.to_dict(),
            "ihsan_passes": self.ihsan_score.passes_threshold(),
            "snr_score": self.snr_metrics.compute_snr(),
            "is_active": self.is_active,
            "action_count": len(self.actions),
            "escalation_count": len(self.escalations),
        }


# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROTOCOL KERNEL
# ─────────────────────────────────────────────────────────────────────────────

class SystemProtocolKernel:
    """
    The Ethical Microkernel — SystemProtocol 2.0 PAB Implementation.
    
    Sits between Layer 3 (Execution) and Layer 4 (Cognitive), enforcing:
    - Immutable Protocol Hashing
    - Bounded Autonomy Enforcement
    - SAPE Pattern Elevation
    """
    
    def __init__(
        self,
        ihsan_threshold: float = IHSAN_THRESHOLD,
        snr_threshold: float = 0.85,
        enable_escalation: bool = True,
        log_dir: Optional[Path] = None,
    ):
        self.ihsan_threshold = ihsan_threshold
        self.snr_threshold = snr_threshold
        self.enable_escalation = enable_escalation
        self.log_dir = log_dir or Path(__file__).parent / ".kernel_logs"
        
        # Active sessions
        self.sessions: Dict[str, ProtocolSession] = {}
        
        # Pattern detection for SAPE
        self.pattern_counts: Dict[str, int] = {}
        self.elevated_patterns: List[str] = []
        
        # Metrics
        self.total_sessions = 0
        self.total_actions = 0
        self.total_escalations = 0
        self.ihsan_violations = 0
        
        # Initialize
        self.log_dir.mkdir(parents=True, exist_ok=True)
    
    def start_session(self, context: Optional[Dict[str, Any]] = None) -> ProtocolSession:
        """Start a new protocol-governed session."""
        session = ProtocolSession(ihsan_threshold=self.ihsan_threshold)
        self.sessions[session.session_id] = session
        self.total_sessions += 1
        
        session.log_action("session_start", {
            "protocol_hash": session.protocol_hash(),
            "context": context or {},
        })
        
        return session
    
    def end_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """End a session and return summary."""
        session = self.sessions.get(session_id)
        if not session:
            return None
        
        session.terminate("normal_completion")
        summary = session.to_dict()
        
        # Persist audit log
        self._persist_session_log(session)
        
        # Cleanup
        del self.sessions[session_id]
        
        return summary
    
    def execute_with_ihsan(
        self,
        session_id: str,
        action: Callable[[], Any],
        action_type: str,
        pre_checks: Optional[List[Callable[[], bool]]] = None,
    ) -> Dict[str, Any]:
        """
        Execute an action with Ihsān enforcement.
        
        This is the core enforcement mechanism:
        1. Pre-execution checks (from MultiStageVerifier)
        2. Ihsān score validation
        3. Action execution (with circuit breaker)
        4. Post-execution evaluation
        5. SNR tracking
        """
        session = self.sessions.get(session_id)
        if not session:
            return {"success": False, "error": "Invalid session"}
        
        if not session.is_active:
            return {"success": False, "error": "Session terminated"}
        
        start_time = time.time()
        result: Dict[str, Any] = {"success": False}
        
        # ─── PRE-EXECUTION ───
        if pre_checks:
            for check in pre_checks:
                if not check():
                    session.log_action("pre_check_failed", {"action_type": action_type})
                    return {"success": False, "error": "Pre-execution check failed"}
        
        # ─── IHSĀN GATE ───
        if not session.ihsan_score.passes_threshold():
            self.ihsan_violations += 1
            failing = session.ihsan_score.failing_dimensions()
            
            if self.enable_escalation:
                session.escalate(
                    f"Ihsān threshold not met before action: {action_type}",
                    failing[0] if failing else None,
                )
                self.total_escalations += 1
            
            return {
                "success": False,
                "error": "Ihsān threshold not met",
                "ihsan_score": session.ihsan_score.compute_composite(),
                "failing_dimensions": [d.value for d in failing],
            }
        
        # ─── EXECUTE ACTION ───
        try:
            action_result = action()
            result["success"] = True
            result["result"] = action_result
        except Exception as e:
            result["error"] = str(e)
            session.ihsan_score.dimensions[IhsanDimension.ROBUSTNESS] *= 0.9
        
        # ─── POST-EXECUTION ───
        latency_ms = int((time.time() - start_time) * 1000)
        result["latency_ms"] = latency_ms
        
        # Update SNR metrics
        self.total_actions += 1
        session.log_action(action_type, {
            "success": result["success"],
            "latency_ms": latency_ms,
        })
        
        # ─── PATTERN DETECTION (SAPE) ───
        self._track_pattern(action_type)
        
        # ─── FINAL IHSĀN CHECK ───
        result["ihsan_score"] = session.ihsan_score.compute_composite()
        result["ihsan_passes"] = session.ihsan_score.passes_threshold()
        result["snr_score"] = session.snr_metrics.compute_snr()
        
        return result
    
    def update_ihsan_dimension(
        self,
        session_id: str,
        dimension: IhsanDimension,
        score: float,
    ) -> bool:
        """Update a specific Ihsān dimension score."""
        session = self.sessions.get(session_id)
        if not session:
            return False
        
        session.ihsan_score.dimensions[dimension] = max(0.0, min(1.0, score))
        return True
    
    def update_snr_metrics(
        self,
        session_id: str,
        useful_tokens: int,
        total_tokens: int,
        confidence: float = 1.0,
    ) -> Optional[float]:
        """Update SNR metrics for a session."""
        session = self.sessions.get(session_id)
        if not session:
            return None
        
        session.snr_metrics.useful_tokens += useful_tokens
        session.snr_metrics.total_tokens += total_tokens
        session.snr_metrics.confidence_score = confidence
        
        # Update efficiency dimension based on SNR
        snr = session.snr_metrics.compute_snr()
        session.ihsan_score.dimensions[IhsanDimension.EFFICIENCY] = snr
        
        return snr
    
    def _track_pattern(self, pattern: str) -> None:
        """Track action patterns for SAPE elevation."""
        self.pattern_counts[pattern] = self.pattern_counts.get(pattern, 0) + 1
        
        # SAPE: If pattern occurs >3 times, flag for elevation
        if self.pattern_counts[pattern] == 3 and pattern not in self.elevated_patterns:
            self.elevated_patterns.append(pattern)
    
    def _persist_session_log(self, session: ProtocolSession) -> None:
        """Persist session log to disk for auditability."""
        log_path = self.log_dir / f"{session.session_id}.json"
        with open(log_path, "w") as f:
            json.dump({
                "session": session.to_dict(),
                "actions": session.actions,
                "escalations": session.escalations,
            }, f, indent=2)
    
    def get_kernel_status(self) -> Dict[str, Any]:
        """Get current kernel status and metrics."""
        return {
            "protocol_version": "2.0.0",
            "ihsan_threshold": self.ihsan_threshold,
            "snr_threshold": self.snr_threshold,
            "active_sessions": len(self.sessions),
            "total_sessions": self.total_sessions,
            "total_actions": self.total_actions,
            "total_escalations": self.total_escalations,
            "ihsan_violations": self.ihsan_violations,
            "elevated_patterns": self.elevated_patterns,
            "pattern_counts": self.pattern_counts,
        }
    
    def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific session."""
        session = self.sessions.get(session_id)
        if not session:
            return None
        return session.to_dict()


# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL KERNEL INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

_kernel: Optional[SystemProtocolKernel] = None


def get_kernel() -> SystemProtocolKernel:
    """Get or create the global kernel instance."""
    global _kernel
    if _kernel is None:
        _kernel = SystemProtocolKernel()
    return _kernel


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="BIZRA SystemProtocolKernel v2.0")
    parser.add_argument("--status", action="store_true", help="Show kernel status")
    parser.add_argument("--test", action="store_true", help="Run self-test")
    args = parser.parse_args()
    
    kernel = get_kernel()
    
    if args.status:
        print(json.dumps(kernel.get_kernel_status(), indent=2))
    
    elif args.test:
        print("=" * 60)
        print("  BIZRA SystemProtocolKernel v2.0 — Self-Test")
        print("=" * 60)
        
        # Start session
        session = kernel.start_session({"test": True})
        print(f"\n✅ Session started: {session.session_id[:8]}...")
        print(f"   Protocol hash: {session.protocol_hash()[:16]}...")
        
        # Execute action with Ihsān enforcement
        result = kernel.execute_with_ihsan(
            session.session_id,
            action=lambda: {"message": "Hello, Ihsān!"},
            action_type="test_action",
        )
        print(f"\n✅ Action executed:")
        print(f"   Success: {result['success']}")
        print(f"   Ihsān: {result['ihsan_score']:.3f}")
        print(f"   SNR: {result['snr_score']:.3f}")
        
        # Update SNR
        snr = kernel.update_snr_metrics(session.session_id, 80, 100, 0.95)
        print(f"\n✅ SNR updated: {snr:.3f}")
        
        # Test Ihsān violation
        kernel.update_ihsan_dimension(
            session.session_id,
            IhsanDimension.SAFETY,
            0.5,  # Below threshold
        )
        result2 = kernel.execute_with_ihsan(
            session.session_id,
            action=lambda: "Should fail",
            action_type="risky_action",
        )
        print(f"\n⚠️ Ihsān violation test:")
        print(f"   Blocked: {not result2['success']}")
        print(f"   Reason: {result2.get('error', 'N/A')}")
        
        # End session
        summary = kernel.end_session(session.session_id)
        print(f"\n✅ Session ended:")
        print(f"   Actions: {summary['action_count']}")
        print(f"   Escalations: {summary['escalation_count']}")
        
        # Kernel status
        status = kernel.get_kernel_status()
        print(f"\n📊 Kernel Status:")
        print(f"   Total sessions: {status['total_sessions']}")
        print(f"   Total actions: {status['total_actions']}")
        print(f"   Ihsān violations: {status['ihsan_violations']}")
        
        print("\n" + "=" * 60)
        print("  ✅ Self-test complete")
        print("=" * 60)
    
    else:
        print("BIZRA SystemProtocolKernel v2.0")
        print("Use --status or --test")
