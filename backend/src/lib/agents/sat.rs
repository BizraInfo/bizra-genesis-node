//! BIZRA Node0 - SAT (System Agent Team) Orchestrator
//!
//! SAT agents manage protocol-level concerns: fairness, security, resource allocation, governance.

use serde::{Deserialize, Serialize};

/// SAT Agent roles
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SatRole {
    PoiVerifier,
    ResourceAllocator,
    RiskGuardian,
    GovernanceEngine,
    EvidenceEngine,
}

impl SatRole {
    /// Get description for this agent
    pub fn description(&self) -> &'static str {
        match self {
            Self::PoiVerifier => "Validates PoI claims, checks Ihsan threshold, blocks fraud",
            Self::ResourceAllocator => "Manages CPU/GPU allocation, prevents overload",
            Self::RiskGuardian => "Monitors for security threats, unusual patterns",
            Self::GovernanceEngine => "Implements parameter changes, upgrade logic",
            Self::EvidenceEngine => "Produces dashboards, reports, health indicators",
        }
    }

    /// Get all available roles
    pub fn all() -> Vec<Self> {
        vec![
            Self::PoiVerifier,
            Self::ResourceAllocator,
            Self::RiskGuardian,
            Self::GovernanceEngine,
            Self::EvidenceEngine,
        ]
    }
}

impl std::fmt::Display for SatRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::PoiVerifier => "PoiVerifier",
            Self::ResourceAllocator => "ResourceAllocator",
            Self::RiskGuardian => "RiskGuardian",
            Self::GovernanceEngine => "GovernanceEngine",
            Self::EvidenceEngine => "EvidenceEngine",
        };
        write!(f, "{}", s)
    }
}

/// SAT Agent information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SatAgent {
    pub role: String,
    pub description: String,
    pub active: bool,
}

impl From<SatRole> for SatAgent {
    fn from(role: SatRole) -> Self {
        Self {
            role: role.to_string(),
            description: role.description().to_string(),
            active: true,
        }
    }
}

/// PoI Verification Result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoiVerificationResult {
    pub event_id: uuid::Uuid,
    pub verified: bool,
    pub ihsan_score: f64,
    pub threshold: f64,
    pub reason: String,
}

/// Resource Allocation Recommendation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocationRecommendation {
    pub cpu_cores: i32,
    pub gpu_enabled: bool,
    pub storage_gb: f64,
    pub reasoning: String,
}

/// Risk Assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub risk_level: String,  // "low", "medium", "high", "critical"
    pub threats: Vec<String>,
    pub recommendations: Vec<String>,
}

/// SAT Orchestrator
pub struct SatOrchestrator {
    ihsan_threshold: f64,
}

impl SatOrchestrator {
    /// Create new SAT Orchestrator
    pub fn new() -> Self {
        let ihsan_threshold = std::env::var("POI_IHSAN_THRESHOLD")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.85);

        Self { ihsan_threshold }
    }

    /// Get all available agents
    pub fn get_agents(&self) -> Vec<SatAgent> {
        SatRole::all().into_iter().map(SatAgent::from).collect()
    }

    /// PoI Verifier: Verify a PoI event
    pub fn verify_poi_event(
        &self,
        event_id: uuid::Uuid,
        ihsan_score: f64,
        impact_score: f64,
    ) -> PoiVerificationResult {
        let mut verified = true;
        let mut reasons = Vec::new();

        // Check Ihsan threshold
        if ihsan_score < self.ihsan_threshold {
            verified = false;
            reasons.push(format!(
                "Ihsan score {:.2} is below threshold {:.2}",
                ihsan_score, self.ihsan_threshold
            ));
        }

        // Check for suspicious impact scores
        if impact_score > 10.0 {
            // Flag for manual review but don't auto-reject
            reasons.push(format!(
                "High impact score {:.2} flagged for review",
                impact_score
            ));
        }

        // Check for impossibly low duration
        // (would need duration parameter for this check)

        let reason = if verified {
            "All verification checks passed".to_string()
        } else {
            reasons.join("; ")
        };

        PoiVerificationResult {
            event_id,
            verified,
            ihsan_score,
            threshold: self.ihsan_threshold,
            reason,
        }
    }

    /// Resource Allocator: Recommend resource allocation
    pub fn recommend_allocation(
        &self,
        cpu_cores_total: i32,
        ram_gb: f64,
        has_gpu: bool,
        storage_available_gb: f64,
    ) -> AllocationRecommendation {
        // Safe defaults: 25% of resources, with minimums and maximums
        let cpu_recommend = std::cmp::min(cpu_cores_total / 4, 8).max(2);
        
        let gpu_enabled = has_gpu && ram_gb >= 32.0;
        
        let storage_recommend = (storage_available_gb * 0.1)
            .min(500.0)
            .max(50.0);

        let reasoning = format!(
            "Based on {}-core CPU, {:.1}GB RAM, {} GPU, {:.1}GB storage: \
             Recommending conservative allocation to ensure system stability.",
            cpu_cores_total,
            ram_gb,
            if has_gpu { "with" } else { "no" },
            storage_available_gb
        );

        AllocationRecommendation {
            cpu_cores: cpu_recommend,
            gpu_enabled,
            storage_gb: storage_recommend,
            reasoning,
        }
    }

    /// Risk Guardian: Assess system risks
    pub fn assess_risks(
        &self,
        cpu_usage: f64,
        memory_usage: f64,
        error_rate: f64,
        failed_auth_attempts: i32,
    ) -> RiskAssessment {
        let mut threats = Vec::new();
        let mut recommendations = Vec::new();
        let mut risk_score = 0;

        // CPU overload risk
        if cpu_usage > 90.0 {
            threats.push("CPU usage critical (>90%)".to_string());
            recommendations.push("Reduce allocated CPU cores or pause resource contribution".to_string());
            risk_score += 3;
        } else if cpu_usage > 75.0 {
            threats.push("CPU usage high (>75%)".to_string());
            recommendations.push("Monitor CPU usage trends".to_string());
            risk_score += 1;
        }

        // Memory risk
        if memory_usage > 90.0 {
            threats.push("Memory usage critical (>90%)".to_string());
            recommendations.push("Reduce concurrent model loads".to_string());
            risk_score += 3;
        } else if memory_usage > 80.0 {
            threats.push("Memory usage high (>80%)".to_string());
            risk_score += 1;
        }

        // Error rate risk
        if error_rate > 0.1 {
            threats.push(format!("High error rate ({:.1}%)", error_rate * 100.0));
            recommendations.push("Review error logs for root cause".to_string());
            risk_score += 2;
        }

        // Authentication risk
        if failed_auth_attempts > 5 {
            threats.push(format!("{} failed auth attempts", failed_auth_attempts));
            recommendations.push("Consider enabling rate limiting".to_string());
            risk_score += 2;
        }

        let risk_level = match risk_score {
            0 => "low",
            1..=2 => "medium",
            3..=5 => "high",
            _ => "critical",
        };

        RiskAssessment {
            risk_level: risk_level.to_string(),
            threats,
            recommendations,
        }
    }

    /// Evidence Engine: Generate system health summary
    pub fn generate_health_summary(
        &self,
        services_healthy: i32,
        services_total: i32,
        poi_events_24h: i32,
        avg_ihsan_24h: f64,
        uptime_hours: f64,
    ) -> serde_json::Value {
        let health_percentage = if services_total > 0 {
            (services_healthy as f64 / services_total as f64) * 100.0
        } else {
            0.0
        };

        let status = if health_percentage >= 100.0 && avg_ihsan_24h >= self.ihsan_threshold {
            "optimal"
        } else if health_percentage >= 80.0 {
            "good"
        } else if health_percentage >= 50.0 {
            "degraded"
        } else {
            "critical"
        };

        serde_json::json!({
            "status": status,
            "health_percentage": health_percentage,
            "services": {
                "healthy": services_healthy,
                "total": services_total
            },
            "poi_metrics": {
                "events_24h": poi_events_24h,
                "avg_ihsan_24h": avg_ihsan_24h,
                "ihsan_threshold": self.ihsan_threshold
            },
            "uptime_hours": uptime_hours,
            "generated_at": chrono::Utc::now().to_rfc3339()
        })
    }

    /// Can PAT action proceed? (SAT veto check)
    pub fn can_proceed(&self, action: &str, ihsan_score: f64) -> (bool, Option<String>) {
        // Check Ihsan threshold
        if ihsan_score < self.ihsan_threshold {
            return (
                false,
                Some(format!(
                    "Action '{}' blocked: Ihsan score {:.2} below threshold {:.2}",
                    action, ihsan_score, self.ihsan_threshold
                )),
            );
        }

        // Additional action-specific checks could go here
        // For now, just pass if Ihsan is good
        (true, None)
    }
}

impl Default for SatOrchestrator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sat_role_display() {
        assert_eq!(SatRole::PoiVerifier.to_string(), "PoiVerifier");
        assert_eq!(SatRole::ResourceAllocator.to_string(), "ResourceAllocator");
    }

    #[test]
    fn test_verify_poi_event_pass() {
        let sat = SatOrchestrator::new();
        let result = sat.verify_poi_event(uuid::Uuid::new_v4(), 0.90, 5.0);
        assert!(result.verified);
    }

    #[test]
    fn test_verify_poi_event_fail() {
        let sat = SatOrchestrator::new();
        let result = sat.verify_poi_event(uuid::Uuid::new_v4(), 0.70, 5.0);
        assert!(!result.verified);
        assert!(result.reason.contains("below threshold"));
    }

    #[test]
    fn test_recommend_allocation() {
        let sat = SatOrchestrator::new();
        let rec = sat.recommend_allocation(24, 64.0, true, 4000.0);
        
        assert!(rec.cpu_cores >= 2);
        assert!(rec.cpu_cores <= 8);
        assert!(rec.gpu_enabled);
        assert!(rec.storage_gb >= 50.0);
        assert!(rec.storage_gb <= 500.0);
    }

    #[test]
    fn test_assess_risks() {
        let sat = SatOrchestrator::new();
        
        // Low risk scenario
        let assessment = sat.assess_risks(30.0, 40.0, 0.001, 0);
        assert_eq!(assessment.risk_level, "low");
        assert!(assessment.threats.is_empty());
        
        // High risk scenario
        let assessment = sat.assess_risks(95.0, 85.0, 0.2, 10);
        assert!(assessment.risk_level == "high" || assessment.risk_level == "critical");
        assert!(!assessment.threats.is_empty());
    }

    #[test]
    fn test_can_proceed() {
        let sat = SatOrchestrator::new();
        
        let (can, reason) = sat.can_proceed("test_action", 0.90);
        assert!(can);
        assert!(reason.is_none());
        
        let (can, reason) = sat.can_proceed("test_action", 0.70);
        assert!(!can);
        assert!(reason.is_some());
    }
}
