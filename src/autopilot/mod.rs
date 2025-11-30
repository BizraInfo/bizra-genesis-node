//! ╔═══════════════════════════════════════════════════════════════════════════╗
//! ║  BIZRA GENESIS NODE - AUTOPILOT MODULE                                   ║
//! ║  γ-12 Alerts & Autopilot Hooks                                           ║
//! ║  Automated responses to SLO state changes                                ║
//! ╚═══════════════════════════════════════════════════════════════════════════╝
//!
//! This module provides the autopilot decision framework for Genesis Node.
//! It monitors SLO state transitions and can trigger automated responses.
//!
//! Current capabilities:
//! - SLO state transition detection
//! - Structured logging of state changes
//! - Hook points for future automation (safe-mode, throttling, circuit breaking)
//!
//! See docs/SLO_FLIGHT_RULES_GENESIS_NODE.md for the specification.

use crate::api::telemetry::{SloState, SloStatus};
use std::sync::Mutex;
use tracing::{error, info, warn};

// ═══════════════════════════════════════════════════════════════════════════
// AUTOPILOT ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/// Actions that the autopilot can decide to take based on SLO state
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AutopilotAction {
    /// No action required - system healthy or already handled
    None,

    /// Log a warning - operator should review
    LogWarning,

    /// Enter safe-mode - reduce system load and protect integrity
    EnterSafeMode,

    /// Throttle non-critical work - shed optional load
    ThrottleNonCritical,

    /// Open circuit breaker - stop accepting new requests temporarily
    OpenCircuitBreaker,
}

impl std::fmt::Display for AutopilotAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AutopilotAction::None => write!(f, "NONE"),
            AutopilotAction::LogWarning => write!(f, "LOG_WARNING"),
            AutopilotAction::EnterSafeMode => write!(f, "ENTER_SAFE_MODE"),
            AutopilotAction::ThrottleNonCritical => write!(f, "THROTTLE_NON_CRITICAL"),
            AutopilotAction::OpenCircuitBreaker => write!(f, "OPEN_CIRCUIT_BREAKER"),
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTOPILOT DECISION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/// Determine what autopilot action to take based on SLO state transition
///
/// This function implements the core decision logic for automated responses.
/// It considers both the previous state and the current state to determine
/// the appropriate action.
///
/// # Arguments
/// * `prev` - Previous SLO overall state (None if first evaluation)
/// * `current` - Current SLO status
///
/// # Returns
/// The recommended autopilot action
pub fn decide_autopilot_action(prev: Option<SloState>, current: &SloStatus) -> AutopilotAction {
    let prev_state = prev.unwrap_or(SloState::Healthy);
    let now = current.overall;

    // No transition - no action needed
    if prev_state == now {
        return AutopilotAction::None;
    }

    // Recovery - state improved, no negative action needed
    if state_severity(now) < state_severity(prev_state) {
        return AutopilotAction::None;
    }

    // Determine action based on transition
    match (prev_state, now) {
        // HEALTHY → WARNING: Log and monitor
        (SloState::Healthy, SloState::Warning) => AutopilotAction::LogWarning,

        // HEALTHY → CRITICAL: Immediate safe-mode
        (SloState::Healthy, SloState::Critical) => AutopilotAction::EnterSafeMode,

        // WARNING → CRITICAL: Enter safe-mode
        (SloState::Warning, SloState::Critical) => AutopilotAction::EnterSafeMode,

        // Any other transition (shouldn't happen with current logic)
        _ => AutopilotAction::None,
    }
}

/// Get the severity level of an SLO state (higher = worse)
fn state_severity(state: SloState) -> u8 {
    match state {
        SloState::Healthy => 0,
        SloState::Warning => 1,
        SloState::Critical => 2,
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTOPILOT EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════

/// Autopilot state tracker and executor
#[derive(Default)]
pub struct Autopilot {
    /// Last known SLO state
    last_state: Mutex<Option<SloState>>,
    /// Whether safe-mode is currently active
    safe_mode_active: Mutex<bool>,
}

impl Autopilot {
    /// Create a new autopilot instance
    pub fn new() -> Self {
        Self {
            last_state: Mutex::new(None),
            safe_mode_active: Mutex::new(false),
        }
    }

    /// Process a new SLO status and execute any required actions
    ///
    /// This is the main entry point for the autopilot. Call this whenever
    /// a new SLO evaluation is performed.
    ///
    /// # Arguments
    /// * `status` - Current SLO status from evaluate_slo()
    ///
    /// # Returns
    /// The action that was decided (and executed if applicable)
    pub fn process(&self, status: &SloStatus) -> AutopilotAction {
        // Get previous state
        let prev = {
            let guard = self.last_state.lock().unwrap();
            *guard
        };

        // Decide action
        let action = decide_autopilot_action(prev, status);

        // Update state
        {
            let mut guard = self.last_state.lock().unwrap();
            *guard = Some(status.overall);
        }

        // Execute action
        self.execute_action(action, status);

        action
    }

    /// Execute the decided autopilot action
    fn execute_action(&self, action: AutopilotAction, status: &SloStatus) {
        match action {
            AutopilotAction::None => {
                // No action needed
            }

            AutopilotAction::LogWarning => {
                let failing_checks: Vec<&str> = status
                    .checks
                    .iter()
                    .filter(|c| c.state != SloState::Healthy)
                    .map(|c| c.name.as_str())
                    .collect();

                warn!(
                    target: "autopilot",
                    slo_state = "WARNING",
                    failing_checks = ?failing_checks,
                    message = "SLO entered WARNING state - operator review recommended"
                );
            }

            AutopilotAction::EnterSafeMode => {
                let mut safe_mode = self.safe_mode_active.lock().unwrap();

                if !*safe_mode {
                    *safe_mode = true;

                    let failing_checks: Vec<&str> = status
                        .checks
                        .iter()
                        .filter(|c| c.state == SloState::Critical)
                        .map(|c| c.name.as_str())
                        .collect();

                    error!(
                        target: "autopilot",
                        slo_state = "CRITICAL",
                        failing_checks = ?failing_checks,
                        action = "SAFE_MODE_ACTIVATED",
                        message = "SLO CRITICAL - SAFE MODE ACTIVATED"
                    );

                    // TODO: Implement actual safe-mode behavior:
                    // - Reduce concurrency limits
                    // - Disable non-essential background tasks
                    // - Increase timeout margins
                    // - Switch to conservative model routing
                }
            }

            AutopilotAction::ThrottleNonCritical => {
                warn!(
                    target: "autopilot",
                    action = "THROTTLE_NON_CRITICAL",
                    message = "Throttling non-critical workloads"
                );
                // TODO: Implement throttling logic
            }

            AutopilotAction::OpenCircuitBreaker => {
                error!(
                    target: "autopilot",
                    action = "OPEN_CIRCUIT_BREAKER",
                    message = "Opening circuit breaker"
                );
                // TODO: Implement circuit breaker integration
            }
        }
    }

    /// Check if safe-mode is currently active
    pub fn is_safe_mode_active(&self) -> bool {
        *self.safe_mode_active.lock().unwrap()
    }

    /// Manually exit safe-mode (should only be done after SLO recovery)
    pub fn exit_safe_mode(&self) {
        let mut safe_mode = self.safe_mode_active.lock().unwrap();
        if *safe_mode {
            *safe_mode = false;
            info!(
                target: "autopilot",
                action = "SAFE_MODE_DEACTIVATED",
                message = "Safe mode deactivated - returning to normal operation"
            );
        }
    }

    /// Get the last known SLO state
    pub fn last_slo_state(&self) -> Option<SloState> {
        *self.last_state.lock().unwrap()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::telemetry::SloCheck;
    use chrono::Utc;

    fn create_test_status(overall: SloState) -> SloStatus {
        SloStatus {
            overall,
            timestamp: Utc::now(),
            checks: vec![SloCheck {
                name: "IHSAN".to_string(),
                description: "Test".to_string(),
                target: 0.90,
                actual: 0.95,
                state: overall,
                unit: None,
            }],
        }
    }

    #[test]
    fn test_no_action_on_same_state() {
        let status = create_test_status(SloState::Healthy);
        let action = decide_autopilot_action(Some(SloState::Healthy), &status);
        assert_eq!(action, AutopilotAction::None);
    }

    #[test]
    fn test_log_warning_on_healthy_to_warning() {
        let status = create_test_status(SloState::Warning);
        let action = decide_autopilot_action(Some(SloState::Healthy), &status);
        assert_eq!(action, AutopilotAction::LogWarning);
    }

    #[test]
    fn test_safe_mode_on_healthy_to_critical() {
        let status = create_test_status(SloState::Critical);
        let action = decide_autopilot_action(Some(SloState::Healthy), &status);
        assert_eq!(action, AutopilotAction::EnterSafeMode);
    }

    #[test]
    fn test_safe_mode_on_warning_to_critical() {
        let status = create_test_status(SloState::Critical);
        let action = decide_autopilot_action(Some(SloState::Warning), &status);
        assert_eq!(action, AutopilotAction::EnterSafeMode);
    }

    #[test]
    fn test_no_action_on_recovery() {
        let status = create_test_status(SloState::Healthy);
        let action = decide_autopilot_action(Some(SloState::Critical), &status);
        assert_eq!(action, AutopilotAction::None);
    }

    #[test]
    fn test_autopilot_state_tracking() {
        let autopilot = Autopilot::new();

        // First evaluation - should be None (no previous state)
        let status = create_test_status(SloState::Healthy);
        let action = autopilot.process(&status);
        assert_eq!(action, AutopilotAction::None);
        assert_eq!(autopilot.last_slo_state(), Some(SloState::Healthy));

        // Transition to warning
        let status = create_test_status(SloState::Warning);
        let action = autopilot.process(&status);
        assert_eq!(action, AutopilotAction::LogWarning);
        assert_eq!(autopilot.last_slo_state(), Some(SloState::Warning));

        // Transition to critical
        let status = create_test_status(SloState::Critical);
        let action = autopilot.process(&status);
        assert_eq!(action, AutopilotAction::EnterSafeMode);
        assert!(autopilot.is_safe_mode_active());

        // Recovery
        let status = create_test_status(SloState::Healthy);
        let action = autopilot.process(&status);
        assert_eq!(action, AutopilotAction::None);
        // Safe mode remains active until manual exit
        assert!(autopilot.is_safe_mode_active());

        // Manual exit
        autopilot.exit_safe_mode();
        assert!(!autopilot.is_safe_mode_active());
    }
}
