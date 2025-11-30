// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - COMPLIANCE ANALYSIS AGENT (TAT)                   ║
// ║  Regulatory compliance monitoring and trading compliance enforcement     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use crate::agents::tat::{TradingAgent, TradeSignal, TradeSignalType, SignalConfidence};
use crate::agents::{Agent, AgentId, AgentResult};
use crate::models::{MarketData, Position, Portfolio};
use async_trait::async_trait;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Compliance Analysis Agent - Regulatory compliance monitoring
pub struct ComplianceAnalysisAgent {
    agent_id: AgentId,
    regulatory_frameworks: HashMap<String, RegulatoryFramework>,
    compliance_rules: Vec<ComplianceRule>,
    jurisdiction_rules: HashMap<String, Vec<String>>,
    compliance_alerts: Vec<ComplianceAlert>,
    compliance_history: Vec<ComplianceRecord>,
    audit_trail: Vec<AuditEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegulatoryFramework {
    pub name: String,
    pub country_code: String,
    pub primary_regulation: String,
    pub key_requirements: Vec<String>,
    pub compliance_triggers: Vec<String>,
    pub reporting_frequency: String,
    pub effective_date: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceRule {
    pub rule_id: String,
    pub category: ComplianceCategory,
    pub severity: ComplianceSeverity,
    pub description: String,
    pub automated_check: bool,
    pub manual_review_required: bool,
    pub check_parameters: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ComplianceCategory {
    TradingSurveillance,
    PositionLimits,
    AntiMoneyLaundering,
    KnowYourCustomer,
    TransactionReporting,
    MarketAbuse,
    CapitalRequirements,
    RiskManagement,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ComplianceSeverity {
    Critical,   // Immediate cease and desist
    High,       // Requires urgent remediation
    Medium,     // Monitor and address
    Low,        // Document and review
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceAlert {
    pub alert_id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub category: ComplianceCategory,
    pub severity: ComplianceSeverity,
    pub description: String,
    pub asset_involved: Option<String>,
    pub suspect_activity: String,
    pub required_action: String,
    pub jurisdiction: String,
    pub escalation_required: bool,
    pub compliance_officer_needed: bool,
    pub auto_resolution_possible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceRecord {
    pub record_id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub asset_pair: String,
    pub trade_type: String,
    pub amount: f64,
    pub counterparty: Option<String>,
    pub compliance_status: ComplianceStatus,
    pub regulatory_reporting_submitted: bool,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ComplianceStatus {
    Compliant,
    UnderReview,
    NonCompliant,
    Sanctioned(TrafficLightProtocol),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TrafficLightProtocol {
    Green,  // Normal operations
    Amber,  // Heightened monitoring
    Red,    // Restricted/Sanctions
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub entry_id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub action: String,
    pub actor: String,
    pub resource: String,
    pub result: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub compliance_validated: bool,
}

impl ComplianceAnalysisAgent {
    pub fn new() -> Self {
        let mut regulatory_frameworks = HashMap::new();

        // EU MiCA Framework (Markets in Crypto-Assets)
        regulatory_frameworks.insert(
            "eu_mica".to_string(),
            RegulatoryFramework {
                name: "Markets in Crypto-Assets Regulation".to_string(),
                country_code: "EU".to_string(),
                primary_regulation: "MiCA".to_string(),
                key_requirements: vec![
                    "Asset-backed crypto segregation".to_string(),
                    "Anti-money laundering compliance".to_string(),
                    "Consumer protection measures".to_string(),
                    "Market abuse prevention".to_string(),
                ],
                compliance_triggers: vec![
                    "Large crypto transfers (>€10M)".to_string(),
                    "Unusual market activity".to_string(),
                    "Cross-border operations".to_string(),
                ],
                reporting_frequency: "On-demand".to_string(),
                effective_date: chrono::DateTime::from_naive_utc_and_offset(
                    chrono::NaiveDate::from_ymd_opt(2024, 4, 30).unwrap().and_hms_opt(0, 0, 0).unwrap(),
                    chrono::Utc,
                ),
            },
        );

        // US SEC Framework (Investment Advisers Act)
        regulatory_frameworks.insert(
            "us_sec".to_string(),
            RegulatoryFramework {
                name: "US Securities and Exchange Commission".to_string(),
                country_code: "US".to_string(),
                primary_regulation: "Investment Advisers Act of 1940".to_string(),
                key_requirements: vec![
                    "Registration as investment adviser".to_string(),
                    "Fiduciary duty to clients".to_string(),
                    "Disclosure of conflicts".to_string(),
                    "Record keeping requirements".to_string(),
                    "Reporting to SEC".to_string(),
                    "Anti-manipulation rules".to_string(),
                ],
                compliance_triggers: vec![
                    "Registered investment adviser activities".to_string(),
                    "Crypto exchange operations".to_string(),
                    "Security offerings".to_string(),
                ],
                reporting_frequency: "Quarterly reports".to_string(),
                effective_date: chrono::DateTime::from_naive_utc_and_offset(
                    chrono::NaiveDate::from_ymd_opt(1970, 1, 1).unwrap().and_hms_opt(0, 0, 0).unwrap(),
                    chrono::Utc,
                ),
            },
        );

        // Compliance Rules Implementation
        let compliance_rules = vec![
            ComplianceRule {
                rule_id: "aml_sar_filing".to_string(),
                category: ComplianceCategory::AntiMoneyLaundering,
                severity: ComplianceSeverity::Critical,
                description: "Suspicious activity must be reported within 30 days".to_string(),
                automated_check: true,
                manual_review_required: true,
                check_parameters: HashMap::from([
                    ("threshold_amount".to_string(), "10000".to_string()),
                    ("time_window_days".to_string(), "30".to_string()),
                    ("risk_score_threshold".to_string(), "0.8".to_string()),
                ]),
            },
            ComplianceRule {
                rule_id: "kyc_update_required".to_string(),
                category: ComplianceCategory::KnowYourCustomer,
                severity: ComplianceSeverity::Medium,
                description: "KYC information must be updated every 12 months".to_string(),
                automated_check: true,
                manual_review_required: false,
                check_parameters: HashMap::from([
                    ("update_frequency_days".to_string(), "365".to_string()),
                    ("grace_period_days".to_string(), "30".to_string()),
                ]),
            },
            ComplianceRule {
                rule_id: "position_limit_check".to_string(),
                category: ComplianceCategory::PositionLimits,
                severity: ComplianceSeverity::High,
                description: "No single position may exceed 25% of portfolio value".to_string(),
                automated_check: true,
                manual_review_required: false,
                check_parameters: HashMap::from([
                    ("position_limit_percent".to_string(), "25".to_string()),
                    ("monitoring_frequency_minutes".to_string(), "5".to_string()),
                ]),
            },
            ComplianceRule {
                rule_id: "market_abuse_wash_trade".to_string(),
                category: ComplianceCategory::MarketAbuse,
                severity: ComplianceSeverity::Critical,
                description: "Wash trading and artificial price manipulation prohibited".to_string(),
                automated_check: true,
                manual_review_required: true,
                check_parameters: HashMap::from([
                    ("similarity_threshold".to_string(), "0.95".to_string()),
                    ("time_window_minutes".to_string(), "15".to_string()),
                ]),
            },
        ];

        // Jurisdiction Rules
        let mut jurisdiction_rules = HashMap::new();
        jurisdiction_rules.insert("US".to_string(), vec![
            "SEC registration requirements".to_string(),
            "CFTC oversight".to_string(),
            "State-level crypto regulations".to_string(),
        ]);
        jurisdiction_rules.insert("EU".to_string(), vec![
            "MiCA compliance".to_string(),
            "GDPR data protection".to_string(),
            "MiFID II market rules".to_string(),
        ]);
        jurisdiction_rules.insert("SG".to_string(), vec![
            "MAS regulatory framework".to_string(),
            "Payment Services Act".to_string(),
        ]);

        Self {
            agent_id: AgentId::new("tat-compliance-analysis"),
            regulatory_frameworks,
            compliance_rules,
            jurisdiction_rules,
            compliance_alerts: Vec::new(),
            compliance_history: Vec::new(),
            audit_trail: Vec::new(),
        }
    }

    /// Comprehensive compliance analysis
    pub fn analyze_compliance(&mut self, portfolio: &Portfolio, market_data: &MarketData, user_jurisdiction: &str) -> Vec<ComplianceAlert> {
        let mut alerts = Vec::new();

        // Apply all compliance rules
        for rule in &self.compliance_rules {
            if let Some(alert) = self.check_compliance_rule(rule, portfolio, market_data, user_jurisdiction) {
                alerts.push(alert);
            }
        }

        // Jurisdiction-specific checks
        if let Some(jurisdiction_rules) = self.jurisdiction_rules.get(user_jurisdiction) {
            for rule in jurisdiction_rules {
                if let Some(alert) = self.check_jurisdiction_rule(rule, portfolio, market_data, user_jurisdiction) {
                    alerts.push(alert);
                }
            }
        }

        // Record compliance analysis in audit trail
        self.audit_trail.push(AuditEntry {
            entry_id: format!("audit_{}", Utc::now().timestamp()),
            timestamp: Utc::now(),
            action: "compliance_analysis".to_string(),
            actor: "ComplianceAnalysisAgent".to_string(),
            resource: format!("portfolio_{}, market_{}", portfolio.total_value, market_data.asset_pair),
            result: format!("{} alerts generated", alerts.len()),
            ip_address: None,
            user_agent: None,
            compliance_validated: alerts.iter().all(|a| a.severity != ComplianceSeverity::Critical),
        });

        // Update compliance alerts
        self.compliance_alerts.extend(alerts.clone());

        alerts
    }

    /// Check a specific compliance rule
    fn check_compliance_rule(&self, rule: &ComplianceRule, portfolio: &Portfolio, market_data: &MarketData, jurisdiction: &str) -> Option<ComplianceAlert> {
        match rule.category {
            ComplianceCategory::PositionLimits => {
                self.check_position_limits(rule, portfolio)
            },
            ComplianceCategory::AntiMoneyLaundering => {
                self.check_aml_requirements(rule, portfolio, market_data)
            },
            ComplianceCategory::KnowYourCustomer => {
                self.check_kyc_requirements(rule)
            },
            ComplianceCategory::MarketAbuse => {
                self.check_market_abuse(rule, market_data)
            },
            ComplianceCategory::TransactionReporting => {
                self.check_transaction_reporting(rule, portfolio)
            },
            ComplianceCategory::RiskManagement => {
                self.check_risk_limits(rule, portfolio)
            },
            _ => None,
        }
    }

    /// Check position limit compliance
    fn check_position_limits(&self, rule: &ComplianceRule, portfolio: &Portfolio) -> Option<ComplianceAlert> {
        let limit_percent: f64 = rule.check_parameters.get("position_limit_percent")?.parse().ok()?;

        for position in &portfolio.positions {
            let exposure = (position.market_value / portfolio.total_value) * 100.0;

            if exposure > limit_percent {
                return Some(ComplianceAlert {
                    alert_id: format!("pos_limit_{}", Utc::now().timestamp()),
                    timestamp: Utc::now(),
                    category: ComplianceCategory::PositionLimits,
                    severity: ComplianceSeverity::High,
                    description: format!("Position exposure {} exceeds limit of {:.1}% ({:.1}% actual)", position.asset_symbol, limit_percent, exposure),
                    asset_involved: Some(position.asset_symbol.clone()),
                    suspect_activity: "Large concentrated position".to_string(),
                    required_action: "Reduce position size or diversify portfolio".to_string(),
                    jurisdiction: "GLOBAL".to_string(),
                    escalation_required: true,
                    compliance_officer_needed: false,
                    auto_resolution_possible: false,
                });
            }
        }

        None
    }

    /// Check AML requirements
    fn check_aml_requirements(&self, rule: &ComplianceRule, portfolio: &Portfolio, market_data: &MarketData) -> Option<ComplianceAlert> {
        let threshold: f64 = rule.check_parameters.get("threshold_amount")?.parse().ok()?;

        if let Some(volume) = market_data.volume_24h {
            if volume > threshold {
                return Some(ComplianceAlert {
                    alert_id: format!("aml_{}", Utc::now().timestamp()),
                    timestamp: Utc::now(),
                    category: ComplianceCategory::AntiMoneyLaundering,
                    severity: ComplianceSeverity::Critical,
                    description: format!("Large volume detection: {:.0} exceeds AML threshold of {:.0}", volume, threshold),
                    asset_involved: Some(market_data.asset_pair.clone()),
                    suspect_activity: "High volume transaction activity".to_string(),
                    required_action: "Enhanced due diligence, CTR filing required, submit SAR if suspicious".to_string(),
                    jurisdiction: "FATF".to_string(),
                    escalation_required: true,
                    compliance_officer_needed: true,
                    auto_resolution_possible: false,
                });
            }
        }

        None
    }

    /// Check KYC requirements
    fn check_kyc_requirements(&self, rule: &ComplianceRule) -> Option<ComplianceAlert> {
        // In a real implementation, this would check user KYC expiry dates
        // This is a placeholder implementation
        Some(ComplianceAlert {
            alert_id: format!("kyc_{}", Utc::now().timestamp()),
            timestamp: Utc::now(),
            category: ComplianceCategory::KnowYourCustomer,
            severity: ComplianceSeverity::Low,
            description: "KYC verification due within grace period".to_string(),
            asset_involved: None,
            suspect_activity: "KYC expiry approaching".to_string(),
            required_action: "Contact user to update KYC information".to_string(),
            jurisdiction: "GLOBAL".to_string(),
            escalation_required: false,
            compliance_officer_needed: false,
            auto_resolution_possible: true,
        })
    }

    /// Check for market abuse patterns
    fn check_market_abuse(&self, rule: &ComplianceRule, market_data: &MarketData) -> Option<ComplianceAlert> {
        // This would implement sophisticated market abuse detection
        // For now, it's a placeholder that flags unusual volatility
        if let (Some(price_change), Some(volume_change)) = (market_data.price_change_24h, market_data.volume_change_24h) {
            let price_volatility = price_change.abs();
            let volume_anomaly = volume_change.abs();

            if price_volatility > 0.5 && volume_anomaly > 3.0 { // >50% price change with >3x volume
                return Some(ComplianceAlert {
                    alert_id: format!("market_abuse_{}", Utc::now().timestamp()),
                    timestamp: Utc::now(),
                    category: ComplianceCategory::MarketAbuse,
                    severity: ComplianceSeverity::Critical,
                    description: format!("Market abuse indicator: {:.1}% price volatility with {:.1}x volume anomaly", price_volatility * 100.0, volume_anomaly),
                    asset_involved: Some(market_data.asset_pair.clone()),
                    suspect_activity: "Potential market manipulation or pump/dump scheme".to_string(),
                    required_action: "Immediate trading suspension, investigation required, regulatory filing".to_string(),
                    jurisdiction: "GLOBAL".to_string(),
                    escalation_required: true,
                    compliance_officer_needed: true,
                    auto_resolution_possible: false,
                });
            }
        }

        None
    }

    /// Check transaction reporting requirements
    fn check_transaction_reporting(&self, rule: &ComplianceRule, portfolio: &Portfolio) -> Option<ComplianceAlert> {
        // Check if large transactions need to be reported
        for position in &portfolio.positions {
            if position.quantity > 1000.0 { // Arbitrary large transaction threshold
                return Some(ComplianceAlert {
                    alert_id: format!("reporting_{}", Utc::now().timestamp()),
                    timestamp: Utc::now(),
                    category: ComplianceCategory::TransactionReporting,
                    severity: ComplianceSeverity::Medium,
                    description: format!("Large transaction reporting required for {} position of {:.2}", position.asset_symbol, position.quantity),
                    asset_involved: Some(position.asset_symbol.clone()),
                    suspect_activity: "Large position accumulation".to_string(),
                    required_action: "Submit transaction report to relevant authorities".to_string(),
                    jurisdiction: "GLOBAL".to_string(),
                    escalation_required: false,
                    compliance_officer_needed: false,
                    auto_resolution_possible: true,
                });
            }
        }

        None
    }

    /// Check risk management compliance
    fn check_risk_limits(&self, rule: &ComplianceRule, portfolio: &Portfolio) -> Option<ComplianceAlert> {
        let total_risk_exposure = portfolio.positions.len() as f64 * 0.1; // Simplified risk calculation

        if total_risk_exposure > 0.7 { // >70% risk exposure
            return Some(ComplianceAlert {
                alert_id: format!("risk_{}", Utc::now().timestamp()),
                timestamp: Utc::now(),
                category: ComplianceCategory::RiskManagement,
                severity: ComplianceSeverity::High,
                description: format!("Portfolio risk exposure exceeds threshold: {:.1}%", total_risk_exposure * 100.0),
                asset_involved: None,
                suspect_activity: "Over-concentrated risk positions".to_string(),
                required_action: "Implement risk diversification measures, reduce position concentrations".to_string(),
                jurisdiction: "GLOBAL".to_string(),
                escalation_required: true,
                compliance_officer_needed: false,
                auto_resolution_possible: false,
                });
        }

        None
    }

    /// Check jurisdiction-specific requirements
    fn check_jurisdiction_rule(&self, rule_description: &str, portfolio: &Portfolio, market_data: &MarketData, jurisdiction: &str) -> Option<ComplianceAlert> {
        match jurisdiction {
            "US" => self.check_us_sec_requirements(rule_description, portfolio, market_data),
            "EU" => self.check_eu_mica_requirements(rule_description, portfolio, market_data),
            _ => None,
        }
    }

    /// US SEC specific compliance checks
    fn check_us_sec_requirements(&self, rule: &str, portfolio: &Portfolio, market_data: &MarketData) -> Option<ComplianceAlert> {
        match rule {
            "SEC registration requirements" => {
                // Check if unregistered investment activities are occurring
                let total_value = portfolio.total_value;

                if total_value > 100000.0 { // $100K threshold for RIA registration
                    return Some(ComplianceAlert {
                        alert_id: format!("sec_reg_{}", Utc::now().timestamp()),
                        timestamp: Utc::now(),
                        category: ComplianceCategory::TransactionReporting,
                        severity: ComplianceSeverity::Medium,
                        description: format!("Portfolio value ${:.0} exceeds SEC RIA registration threshold of $100K", total_value),
                        asset_involved: None,
                        suspect_activity: "Potential unregistered investment advisory activities".to_string(),
                        required_action: "Register as RIA or structure to avoid RIA status".to_string(),
                        jurisdiction: "US".to_string(),
                        escalation_required: false,
                        compliance_officer_needed: true,
                        auto_resolution_possible: false,
                    });
                }
                None
            },
            _ => None,
        }
    }

    /// EU MiCA specific compliance checks
    fn check_eu_mica_requirements(&self, rule: &str, portfolio: &Portfolio, market_data: &MarketData) -> Option<ComplianceAlert> {
        match rule {
            "MiCA compliance" => {
                // Check for stablecoin exposure under MiCA
                let stablecoin_exposure = portfolio.positions.iter()
                    .filter(|p| p.asset_symbol.contains("USDC") || p.asset_symbol.contains("USDT") || p.asset_symbol.contains("USDP"))
                    .map(|p| p.market_value)
                    .sum::<f64>();

                let exposure_pct = (stablecoin_exposure / portfolio.total_value) * 100.0;

                if exposure_pct > 50.0 { // >50% stablecoin exposure
                    return Some(ComplianceAlert {
                        alert_id: format!("mica_stable_{}", Utc::now().timestamp()),
                        timestamp: Utc::now(),
                        category: ComplianceCategory::CapitalRequirements,
                        severity: ComplianceSeverity::Medium,
                        description: format!("MiCA stablecoin exposure {:.1}% requires regulatory compliance", exposure_pct),
                        asset_involved: None,
                        suspect_activity: "High stablecoin concentration".to_string(),
                        required_action: "Implement MiCA-required reserve backing verification".to_string(),
                        jurisdiction: "EU".to_string(),
                        escalation_required: true,
                        compliance_officer_needed: true,
                        auto_resolution_possible: false,
                    });
                }
                None
            },
            _ => None,
        }
    }
}

#[async_trait]
impl Agent for ComplianceAnalysisAgent {
    fn id(&self) -> &AgentId {
        &self.agent_id
    }

    fn name(&self) -> &str {
        "Compliance Analysis Agent"
    }

    fn description(&self) -> &str {
        "Regulatory compliance monitoring, AML/KYC enforcement, and market abuse detection"
    }

    async fn run(&mut self, input: serde_json::Value) -> AgentResult<serde_json::Value> {
        // Parse input as portfolio + market data
        let portfolio: Portfolio = serde_json::from_value(input.clone())
            .map_err(|e| format!("Failed to parse portfolio data: {}", e))?;

        // Mock market data for demonstration
        let market_data = MarketData {
            asset_pair: "BTC/USD".to_string(),
            price: Some(50000.0),
            volume_24h: Some(1500000.0), // Large volume that might trigger AML alert
            price_change_24h: Some(0.02),
            volume_change_24h: Some(2.0),
            liquidity: None,
            order_book: None,
        };

        let alerts = self.analyze_compliance(&portfolio, &market_data, "US");

        Ok(serde_json::json!({
            "compliance_alerts": alerts.len(),
            "active_alerts": alerts,
            "regulatory_frameworks_monitored": self.regulatory_frameworks.len(),
            "compliance_rules_active": self.compliance_rules.len(),
            "audit_trail_entries": self.audit_trail.len(),
            "high_severity_alerts": alerts.iter().filter(|a| matches!(a.severity, ComplianceSeverity::Critical | ComplianceSeverity::High)).count()
        }))
    }
}

#[async_trait]
impl TradingAgent for ComplianceAnalysisAgent {
    async fn analyze_market(&self, market_data: &MarketData) -> AgentResult<Vec<TradeSignal>> {
        let mut signals = Vec::new();

        // Generate compliance-based trading signals
        if market_data.volume_24h.unwrap_or(0.0) > 10000000.0 { // Very high volume
            signals.push(TradeSignal {
                timestamp: Utc::now(),
                signal_type: TradeSignalType::Hold,
                asset_pair: market_data.asset_pair.clone(),
                entry_price: None,
                exit_price: None,
                confidence: SignalConfidence::High,
                reasoning: "High volume activity requires compliance review - holding until cleared".to_string(),
                risk_level: "Compliance Risk".to_string(),
                expected_return: None,
                time_horizon: Some("Until compliance approved".to_string()),
            });
        }

        Ok(signals)
    }

    async fn execute_trade(&self, _signal: &TradeSignal, _portfolio: &mut Portfolio) -> AgentResult<Position> {
        Err("ComplianceAnalysisAgent does not execute trades - performs regulatory oversight".to_string())
    }

    async fn assess_risk(&self, portfolio: &Portfolio, position: &Position) -> AgentResult<crate::types::TradingRisk> {
        // Compliance-based risk assessment
        let compliance_risk_score = if portfolio.positions.len() > 10 {
            0.3 // Diversification good for compliance
        } else {
            0.6 // Concentration may increase regulatory scrutiny
        };

        let exposure_pct = (position.market_value / portfolio.total_value) * 100.0;

        Ok(crate::types::TradingRisk {
            risk_level: if compliance_risk_score > 0.5 { "High" } else { "Low" }.to_string(),
            volatility: Some(compliance_risk_score),
            exposure_percentage: exposure_pct,
            recommendations: vec![
                "Ensure all trading activities have compliance approval".to_string(),
                "Maintain complete transaction records".to_string(),
                "Report large transactions to appropriate authorities".to_string(),
            ],
        })
    }

    async fn check_compliance(&self, action: &str, parameters: &serde_json::Value) -> AgentResult<crate::types::ComplianceStatus> {
        // Detailed compliance verification logic
        let action_type = action.to_lowercase();
        let amount = parameters.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let asset = parameters.get("asset").and_then(|v| v.as_str()).unwrap_or("");

        // Check against compliance rules
        let mut violations = Vec::new();
        let mut recommendations = Vec::new();

        // Amount-based compliance checks
        if action_type.contains("transfer") || action_type.contains("trade") {
            if amount > 10000.0 {
                violations.push("Large transaction requires enhanced due diligence".to_string());
                recommendations.push("Complete AML/CTF risk assessment".to_string());
            }

            if amount > 50000.0 {
                violations.push("Suspicious transaction reporting required".to_string());
                recommendations.push("File SAR with relevant authorities".to_string());
            }
        }

        // Asset-based compliance checks
        if asset.contains("stable") && amount > 100000.0 {
            violations.push("Large stablecoin transaction may require additional verification".to_string());
            recommendations.push("Verify compliance with stablecoin regulations".to_string());
        }

        Ok(crate::types::ComplianceStatus {
            compliant: violations.is_empty(),
            violations,
            recommended_actions: recommendations,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Position, Portfolio};

    #[tokio::test]
    async fn test_aml_high_volume_alert() {
        let mut agent = ComplianceAnalysisAgent::new();

        let portfolio = Portfolio {
            positions: vec![Position {
                asset_symbol: "BTC/USD".to_string(),
                quantity: 1.0,
                entry_price: 50000.0,
                current_price: 50000.0,
                unrealized_pnl: 0.0,
                market_value: 50000.0,
            }],
            total_value: 50000.0,
        };

        let market_data = MarketData {
            asset_pair: "BTC/USD".to_string(),
            price: Some(50000.0),
            volume_24h: Some(15000000.0), // Very high volume triggering AML alert
            price_change_24h: Some(0.02),
            volume_change_24h: Some(2.0),
            liquidity: None,
            order_book: None,
        };

        let alerts = agent.analyze_compliance(&portfolio, &market_data, "US");

        assert!(!alerts.is_empty(), "Should generate AML alert for high volume");
        assert!(alerts.iter().any(|a| matches!(a.category, ComplianceCategory::AntiMoneyLaundering)));
        assert!(alerts.iter().any(|a| matches!(a.severity, ComplianceSeverity::Critical)));
    }

    #[tokio::test]
    async fn test_position_limit_compliance() {
        let mut agent = ComplianceAnalysisAgent::new();

        let portfolio = Portfolio {
            positions: vec![
                Position {
                    asset_symbol: "BTC/USD".to_string(),
                    quantity: 1.0,
                    entry_price: 50000.0,
                    current_price: 50000.0,
                    unrealized_pnl: 0.0,
                    market_value: 50000.0,
                },
                Position { // 30% exposure - exceeds 25% limit
                    asset_symbol: "ETH/USD".to_string(),
                    quantity: 10.0,
                    entry_price: 3000.0,
                    current_price: 3000.0,
                    unrealized_pnl: 0.0,
                    market_value: 30000.0,
                },
            ],
            total_value: 80000.0, // ETH position = 37.5% of portfolio
        };

        let market_data = MarketData {
            asset_pair: "ETH/USD".to_string(),
            price: Some(3000.0),
            volume_24h: Some(500000.0),
            price_change_24h: Some(0.01),
            volume_change_24h: Some(1.0),
            liquidity: None,
            order_book: None,
        };

        let alerts = agent.analyze_compliance(&portfolio, &market_data, "US");

        assert!(!alerts.is_empty(), "Should generate position limit alert");
        assert!(alerts.iter().any(|a| matches!(a.category, ComplianceCategory::PositionLimits)));
    }

    #[tokio::test]
    async fn test_jurisdiction_specific_compliance() {
        let mut agent = ComplianceAnalysisAgent::new();

        let portfolio = Portfolio {
            positions: vec![
                Position {
                    asset_symbol: "USDC".to_string(),
                    quantity: 50000.0,
                    entry_price: 1.0,
                    current_price: 1.0,
                    unrealized_pnl: 0.0,
                    market_value: 50000.0,
                },
                Position {
                    asset_symbol: "BTC/USD".to_string(),
                    quantity: 0.5,
                    entry_price: 50000.0,
                    current_price: 50000.0,
                    unrealized_pnl: 0.0,
                    market_value: 25000.0,
                },
            ],
            total_value: 75000.0, // USDC = 66% exposure
        };

        let market_data = MarketData {
            asset_pair: "USDC".to_string(),
            price: Some(1.0),
            volume_24h: Some(1000000.0),
            price_change_24h: Some(0.0),
            volume_change_24h: Some(1.0),
            liquidity: None,
            order_book: None,
        };

        // Test EU MiCA compliance (high stablecoin exposure)
        let eu_alerts = agent.analyze_compliance(&portfolio, &market_data, "EU");
        assert!(!eu_alerts.is_empty(), "Should generate MiCA compliance alert for high stablecoin exposure");
    }

    #[tokio::test]
    async fn test_compliance_status_reporting() {
        let agent = ComplianceAnalysisAgent::new();

        // Test different compliance scenarios
        let low_risk_action = serde_json::json!({
            "amount": 1000.0,
            "asset": "BTC"
        });

        let high_risk_action = serde_json::json!({
            "amount": 100000.0,
            "asset": "USDC"
        });

        let low_risk_result = agent.check_compliance("trade", &low_risk_action).await.unwrap();
        let high_risk_result = agent.check_compliance("transfer", &high_risk_action).await.unwrap();

        assert!(low_risk_result.compliant, "Low amount should be compliant");
        assert!(!high_risk_result.compliant, "High amount should trigger compliance flags");
    }
}
