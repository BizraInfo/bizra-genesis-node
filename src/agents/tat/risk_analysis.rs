// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - RISK ANALYSIS AGENT (TAT)                         ║
// ║  Advanced portfolio risk management and position optimization             ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use crate::agents::tat::{TradingAgent, TradeSignal, TradeSignalType, SignalConfidence};
use crate::agents::{Agent, AgentId, AgentResult};
use crate::models::{MarketData, Position, Portfolio};
use async_trait::async_trait;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Risk Analysis Agent - Portfolio risk management and position optimization
pub struct RiskAnalysisAgent {
    agent_id: AgentId,
    risk_models: HashMap<String, RiskModel>,
    risk_limits: RiskLimits,
    stress_scenarios: Vec<StressTest>,
    correlation_matrix: CorrelationMatrix,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskModel {
    pub name: String,
    pub description: String,
    pub parameters: RiskParameters,
    pub calculation_method: RiskMethodology,
    pub confidence_interval: f64, // 95%, 99%, etc.
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskParameters {
    pub confidence_level: f64,
    pub time_horizon_days: u32,
    pub volatility_lookback: u32,
    pub var_percentile: f64,
    pub expected_shortfall_threshold: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RiskMethodology {
    Parametric,     // Parametric VaR
    Historical,     // Historical simulation
    MonteCarlo,     // Monte Carlo simulation
    StressTesting,  // Stress test scenarios
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskLimits {
    pub max_portfolio_var: f64,        // Maximum 1-day VaR (5% of portfolio)
    pub max_single_position: f64,      // Max exposure per asset (15% of portfolio)
    pub max_correlation_exposure: f64, // Max correlated positions (30% of portfolio)
    pub max_drawdown_limit: f64,       // Max acceptable drawdown (20%)
    pub min_liquidity_ratio: f64,      // Minimum liquidity ratio (200%)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StressTest {
    pub scenario_name: String,
    pub description: String,
    pub shock_parameters: HashMap<String, f64>,
    pub probability_weight: f64,
    pub historical_precedent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrelationMatrix {
    pub assets: Vec<String>,
    pub correlation_data: Vec<Vec<f64>>,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

impl RiskAnalysisAgent {
    pub fn new() -> Self {
        let mut risk_models = HashMap::new();

        // Value-at-Risk Model
        risk_models.insert(
            "portfolio_var".to_string(),
            RiskModel {
                name: "Portfolio Value-at-Risk".to_string(),
                description: "1-day VaR calculation using parametric approach with 95% confidence".to_string(),
                parameters: RiskParameters {
                    confidence_level: 0.95,
                    time_horizon_days: 1,
                    volatility_lookback: 30,
                    var_percentile: 0.05,
                    expected_shortfall_threshold: 0.12,
                },
                calculation_method: RiskMethodology::Parametric,
                confidence_interval: 0.95,
            },
        );

        // Multi-asset Risk Model
        risk_models.insert(
            "multi_asset_risk".to_string(),
            RiskModel {
                name: "Multi-Asset Risk Assessment".to_string(),
                description: "Comprehensive risk assessment including diversification and concentration".to_string(),
                parameters: RiskParameters {
                    confidence_level: 0.99,
                    time_horizon_days: 5,
                    volatility_lookback: 60,
                    var_percentile: 0.01,
                    expected_shortfall_threshold: 0.25,
                },
                calculation_method: RiskMethodology::MonteCarlo,
                confidence_interval: 0.99,
            },
        );

        // Stress Testing Scenarios
        let stress_scenarios = vec![
            StressTest {
                scenario_name: "Crypto Crash 2022".to_string(),
                description: "Recurring major cryptocurrency market crash like March 2020".to_string(),
                shock_parameters: HashMap::from([
                    ("btc_volatility".to_string(), 3.0),    // 3x volatility
                    ("eth_correlation".to_string(), 0.9),   // High correlation
                    ("altcoin_drawdown".to_string(), 0.8),  // 80% drawdown
                ]),
                probability_weight: 0.15,
                historical_precedent: Some("March 12, 2020 Black Thursday".to_string()),
            },
            StressTest {
                scenario_name: "DeFi Exploit Wave".to_string(),
                description: "Coordinated DeFi protocol exploits affecting multiple assets".to_string(),
                shock_parameters: HashMap::from([
                    ("defi_tokens".to_string(), 1.5),       // 1.5x impact on DeFi tokens
                    ("smart_contract_risk".to_string(), 2.0), // 2x smart contract failure risk
                    ("liquidity_impact".to_string(), 0.6),   // 60% liquidity reduction
                ]),
                probability_weight: 0.12,
                historical_precedent: Some("Ronin Bridge Hack 2022".to_string()),
            },
            StressTest {
                scenario_name: "Regulatory Crackdown".to_string(),
                description: "Unexpected regulatory changes affecting crypto market".to_string(),
                shock_parameters: HashMap::from([
                    ("trading_volume".to_string(), 0.4),    // 60% volume reduction
                    ("institutional_money".to_string(), 2.5), // 2.5x institutional withdrawal risk
                    ("stablecoin_confidence".to_string(), 1.8), // 1.8x stablecoin depeg risk
                ]),
                probability_weight: 0.08,
                historical_precedent: Some("China Mining Ban 2021".to_string()),
            },
        ];

        Self {
            agent_id: AgentId::new("tat-risk-analysis"),
            risk_models,
            risk_limits: RiskLimits {
                max_portfolio_var: 0.05,      // 5% max daily VaR
                max_single_position: 0.15,    // 15% max per position
                max_correlation_exposure: 0.30, // 30% max correlated exposure
                max_drawdown_limit: 0.20,     // 20% max drawdown
                min_liquidity_ratio: 2.0,     // 200% min liquidity
            },
            stress_scenarios,
            correlation_matrix: CorrelationMatrix {
                assets: vec!["BTC".to_string(), "ETH".to_string(), "SOL".to_string()],
                correlation_data: vec![
                    vec![1.0, 0.85, 0.78],     // BTC correlations
                    vec![0.85, 1.0, 0.82],     // ETH correlations
                    vec![0.78, 0.82, 1.0],     // SOL correlations
                ],
                last_updated: Utc::now(),
            },
        }
    }

    /// Calculate Value-at-Risk for a portfolio
    fn calculate_portfolio_var(&self, portfolio: &Portfolio, confidence_level: f64) -> f64 {
        let mut total_var = 0.0;

        // Calculate position-level VaR contributions
        for position in &portfolio.positions {
            let position_value = position.market_value;
            let position_volatility = self.estimate_position_volatility(&position.asset_symbol);

            // Parametric VaR: position_value * volatility * z-score
            let z_score = match confidence_level {
                0.95 => 1.645,
                0.99 => 2.326,
                0.999 => 3.090,
                _ => 1.645, // Default to 95% confidence
            };

            let position_var = position_value * position_volatility * z_score / portfolio.total_value;
            total_var += position_var;
        }

        // Account for diversification benefits (correlation-adjusted)
        let diversification_factor = self.calculate_diversification_benefit(portfolio);
        total_var * diversification_factor
    }

    /// Estimate volatility for an asset position
    fn estimate_position_volatility(&self, asset_symbol: &str) -> f64 {
        // In production, this would use historical data analysis
        match asset_symbol {
            s if s.contains("BTC") => 0.08, // 8% daily volatility
            s if s.contains("ETH") => 0.10, // 10% daily volatility
            s if s.contains("SOL") => 0.15, // 15% daily volatility
            s if s.contains("ADA") => 0.12, // 12% daily volatility
            _ => 0.06, // 6% default conservative estimate
        }
    }

    /// Calculate diversification benefit from correlation matrix
    fn calculate_diversification_benefit(&self, portfolio: &Portfolio) -> f64 {
        if portfolio.positions.len() <= 1 {
            return 1.0; // No diversification benefit for single position
        }

        // Simple correlation-adjusted diversification
        // In production, this would use proper portfolio theory calculations
        let num_positions = portfolio.positions.len();
        let avg_correlation = 0.7; // Simplified assumption

        // Diversification benefit decreases correlation concentration risk
        1.0 / (1.0 + (num_positions - 1) as f64 * (1.0 - avg_correlation) * 0.5)
    }

    /// Run stress tests on portfolio
    fn run_stress_tests(&self, portfolio: &Portfolio) -> Vec<StressTestResult> {
        let mut results = Vec::new();

        for scenario in &self.stress_scenarios {
            let impact = self.simulate_stress_scenario(portfolio, scenario);
            results.push(StressTestResult {
                scenario_name: scenario.scenario_name.clone(),
                portfolio_impact: impact,
                breach_probability: scenario.probability_weight,
                confidence_level: self.risk_models["portfolio_var"].parameters.confidence_level,
            });
        }

        results
    }

    /// Simulate impact of a stress test scenario
    fn simulate_stress_scenario(&self, portfolio: &Portfolio, scenario: &StressTest) -> f64 {
        let mut total_impact = 0.0;

        for position in &portfolio.positions {
            let mut position_impact = 0.0;

            // Apply scenario-specific shocks
            for (shock_type, shock_value) in &scenario.shock_parameters {
                match shock_type.as_str() {
                    "btc_volatility" if position.asset_symbol.contains("BTC") => {
                        position_impact += shock_value * 0.3; // 30% of position
                    },
                    "eth_correlation" => {
                        // Increased correlation affects diversification
                        position_impact += shock_value * 0.2;
                    },
                    "altcoin_drawdown" if !position.asset_symbol.contains("BTC") => {
                        position_impact += shock_value * 0.8; // Major drawdown for altcoins
                    },
                    "defi_tokens" if position.asset_symbol.contains("UNI") || position.asset_symbol.contains("AAVE") => {
                        position_impact += shock_value * 0.7; // 70% impact on DeFi tokens
                    },
                    "trading_volume" => {
                        position_impact += shock_value * 0.4; // Reduced liquidity impact
                    },
                    _ => {} // No impact for unmatched shocks
                }
            }

            // Weight by position size
            let weighted_impact = position_impact * (position.market_value / portfolio.total_value);
            total_impact += weighted_impact;
        }

        total_impact
    }

    /// Check if portfolio exceeds risk limits
    fn check_risk_limits(&self, portfolio: &Portfolio, var: f64) -> Vec<RiskLimitBreach> {
        let mut breaches = Vec::new();

        // VaR limit check
        if var > self.risk_limits.max_portfolio_var {
            breaches.push(RiskLimitBreach {
                limit_type: "Portfolio VaR".to_string(),
                current_value: var,
                limit_value: self.risk_limits.max_portfolio_var,
                severity: RiskSeverity::High,
            });
        }

        // Single position exposure check
        for position in &portfolio.positions {
            let exposure = position.market_value / portfolio.total_value;
            if exposure > self.risk_limits.max_single_position {
                breaches.push(RiskLimitBreach {
                    limit_type: format!("Single Position ({})", position.asset_symbol),
                    current_value: exposure,
                    limit_value: self.risk_limits.max_single_position,
                    severity: RiskSeverity::Medium,
                });
            }
        }

        breaches
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StressTestResult {
    pub scenario_name: String,
    pub portfolio_impact: f64,
    pub breach_probability: f64,
    pub confidence_level: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskLimitBreach {
    pub limit_type: String,
    pub current_value: f64,
    pub limit_value: f64,
    pub severity: RiskSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RiskSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[async_trait]
impl Agent for RiskAnalysisAgent {
    fn id(&self) -> &AgentId {
        &self.agent_id
    }

    fn name(&self) -> &str {
        "Risk Analysis Agent"
    }

    fn description(&self) -> &str {
        "Advanced portfolio risk management with VaR calculations, stress testing, and position optimization"
    }

    async fn run(&mut self, input: serde_json::Value) -> AgentResult<serde_json::Value> {
        let portfolio: Portfolio = serde_json::from_value(input.clone())
            .map_err(|e| format!("Failed to parse portfolio data: {}", e))?;

        let portfolio_var = self.calculate_portfolio_var(&portfolio, 0.95);
        let risk_limit_breaches = self.check_risk_limits(&portfolio, portfolio_var);
        let stress_test_results = self.run_stress_tests(&portfolio);

        Ok(serde_json::json!({
            "portfolio_var": portfolio_var,
            "var_confidence_level": 0.95,
            "risk_limit_breaches": risk_limit_breaches.len(),
            "stress_tests_run": stress_test_results.len(),
            "max_stress_impact": stress_test_results.iter()
                .map(|r| r.portfolio_impact)
                .max_by(|a, b| a.partial_cmp(b).unwrap())
                .unwrap_or(0.0),
            "risk_models_active": self.risk_models.len(),
            "stress_scenarios": self.stress_scenarios.len()
        }))
    }
}

#[async_trait]
impl TradingAgent for RiskAnalysisAgent {
    async fn analyze_market(&self, market_data: &MarketData) -> AgentResult<Vec<TradeSignal>> {
        let mut signals = Vec::new();

        // Generate risk-adjusted trading signals based on volatility

        let volatility = self.estimate_position_volatility(&market_data.asset_pair);

        if volatility > 0.12 { // High volatility (>12%)
            signals.push(TradeSignal {
                timestamp: Utc::now(),
                signal_type: TradeSignalType::RiskReduction,
                asset_pair: market_data.asset_pair.clone(),
                entry_price: None,
                exit_price: None,
                confidence: SignalConfidence::High,
                reasoning: format!("High volatility detected ({:.1}%). Reduce position sizes.", volatility * 100.0),
                risk_level: "High".to_string(),
                expected_return: None,
                time_horizon: Some("Until volatility stabilizes".to_string()),
            });
        } else if volatility < 0.03 { // Very low volatility
            signals.push(TradeSignal {
                timestamp: Utc::now(),
                signal_type: TradeSignalType::Hold,
                asset_pair: market_data.asset_pair.clone(),
                entry_price: None,
                exit_price: None,
                confidence: SignalConfidence::Medium,
                reasoning: format!("Low volatility environment ({:.1}%). Consider range-trading strategies.", volatility * 100.0),
                risk_level: "Low".to_string(),
                expected_return: None,
                time_horizon: Some("Short-term".to_string()),
            });
        }

        Ok(signals)
    }

    async fn execute_trade(&self, _signal: &TradeSignal, _portfolio: &mut Portfolio) -> AgentResult<Position> {
        Err("RiskAnalysisAgent only generates signals and assessments".to_string())
    }

    async fn assess_risk(&self, portfolio: &Portfolio, position: &Position) -> AgentResult<crate::types::TradingRisk> {
        let exposure = (position.market_value / portfolio.total_value) * 100.0;
        let var_contribution = (position.market_value * self.estimate_position_volatility(&position.asset_symbol) * 1.645) / portfolio.total_value;
        let total_portfolio_var = self.calculate_portfolio_var(portfolio, 0.95);

        // Calculate risk metrics
        let sharpe_ratio = position.unrealized_pnl / (position.market_value * self.estimate_position_volatility(&position.asset_symbol));
        let max_drawdown = position.market_value * 0.15; // Estimate based on volatility
        let liquidity_score = if position.asset_symbol.contains("BTC") { 0.95 } else { 0.75 }; // Simplified

        // Determine overall risk level
        let risk_level = if var_contribution > 0.02 || exposure > 10.0 {
            "High"
        } else if var_contribution > 0.01 || exposure > 5.0 {
            "Medium"
        } else {
            "Low"
        };

        Ok(crate::types::TradingRisk {
            risk_level: risk_level.to_string(),
            volatility: Some(self.estimate_position_volatility(&position.asset_symbol)),
            exposure_percentage: exposure,
            recommendations: vec![
                format!("VaR contribution: {:.1}% of portfolio", var_contribution * 100.0),
                format!("Portfolio VaR: {:.1}%", total_portfolio_var * 100.0),
                format!("Sharpe ratio: {:.2}", sharpe_ratio),
                format!("Liquidity score: {:.1}%", liquidity_score * 100.0),
                "Consider stop-loss at 5% below entry".to_string(),
                "Monitor correlation with portfolio".to_string(),
            ],
        })
    }

    async fn check_compliance(&self, action: &str, parameters: &serde_json::Value) -> AgentResult<crate::types::ComplianceStatus> {
        // Risk-based compliance checks
        let position_size = parameters.get("position_size").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let portfolio_value = parameters.get("portfolio_value").and_then(|v| v.as_f64()).unwrap_or(100000.0);
        let exposure_percentage = (position_size / portfolio_value) * 100.0;

        // Check concentration limits
        let compliant = exposure_percentage <= (self.risk_limits.max_single_position * 100.0);

        // Additional risk-based compliance checks
        let mut violations = Vec::new();
        let mut recommendations = Vec::new();

        if position_size > portfolio_value * self.risk_limits.max_single_position {
            violations.push(format!("Position exceeds single asset limit of {}%", self.risk_limits.max_single_position * 100.0));
            recommendations.push("Reduce position size or diversify".to_string());
        }

        let var_impact = (position_size * 0.08 * 1.645) / portfolio_value; // 8% volatility estimate
        if var_impact > 0.03 { // >3% VaR impact
            violations.push("Position significantly increases portfolio VaR".to_string());
            recommendations.push("Reduce position or add hedging".to_string());
        }

        Ok(crate::types::ComplianceStatus {
            compliant,
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
    async fn test_var_calculation() {
        let agent = RiskAnalysisAgent::new();

        let portfolio = Portfolio {
            positions: vec![
                Position {
                    asset_symbol: "BTC/USD".to_string(),
                    quantity: 0.5,
                    entry_price: 50000.0,
                    current_price: 52000.0,
                    unrealized_pnl: 1000.0,
                    market_value: 26000.0,
                },
                Position {
                    asset_symbol: "ETH/USD".to_string(),
                    quantity: 10.0,
                    entry_price: 3000.0,
                    current_price: 3100.0,
                    unrealized_pnl: 1000.0,
                    market_value: 31000.0,
                },
            ],
            total_value: 57000.0,
        };

        let var = agent.calculate_portfolio_var(&portfolio, 0.95);
        assert!(var >= 0.0 && var <= 1.0); // VaR should be between 0% and 100%
    }

    #[tokio::test]
    async fn test_stress_test_execution() {
        let agent = RiskAnalysisAgent::new();

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
            ],
            total_value: 50000.0,
        };

        let stress_results = agent.run_stress_tests(&portfolio);
        assert!(!stress_results.is_empty());

        // Check that all scenarios were tested
        assert_eq!(stress_results.len(), agent.stress_scenarios.len());
    }

    #[tokio::test]
    async fn test_risk_limit_checking() {
        let agent = RiskAnalysisAgent::new();

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
            ],
            total_value: 50000.0,
        };

        let high_var = 0.08; // 8% VaR - above 5% limit
        let breaches = agent.check_risk_limits(&portfolio, high_var);

        assert!(!breaches.is_empty());
        assert!(breaches.iter().any(|b| b.limit_type.contains("VaR")));
    }

    #[tokio::test]
    async fn test_risk_assessment() {
        let agent = RiskAnalysisAgent::new();

        let position = Position {
            asset_symbol: "BTC/USD".to_string(),
            quantity: 1.0,
            entry_price: 50000.0,
            current_price: 52000.0,
            unrealized_pnl: 2000.0,
            market_value: 52000.0,
        };

        let portfolio = Portfolio {
            positions: vec![position.clone()],
            total_value: 52000.0,
        };

        let risk_assessment = agent.assess_risk(&portfolio, &position).await.unwrap();

        assert!(matches!(risk_assessment.risk_level.as_str(), "Low" | "Medium" | "High"));
        assert!(risk_assessment.exposure_percentage > 90.0); // ~100% exposure in single asset portfolio
        assert!(!risk_assessment.recommendations.is_empty());
    }
}
