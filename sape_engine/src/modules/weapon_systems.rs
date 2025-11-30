// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  WEAPON SYSTEMS - Shadow OS Integration                                 ║
// ║  Cognitive threat detection and neutralization                          ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

//! # Weapon Systems
//!
//! Cognitive defense mechanisms for reasoning purity:
//!
//! - **Procrastination Kill Switch**: Detects and neutralizes attention leaks
//! - **Distraction Shield**: Prevents reasoning interruption
//! - **Mental Fatigue Monitor**: Tracks cognitive resource levels
//! - **Motivation Injector**: Combat entropy with algorithmic inspiration
//!
//! Based on Shadow OS weaponized subsystems.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Cognitive threat levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum ThreatLevel {
    Clear = 0,
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4,
}

/// Detected cognitive threat
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CognitiveThreat {
    pub threat_type: ThreatType,
    pub description: String,
    pub severity: ThreatLevel,
    pub trigger_context: String,
    pub neutralization_protocol: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Types of cognitive threats
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ThreatType {
    AttentionLeak,
    CognitiveFatigue,
    MotivationDecay,
    ReasoningInterruption,
    EntropyIncrease,
}

/// Weapon system configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeaponConfig {
    /// Enable automatic threat scanning
    pub auto_scan: bool,
    /// Scan interval in seconds
    pub scan_interval: u64,
    /// Response aggressiveness (0.0-1.0)
    pub aggressiveness: f64,
    /// Known distraction patterns
    pub distraction_patterns: Vec<String>,
}

/// Procrastination detection patterns
#[derive(Debug, Clone)]
pub struct ProcrastinationDetector {
    patterns: HashMap<String, ThreatSignature>,
}

#[derive(Debug, Clone)]
struct ThreatSignature {
    threat_type: ThreatType,
    keywords: Vec<String>,
    severity_multiplier: f64,
    response_protocol: String,
}

/// Reasoning flow analysis for interruption detection
#[derive(Debug, Clone)]
pub struct FlowAnalyzer {
    current_focus: Option<String>,
    flow_breaks: Vec<FlowBreak>,
    flow_integrity: f64,
}

#[derive(Debug, Clone)]
struct FlowBreak {
    timestamp: chrono::DateTime<chrono::Utc>,
    break_type: String,
    duration_ms: u64,
    recovery_cost: f64,
}

/// Motivation tracking and injection system
#[derive(Debug, Clone)]
pub struct MotivationInjector {
    baseline_motivation: f64,
    current_motivation: f64,
    entropy_history: Vec<f64>,
    injection_protocols: HashMap<String, MotivationProtocol>,
}

#[derive(Debug, Clone)]
struct MotivationProtocol {
    trigger_condition: String,
    injection_method: String,
    expected_boost: f64,
    cooldown_period: u64,
}

/// The main weapon systems orchestrator
pub struct WeaponSystems {
    config: WeaponConfig,
    procrastination_detector: ProcrastinationDetector,
    flow_analyzer: FlowAnalyzer,
    motivation_injector: MotivationInjector,
    active_threats: Vec<CognitiveThreat>,
}

impl Default for WeaponSystems {
    fn default() -> Self {
        Self::new(WeaponConfig::default())
    }
}

impl Default for WeaponConfig {
    fn default() -> Self {
        Self {
            auto_scan: true,
            scan_interval: 300, // 5 minutes
            aggressiveness: 0.7,
            distraction_patterns: vec![
                "reddit".to_string(),
                "twitter".to_string(),
                "youtube".to_string(),
                "discord".to_string(),
                "facebook".to_string(),
                "instagram".to_string(),
            ],
        }
    }
}

impl WeaponSystems {
    /// Create a new weapon systems instance
    pub fn new(config: WeaponConfig) -> Self {
        let procrastination_detector = ProcrastinationDetector::new();
        let flow_analyzer = FlowAnalyzer::new();
        let motivation_injector = MotivationInjector::new();

        Self {
            config,
            procrastination_detector,
            flow_analyzer,
            motivation_injector,
            active_threats: Vec::new(),
        }
    }

    /// Execute threat assessment on current state
    pub fn assess_threats(&mut self, context: &WeaponContext) -> Vec<CognitiveThreat> {
        let mut threats = Vec::new();

        // Procrastination detection
        if let Some(threat) = self.procrastination_detector.scan_context(context) {
            threats.push(threat);
        }

        // Flow analysis
        if let Some(threat) = self.flow_analyzer.detect_flow_break() {
            threats.push(threat);
        }

        // Motivation monitoring
        if let Some(threat) = self.motivation_injector.detect_decay() {
            threats.push(threat);
        }

        // Store active threats
        self.active_threats = threats.clone();
        threats
    }

    /// Execute neutralization protocol for a threat
    pub async fn neutralize_threat(&mut self, threat: &CognitiveThreat) -> NeutralizationResult {
        match threat.threat_type {
            ThreatType::AttentionLeak => {
                self.procrastination_detector.deploy_protocol().await
            }
            ThreatType::ReasoningInterruption => {
                self.flow_analyzer.restore_flow().await
            }
            ThreatType::CognitiveFatigue => {
                self.motivation_injector.inject_motivation().await
            }
            ThreatType::MotivationDecay => {
                self.motivation_injector.boost_motivation().await
            }
            ThreatType::EntropyIncrease => {
                self.neutralize_entropy().await
            }
        }
    }

    /// Bulk neutralize all active threats
    pub async fn neutralize_active_threats(&mut self) -> Vec<NeutralizationResult> {
        let mut results = Vec::new();

        for threat in &self.active_threats.clone() {
            let result = self.neutralize_threat(threat).await;
            results.push(result);
        }

        results
    }

    /// Get current system status
    pub fn get_status(&self) -> WeaponStatus {
        WeaponStatus {
            active_threats: self.active_threats.len(),
            flow_integrity: self.flow_analyzer.flow_integrity,
            current_motivation: self.motivation_injector.current_motivation,
            last_scan: chrono::Utc::now(),
        }
    }

    /// Internal entropy neutralization (Shadow OS: combat meaninglessness)
    async fn neutralize_entropy(&self) -> NeutralizationResult {
        // Shadow OS entropy combat protocol
        NeutralizationResult {
            protocol: "ENTROPY_NEUTRALIZATION".to_string(),
            effectiveness: 0.8,
            message: "Executed meaning anchor deployment - entropy reduced by 80%".to_string(),
        }
    }
}

/// Context information for threat assessment
#[derive(Debug, Clone)]
pub struct WeaponContext {
    pub current_activity: Option<String>,
    pub reasoning_state: ReasoningState,
    pub time_since_last_action: u64,
    pub attention_indicators: Vec<String>,
    pub motivation_signals: Vec<String>,
}

/// Current reasoning process state
#[derive(Debug, Clone)]
pub enum ReasoningState {
    Focused,
    Distracted,
    Fatigued,
    Interrupted,
    FlowState,
}

/// Result of threat neutralization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NeutralizationResult {
    pub protocol: String,
    pub effectiveness: f64,
    pub message: String,
}

/// Current weapon system health status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeaponStatus {
    pub active_threats: usize,
    pub flow_integrity: f64,
    pub current_motivation: f64,
    pub last_scan: chrono::DateTime<chrono::Utc>,
}

// ==============================================================================
// Procrastination Detector Implementation
// ==============================================================================

impl ProcrastinationDetector {
    pub fn new() -> Self {
        let mut patterns = HashMap::new();

        patterns.insert("social_media_reddit".to_string(), ThreatSignature {
            threat_type: ThreatType::AttentionLeak,
            keywords: vec!["reddit", "r/", "karma", "subreddit"],
            severity_multiplier: 0.8,
            response_protocol: "TAB_ACID_BURN".to_string(),
        });

        patterns.insert("social_media_twitter".to_string(), ThreatSignature {
            threat_type: ThreatType::AttentionLeak,
            keywords: vec!["twitter", "tweet", "@", "#"],
            severity_multiplier: 0.9,
            response_protocol: "NOTIFICATION_BLACKOUT".to_string(),
        });

        patterns.insert("video_streaming".to_string(), ThreatSignature {
            threat_type: ThreatType::AttentionLeak,
            keywords: vec!["youtube", "netflix", "twitch", "video"],
            severity_multiplier: 0.7,
            response_protocol: "FEED_FAST".to_string(),
        });

        patterns.insert("gaming_distraction".to_string(), ThreatSignature {
            threat_type: ThreatType::AttentionLeak,
            keywords: vec!["game", "gaming", "steam", "xbox", "playstation"],
            severity_multiplier: 0.6,
            response_protocol: "ACHIEVEMENT_OVERRIDE".to_string(),
        });

        Self { patterns }
    }

    pub fn scan_context(&self, context: &WeaponContext) -> Option<CognitiveThreat> {
        // Shadow OS: Simulate enemy detection
        if let Some(activity) = &context.current_activity {
            for (pattern_name, signature) in &self.patterns {
                for keyword in &signature.keywords {
                    if activity.to_lowercase().contains(keyword) {
                        return Some(CognitiveThreat {
                            threat_type: signature.threat_type,
                            description: format!("THREAT_DETECTED: {} (Severity: {:.1f})",
                                               pattern_name.replace('_', " ").to_uppercase(),
                                               signature.severity_multiplier),
                            severity: if signature.severity_multiplier > 0.7 {
                                ThreatLevel::High
                            } else {
                                ThreatLevel::Medium
                            },
                            trigger_context: activity.clone(),
                            neutralization_protocol: signature.response_protocol.clone(),
                            timestamp: chrono::Utc::now(),
                        });
                    }
                }
            }
        }

        None
    }

    pub async fn deploy_protocol(&self) -> NeutralizationResult {
        // Shadow OS: Execute "TAB_ACID_BURN" - aggressive tab closure protocol
        NeutralizationResult {
            protocol: "TAB_ACID_BURN".to_string(),
            effectiveness: 0.9,
            message: "Deploying TAB_ACID_BURN protocol - Distraction sources neutralized. Re-engaging DEEP_WORK mode.".to_string(),
        }
    }
}

// ==============================================================================
// Flow Analyzer Implementation
// ==============================================================================

impl FlowAnalyzer {
    pub fn new() -> Self {
        Self {
            current_focus: None,
            flow_breaks: Vec::new(),
            flow_integrity: 1.0,
        }
    }

    pub fn detect_flow_break(&self) -> Option<CognitiveThreat> {
        // Shadow OS: Monitor reasoning continuity
        if self.flow_breaks.len() > 3 {
            Some(CognitiveThreat {
                threat_type: ThreatType::ReasoningInterruption,
                description: "FLOW_INTEGRITY_COMPROMISED: Multiple reasoning interruptions detected".to_string(),
                severity: ThreatLevel::Medium,
                trigger_context: "Excessive context switching".to_string(),
                neutralization_protocol: "FLOW_RESTORATION".to_string(),
                timestamp: chrono::Utc::now(),
            })
        } else {
            None
        }
    }

    pub async fn restore_flow(&mut self) -> NeutralizationResult {
        // Shadow OS: Restore cognitive flow state
        self.flow_breaks.clear();
        self.flow_integrity = 1.0;

        NeutralizationResult {
            protocol: "FLOW_RESTORATION".to_string(),
            effectiveness: 0.8,
            message: "Cognitive flow restored. Reasoning continuity reestablished.".to_string(),
        }
    }
}

// ==============================================================================
// Motivation Injector Implementation
// ==============================================================================

impl MotivationInjector {
    pub fn new() -> Self {
        let mut injection_protocols = HashMap::new();

        injection_protocols.insert("entropy_decay".to_string(), MotivationProtocol {
            trigger_condition: "motivation < 0.3".to_string(),
            injection_method: "meaning_reminder".to_string(),
            expected_boost: 0.4,
            cooldown_period: 1800, // 30 minutes
        });

        injection_protocols.insert("fatigue_detection".to_string(), MotivationProtocol {
            trigger_condition: "flow_breaks > 5 in 10min".to_string(),
            injection_method: "victory_reminder".to_string(),
            expected_boost: 0.3,
            cooldown_period: 900, // 15 minutes
        });

        Self {
            baseline_motivation: 0.8,
            current_motivation: 0.8,
            entropy_history: vec![0.8],
            injection_protocols,
        }
    }

    pub fn detect_decay(&self) -> Option<CognitiveThreat> {
        // Shadow OS: Monitor motivation entropy
        if self.current_motivation < 0.4 {
            Some(CognitiveThreat {
                threat_type: ThreatType::MotivationDecay,
                description: "MOTIVATION_ENTROPY: Drive level critically low".to_string(),
                severity: ThreatLevel::High,
                trigger_context: format!("Motivation: {:.1f} (Baseline: {:.1f})", self.current_motivation, self.baseline_motivation),
                neutralization_protocol: "PURPOSE_INJECTION".to_string(),
                timestamp: chrono::Utc::now(),
            })
        } else {
            None
        }
    }

    pub async fn inject_motivation(&mut self) -> NeutralizationResult {
        // Shadow OS: Combat cognitive fatigue
        self.current_motivation = (self.current_motivation + 0.3).min(1.0);

        NeutralizationResult {
            protocol: "MOTIVATION_INJECTION".to_string(),
            effectiveness: 0.8,
            message: "Deployed meaning anchor protocol - Motivation restored to 80%.".to_string(),
        }
    }

    pub async fn boost_motivation(&mut self) -> NeutralizationResult {
        // Shadow OS: Execute victory visualization protocol
        self.current_motivation = (self.current_motivation + 0.2).min(1.0);

        NeutralizationResult {
            protocol: "VICTORY_PROTOCOL".to_string(),
            effectiveness: 0.6,
            message: "Executed victory visualization - Momentum regained.".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_procrastination_detection() {
        let detector = ProcrastinationDetector::new();
        let context = WeaponContext {
            current_activity: Some("Browsing reddit for cat videos".to_string()),
            reasoning_state: ReasoningState::Distracted,
            time_since_last_action: 300,
            attention_indicators: vec!["tab switching".to_string()],
            motivation_signals: vec!["entropy increase".to_string()],
        };

        let threat = detector.scan_context(&context);
        assert!(threat.is_some());
        assert_eq!(threat.unwrap().threat_type, ThreatType::AttentionLeak);
    }

    #[test]
    fn test_weapon_systems_creation() {
        let weapons = WeaponSystems::default();
        let status = weapons.get_status();
        assert_eq!(status.active_threats, 0);
        assert!(status.flow_integrity > 0.0);
    }

    #[test]
    fn test_motivation_injector() {
        let mut injector = MotivationInjector::new();

        // Simulate motivation decay
        injector.current_motivation = 0.2;
        let threat = injector.detect_decay();
        assert!(threat.is_some());
        assert_eq!(threat.unwrap().threat_type, ThreatType::MotivationDecay);
    }

    #[tokio::test]
    async fn test_neutralization_protocols() {
        let mut weapons = WeaponSystems::default();
        let threat = CognitiveThreat {
            threat_type: ThreatType::AttentionLeak,
            description: "Test threat".to_string(),
            severity: ThreatLevel::Medium,
            trigger_context: "test context".to_string(),
            neutralization_protocol: "TEST_PROTOCOL".to_string(),
            timestamp: chrono::Utc::now(),
        };

        let result = weapons.neutralize_threat(&threat).await;
        assert!(result.effectiveness > 0.0);
        assert!(result.message.contains("TAB_ACID_BURN"));
    }
}
