// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - THREAT ANALYSIS AGENT (TAT)                        ║
// ║  Trading threat detection and DeFi security monitoring                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use crate::agents::tat::{TradingAgent, TradeSignal, TradeSignalType, SignalConfidence};
use crate::agents::{Agent, AgentId, AgentResult};
use crate::models::{MarketData, Position, Portfolio};
use async_trait::async_trait;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Threat Analysis Agent - Detects market manipulation and trading threats
pub struct ThreatAnalysisAgent {
    agent_id: AgentId,
    threat_patterns: HashMap<String, ThreatPattern>,
    alert_thresholds: ThreatThresholds,
    active_threats: Vec<ActiveThreat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatPattern {
    pub name: String,
    pub description: String,
    pub indicators: Vec<String>,
    pub severity: ThreatSeverity,
    pub automated_response: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ThreatSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatThresholds {
    pub manipulation_probability_threshold: f64,
    pub wash_trading_ratio_threshold: f64,
    pub anomalous_volume_threshold: u64,
    pub flash_crash_percentage_threshold: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveThreat {
    pub threat_type: String,
    pub asset_pair: String,
    pub confidence: f64,
    pub severity: ThreatSeverity,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub description: String,
    pub recommended_actions: Vec<String>,
}

impl ThreatAnalysisAgent {
    /// Create new Threat Analysis Agent
    pub fn new() -> Self {
        let mut threat_patterns = HashMap::new();

        // Initialize threat patterns
        threat_patterns.insert(
            "wash_trading".to_string(),
            ThreatPattern {
                name: "Wash Trading Detection".to_string(),
                description: "Artificial volume creation through self-trading".to_string(),
                indicators: vec![
                    "High frequency trades between same entities".to_string(),
                    "Identical buy/sell amounts".to_string(),
                    "Minimal net position change".to_string(),
                ],
                severity: ThreatSeverity::High,
                automated_response: vec![
                    "Flag trades for manual review".to_string(),
                    "Temporarily halt automatic trading".to_string(),
                    "Notify compliance team".to_string(),
                ],
            },
        );

        threat_patterns.insert(
            "pump_dump".to_string(),
            ThreatPattern {
                name: "Pump & Dump Detection".to_string(),
                description: "Coordinated price manipulation through artificial hype".to_string(),
                indicators: vec![
                    "Sudden volume spike".to_string(),
                    "Coordinated social media hype".to_string(),
                    "No fundamental news backing".to_string(),
                    "Sharp price decline following peak".to_string(),
                ],
                severity: ThreatSeverity::Critical,
                automated_response: vec![
                    "Generate immediate sell signals".to_string(),
                    "Liquidate all positions in affected asset".to_string(),
                    "Restrict new position openings".to_string(),
                ],
            },
        );

        threat_patterns.insert(
            "flash_crash".to_string(),
            ThreatPattern {
                name: "Flash Crash Detection".to_string(),
                description: "Sudden, extreme price movements indicating technical issues".to_string(),
                indicators: vec![
                    "Extreme price movements (>30% in minutes)".to_string(),
                    "Anomalous volume patterns".to_string(),
                    "No apparent fundamental trigger".to_string(),
                ],
                severity: ThreatSeverity::Critical,
                automated_response: vec![
                    "Execute circuit breaker protocol".to_string(),
                    "Suspend all trading for asset".to_string(),
                    "Manual intervention required".to_string(),
                ],
            },
        );

        Self {
            agent_id: AgentId::new("tat-threat-analysis"),
            threat_patterns,
            alert_thresholds: ThreatThresholds {
                manipulation_probability_threshold: 0.8, // 80% confidence required
                wash_trading_ratio_threshold: 0.7,       // 70% wash trade ratio
                anomalous_volume_threshold: 1000000,     // 1M volume threshold
                flash_crash_percentage_threshold: 0.3,   // 30% price change
            },
            active_threats: Vec::new(),
        }
    }

    /// Analyze market data for trading threats
    fn analyze_for_threats(&mut self, market_data: &MarketData) -> Vec<ActiveThreat> {
        let mut detected_threats = Vec::new();

        // Wash trading detection
        if let Some(volume) = market_data.volume_24h {
            if volume > self.alert_thresholds.anomalous_volume_threshold as f64 {
                // Check for wash trading patterns
                let wash_ratio = self.calculate_wash_trading_ratio(market_data);
                if wash_ratio > self.alert_thresholds.wash_trading_ratio_threshold {
                    detected_threats.push(ActiveThreat {
                        threat_type: "wash_trading".to_string(),
                        asset_pair: market_data.asset_pair.clone(),
                        confidence: wash_ratio,
                        severity: ThreatSeverity::High,
                        timestamp: Utc::now(),
                        description: format!("Wash trading detected with {:.1}% ratio", wash_ratio * 100.0),
                        recommended_actions: vec![
                            "Monitor wallet transactions".to_string(),
                            "Reduce position sizing".to_string(),
                            "Inform compliance team".to_string(),
                        ],
                    });
                }
            }
        }

        // Pump & dump detection
        if let (Some(price_change), Some(volume_change)) = (market_data.price_change_24h, market_data.volume_change_24h) {
            let pump_probability = self.calculate_pump_probability(price_change, volume_change);

            if pump_probability > self.alert_thresholds.manipulation_probability_threshold {
                detected_threats.push(ActiveThreat {
                    threat_type: "pump_dump".to_string(),
                    asset_pair: market_data.asset_pair.clone(),
                    confidence: pump_probability,
                    severity: ThreatSeverity::Critical,
                    timestamp: Utc::now(),
                    description: format!("Pump & dump detected with {:.1}% probability", pump_probability * 100.0),
                    recommended_actions: vec![
                        "Generate immediate sell signal".to_string(),
                        "Reduce or close long positions".to_string(),
                        "Avoid new positions".to_string(),
                    ],
                });
            }
        }

        // Flash crash detection
        if let Some(price_change) = market_data.price_change_24h {
            if price_change.abs() > self.alert_thresholds.flash_crash_percentage_threshold {
                detected_threats.push(ActiveThreat {
                    threat_type: "flash_crash".to_string(),
                    asset_pair: market_data.asset_pair.clone(),
                    confidence: 0.9, // High confidence for extreme events
                    severity: ThreatSeverity::Critical,
                    timestamp: Utc::now(),
                    description: format!("Flash crash detected with {:.1}% price change", price_change * 100.0),
                    recommended_actions: vec![
                        "Circuit breaker activated".to_string(),
                        "All trading suspended".to_string(),
                        "Require manual approval for restart".to_string(),
                    ],
                });
            }
        }

        detected_threats
    }

    /// Calculate wash trading ratio based on trading patterns
    fn calculate_wash_trading_ratio(&self, _market_data: &MarketData) -> f64 {
        // Simplified implementation - in reality would analyze order book patterns
        // Look for repeated transactions between same wallets with no net effect
        0.75 // Placeholder - real implementation would analyze blockchain data
    }

    /// Calculate pump & dump probability
    fn calculate_pump_probability(&self, price_change: f64, volume_change: f64) -> f64 {
        // Simplified algorithm combining price and volume anomalies
        let price_factor = if price_change > 0.5 { 0.8 } else { 0.2 };
        let volume_factor = if volume_change > 2.0 { 0.7 } else { 0.3 };
        (price_factor + volume_factor) / 2.0
    }
}

#[async_trait]
impl Agent for ThreatAnalysisAgent {
    fn id(&self) -> &AgentId {
        &self.agent_id
    }

    fn name(&self) -> &str {
        "Threat Analysis Agent"
    }

    fn description(&self) -> &str {
        "Detects market manipulation, wash trading, and other trading threats in DeFi markets"
    }

    async fn run(&mut self, input: serde_json::Value) -> AgentResult<serde_json::Value> {
        // Parse input as market data
        let market_data: MarketData = serde_json::from_value(input.clone())
            .map_err(|e| format!("Failed to parse market data: {}", e))?;

        // Analyze for threats
        let threats = self.analyze_for_threats(&market_data);
        self.active_threats.extend(threats);

        // Clean up old threats (older than 1 hour)
        let one_hour_ago = Utc::now() - chrono::Duration::hours(1);
        self.active_threats.retain(|t| t.timestamp > one_hour_ago);

        let response = serde_json::json!({
            "threats_detected": self.active_threats.len(),
            "active_threats": self.active_threats,
            "total_patterns_monitored": self.threat_patterns.len()
        });

        Ok(response)
    }
}

#[async_trait]
impl TradingAgent for ThreatAnalysisAgent {
    async fn analyze_market(&self, market_data: &MarketData) -> AgentResult<Vec<TradeSignal>> {
        let mut signals = Vec::new();

        // Check for active threats affecting this asset
        let relevant_threats: Vec<&ActiveThreat> = self.active_threats
            .iter()
            .filter(|t| t.asset_pair == market_data.asset_pair)
            .collect();

        for threat in relevant_threats {
            match threat.threat_type.as_str() {
                "pump_dump" => {
                    signals.push(TradeSignal {
                        timestamp: threat.timestamp,
                        signal_type: TradeSignalType::Sell,
                        asset_pair: threat.asset_pair.clone(),
                        entry_price: None,
                        exit_price: None,
                        confidence: SignalConfidence::Critical,
                        reasoning: format!("Pump & dump threat detected: {}", threat.description),
                        risk_level: "Critical".to_string(),
                        expected_return: None,
                        time_horizon: Some("Immediate".to_string()),
                    });
                }
                "flash_crash" => {
                    signals.push(TradeSignal {
                        timestamp: threat.timestamp,
                        signal_type: TradeSignalType::RiskReduction,
                        asset_pair: threat.asset_pair.clone(),
                        entry_price: None,
                        exit_price: None,
                        confidence: SignalConfidence::Critical,
                        reasoning: format!("Flash crash detected: {}", threat.description),
                        risk_level: "System Failure".to_string(),
                        expected_return: None,
                        time_horizon: Some("Until resolved".to_string()),
                    });
                }
                "wash_trading" => {
                    signals.push(TradeSignal {
                        timestamp: threat.timestamp,
                        signal_type: TradeSignalType::Hold,
                        asset_pair: threat.asset_pair.clone(),
                        entry_price: None,
                        exit_price: None,
                        confidence: SignalConfidence::High,
                        reasoning: format!("Wash trading detected: {}", threat.description),
                        risk_level: "High".to_string(),
                        expected_return: None,
                        time_horizon: Some("Until cleared".to_string()),
                    });
                }
                _ => {}
            }
        }

        Ok(signals)
    }

    async fn execute_trade(&self, _signal: &TradeSignal, _portfolio: &mut Portfolio) -> AgentResult<Position> {
        // Threat Analysis Agent does not execute trades directly
        // It generates signals for other agents or manual intervention
        Err("ThreatAnalysisAgent does not execute trades".to_string())
    }

    async fn assess_risk(&self, portfolio: &Portfolio, position: &Position) -> AgentResult<crate::types::TradingRisk> {
        let mut risk_level = "Low".to_string();

        // Check if position is in asset affected by active threats
        let asset_threats: Vec<&ActiveThreat> = self.active_threats
            .iter()
            .filter(|t| t.asset_pair == position.asset_symbol)
            .collect();

        if !asset_threats.is_empty() {
            // Highest severity threat determines overall risk
            let max_severity = asset_threats.iter()
                .map(|t| &t.severity)
                .max_by_key(|s| match s {
                    ThreatSeverity::Low => 1,
                    ThreatSeverity::Medium => 2,
                    ThreatSeverity::High => 3,
                    ThreatSeverity::Critical => 4,
                })
                .unwrap();

            match max_severity {
                ThreatSeverity::High => risk_level = "High".to_string(),
                ThreatSeverity::Critical => risk_level = "Extreme".to_string(),
                _ => {}
            }
        }

        Ok(crate::types::TradingRisk {
            risk_level,
            volatility: Some(0.8), // High volatility during threats
            exposure_percentage: (position.quantity.abs() / portfolio.total_value) * 100.0,
            recommendations: vec!["Monitor threat indicators closely".to_string()],
        })
    }

    async fn check_compliance(&self, action: &str, parameters: &serde_json::Value) -> AgentResult<crate::types::ComplianceStatus> {
        // Check if action involves assets with active threats
        let asset = parameters.get("asset").and_then(|v| v.as_str()).unwrap_or("");

        let active_threats: Vec<&ActiveThreat> = self.active_threats
            .iter()
            .filter(|t| t.asset_pair == asset)
            .collect();

        let compliant = active_threats.is_empty();

        Ok(crate::types::ComplianceStatus {
            compliant,
            violations: if compliant {
                Vec::new()
            } else {
                active_threats.iter().map(|t| t.description.clone()).collect()
            },
            recommended_actions: vec![
                "Verify with compliance team before proceeding".to_string(),
                "Document threat assessment in trade journal".to_string(),
            ],
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::MarketData;

    #[tokio::test]
    async fn test_threat_detection() {
        let mut agent = ThreatAnalysisAgent::new();
        let market_data = MarketData {
            asset_pair: "ETH/USD".to_string(),
            price: Some(3000.0),
            volume_24h: Some(2000000.0), // Above threshold
            price_change_24h: Some(0.05), // Moderate change
            volume_change_24h: Some(3.0), // High volume change = pump signal
            liquidity: None,
            order_book: None,
        };

        let results = agent.run(serde_json::to_value(&market_data).unwrap()).await;
        assert!(results.is_ok());

        let threats = agent.analyze_for_threats(&market_data).await.unwrap();
        assert!(!threats.is_empty()); // Should detect pump & dump and/or wash trading
    }

    #[tokio::test]
    async fn test_flash_crash_signal() {
        let mut agent = ThreatAnalysisAgent::new();
        let market_data = MarketData {
            asset_pair: "BTC/USD".to_string(),
            price: Some(50000.0),
            volume_24h: Some(500000.0),
            price_change_24h: Some(-0.5), // 50% drop = flash crash
            volume_change_24h: Some(1.2),
            liquidity: None,
            order_book: None,
        };

        let signals = agent.analyze_market(&market_data).await.unwrap();
        let critical_signals: Vec<_> = signals.iter()
            .filter(|s| matches!(s.confidence, SignalConfidence::Critical))
            .collect();

        assert!(!critical_signals.is_empty(), "Should generate critical signal for flash crash");
    }
}
