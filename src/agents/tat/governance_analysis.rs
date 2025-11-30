// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - GOVERNANCE ANALYSIS AGENT (TAT)                    ║
// ║  Protocol governance participation and yield optimization                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use crate::agents::tat::{TradingAgent, TradeSignal, TradeSignalType, SignalConfidence};
use crate::agents::{Agent, AgentId, AgentResult};
use crate::models::{MarketData, Position, Portfolio};
use async_trait::async_trait;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Governance Analysis Agent - Protocol governance optimization
pub struct GovernanceAnalysisAgent {
    agent_id: AgentId,
    protocol_governance: HashMap<String, GovernanceProtocol>,
    governance_positions: Vec<GovernancePosition>,
    voting_strategies: HashMap<String, VotingStrategy>,
    yield_opportunities: Vec<GovernanceYield>,
    governance_history: Vec<GovernanceAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceProtocol {
    pub protocol_name: String,
    pub governance_token: String,
    pub total_supply: f64,
    pub quorum_percentage: f64,
    pub voting_period_days: u32,
    pub proposal_types: Vec<String>,
    pub treasury_size: Option<f64>,
    pub active_proposals: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernancePosition {
    pub protocol: String,
    pub token_balance: f64,
    pub voting_power: f64,
    pub lock_duration: Option<u32>, // Days locked
    pub yield_rate: Option<f64>,
    pub last_vote: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VotingStrategy {
    pub strategy_name: String,
    pub protocol: String,
    pub criteria: HashMap<String, String>,
    pub expected_yield: f64,
    pub risk_level: GovernanceRisk,
    pub min_voting_threshold: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GovernanceRisk {
    Low,     // Stable protocols with proven track record
    Medium,  // Established protocols with some governance risk
    High,    // Newer protocols or contentious governance
    VeryHigh,// Experimental governance mechanisms
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceYield {
    pub opportunity_id: String,
    pub protocol: String,
    pub expected_apy: f64,
    pub min_stake_amount: f64,
    pub lock_period_days: u32,
    pub current_utilization: f64,
    pub yield_type: GovernanceYieldType,
    pub risk_factors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GovernanceYieldType {
    DelegationRewards,  // Delegation/APR rewards
    ProposalBounties,   // Reward for successful proposals
    TreasuryYield,      // Treasury management rewards
    StakingRewards,     // Governance token staking rewards
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceAction {
    pub action_id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub protocol: String,
    pub action_type: GovernanceActionType,
    pub amount: Option<f64>,
    pub voting_power_used: Option<f64>,
    pub expected_yield: Option<f64>,
    pub reasoning: String,
    pub outcome: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GovernanceActionType {
    StakeTokens,
    UnstakeTokens,
    DelegateVoting,
    UndelegateVoting,
    VoteProposal,
    SubmitProposal,
    ClaimRewards,
}

impl GovernanceAnalysisAgent {
    pub fn new() -> Self {
        let mut protocol_governance = HashMap::new();
        let mut voting_strategies = HashMap::new();

        // Initialize major DeFi protocols
        protocol_governance.insert(
            "uniswap".to_string(),
            GovernanceProtocol {
                protocol_name: "Uniswap Protocol".to_string(),
                governance_token: "UNI".to_string(),
                total_supply: 1000000000.0, // 1B UNI
                quorum_percentage: 4.0, // 4% quorum
                voting_period_days: 7,
                proposal_types: vec![
                    "Parameter Changes".to_string(),
                    "Treasury Management".to_string(),
                    "Feature Additions".to_string(),
                ],
                treasury_size: Some(250000000.0), // ~$250M
                active_proposals: 12,
            },
        );

        protocol_governance.insert(
            "aave".to_string(),
            GovernanceProtocol {
                protocol_name: "Aave Protocol".to_string(),
                governance_token: "AAVE".to_string(),
                total_supply: 16000000.0, // 16M AAVE
                quorum_percentage: 2.0, // 2% quorum
                voting_period_days: 10,
                proposal_types: vec![
                    "Risk Parameter Updates".to_string(),
                    "Asset Listings".to_string(),
                    "Protocol Upgrades".to_string(),
                    "Treasury Allocation".to_string(),
                ],
                treasury_size: Some(50000000.0), // ~$50M
                active_proposals: 8,
            },
        );

        protocol_governance.insert(
            "makerdao".to_string(),
            GovernanceProtocol {
                protocol_name: "MakerDAO".to_string(),
                governance_token: "MKR".to_string(),
                total_supply: 1005577.0, // ~1M MKR
                quorum_percentage: 0.03, // 0.03% quorum (very low)
                voting_period_days: 3,
                proposal_types: vec![
                    "Stability Fee Changes".to_string(),
                    "Collateral Addition".to_string(),
                    "Parameter Updates".to_string(),
                    "Emergency Actions".to_string(),
                ],
                treasury_size: Some(120000000.0), // ~$120M
                active_proposals: 15,
            },
        );

        protocol_governance.insert(
            "compound".to_string(),
            GovernanceProtocol {
                protocol_name: "Compound Protocol".to_string(),
                governance_token: "COMP".to_string(),
                total_supply: 4000000.0, // 4M COMP
                quorum_percentage: 4.0, // 4% quorum
                voting_period_days: 3,
                proposal_types: vec![
                    "Market Additions".to_string(),
                    "Parameter Updates".to_string(),
                    "Protocol Changes".to_string(),
                    "Governance Changes".to_string(),
                ],
                treasury_size: Some(8000000.0), // ~$8M
                active_proposals: 6,
            },
        );

        // Initialize voting strategies
        voting_strategies.insert(
            "uniswap_high_yield".to_string(),
            VotingStrategy {
                strategy_name: "Uniswap High Yield Focus".to_string(),
                protocol: "uniswap".to_string(),
                criteria: HashMap::from([
                    ("yield_threshold".to_string(), "8.0".to_string()),
                    ("risk_preference".to_string(), "medium".to_string()),
                    ("focus_area".to_string(), "liquidity_mining".to_string()),
                ]),
                expected_yield: 12.5, // 12.5% APY
                risk_level: GovernanceRisk::Medium,
                min_voting_threshold: 1000.0, // Vote with at least 1000 UNI
            },
        );

        voting_strategies.insert(
            "aave_conservative".to_string(),
            VotingStrategy {
                strategy_name: "Aave Conservative Strategy".to_string(),
                protocol: "aave".to_string(),
                criteria: HashMap::from([
                    ("yield_threshold".to_string(), "5.0".to_string()),
                    ("risk_preference".to_string(), "low".to_string()),
                    ("focus_area".to_string(), "risk_management".to_string()),
                ]),
                expected_yield: 7.0, // 7% APY
                risk_level: GovernanceRisk::Low,
                min_voting_threshold: 500.0, // Vote with at least 500 AAVE
            },
        );

        Self {
            agent_id: AgentId::new("tat-governance-analysis"),
            protocol_governance,
            governance_positions: Vec::new(),
            voting_strategies,
            yield_opportunities: Vec::new(),
            governance_history: Vec::new(),
        }
    }

    /// Analyze governance opportunities across protocols
    pub fn analyze_governance_opportunities(&mut self, portfolio: &Portfolio) -> Vec<GovernanceYield> {
        let mut opportunities = Vec::new();

        // Analyze each governance protocol for yield opportunities
        for (protocol_name, protocol) in &self.protocol_governance {
            let protocol_opportunities = self.analyze_protocol_yields(protocol_name, protocol, portfolio);
            opportunities.extend(protocol_opportunities);
        }

        // Sort by expected yield (highest first)
        opportunities.sort_by(|a, b| b.expected_apy.partial_cmp(&a.expected_apy).unwrap());

        // Update tracked opportunities
        self.yield_opportunities = opportunities.clone();

        opportunities
    }

    /// Analyze yield opportunities for a specific protocol
    fn analyze_protocol_yields(&self, protocol_name: &str, protocol: &GovernanceProtocol, portfolio: &Portfolio) -> Vec<GovernanceYield> {
        let mut opportunities = Vec::new();

        // Calculate current token holdings in portfolio
        let current_holdings = portfolio.positions.iter()
            .find(|p| p.asset_symbol == protocol.governance_token)
            .map(|p| p.quantity)
            .unwrap_or(0.0);

        // Different yield opportunities based on protocol
        match protocol_name {
            "uniswap" => {
                // UNI staking for governance rewards
                opportunities.push(GovernanceYield {
                    opportunity_id: format!("uni_stake_{}", Utc::now().timestamp()),
                    protocol: "uniswap".to_string(),
                    expected_apy: 8.5,
                    min_stake_amount: 1.0, // 1 UNI minimum
                    lock_period_days: 30,
                    current_utilization: 0.65, // 65% of voting power participated
                    yield_type: GovernanceYieldType::StakingRewards,
                    risk_factors: vec![
                        "Protocol parameter changes".to_string(),
                        "Governance proposal outcomes".to_string(),
                    ],
                });

                // UNI delegation rewards (if delegating voting power)
                if current_holdings > 100.0 {
                    opportunities.push(GovernanceYield {
                        opportunity_id: format!("uni_delegate_{}", Utc::now().timestamp()),
                        protocol: "uniswap".to_string(),
                        expected_apy: 12.0,
                        min_stake_amount: 500.0, // Higher for delegation
                        lock_period_days: 90,
                        current_utilization: 0.45,
                        yield_type: GovernanceYieldType::DelegationRewards,
                        risk_factors: vec![
                            "Delegate reliability".to_string(),
                            "Protocol governance changes".to_string(),
                        ],
                    });
                }
            },
            "aave" => {
                opportunities.push(GovernanceYield {
                    opportunity_id: format!("aave_stake_{}", Utc::now().timestamp()),
                    protocol: "aave".to_string(),
                    expected_apy: 6.5,
                    min_stake_amount: 0.5, // 0.5 AAVE minimum
                    lock_period_days: 0, // No lock period
                    current_utilization: 0.55,
                    yield_type: GovernanceYieldType::StakingRewards,
                    risk_factors: vec![
                        "Interest rate volatility".to_string(),
                        "Protocol upgrade risks".to_string(),
                    ],
                });
            },
            "makerdao" => {
                opportunities.push(GovernanceYield {
                    opportunity_id: format!("mkr_stake_{}", Utc::now().timestamp()),
                    protocol: "makerdao".to_string(),
                    expected_apy: 15.0, // High yield due to stability fees
                    min_stake_amount: 0.1, // 0.1 MKR minimum
                    lock_period_days: 1,
                    current_utilization: 0.35,
                    yield_type: GovernanceYieldType::StakingRewards,
                    risk_factors: vec![
                        "Dai price stability".to_string(),
                        "Emergency shutdown risks".to_string(),
                        "High protocol risk".to_string(),
                    ],
                });
            },
            "compound" => {
                opportunities.push(GovernanceYield {
                    opportunity_id: format!("comp_stake_{}", Utc::now().timestamp()),
                    protocol: "compound".to_string(),
                    expected_apy: 9.0,
                    min_stake_amount: 1.0, // 1 COMP minimum
                    lock_period_days: 7,
                    current_utilization: 0.60,
                    yield_type: GovernanceYieldType::StakingRewards,
                    risk_factors: vec![
                        "Market volatility".to_string(),
                        "Liquidation risks".to_string(),
                    ],
                });
            },
            _ => {}
        }

        // Filter opportunities based on portfolio holdings
        opportunities.into_iter()
            .filter(|opp| current_holdings >= opp.min_stake_amount)
            .collect()
    }

    /// Generate optimal voting strategies for governance proposals
    pub fn generate_voting_strategies(&self, protocol: &str) -> Vec<VotingStrategy> {
        self.voting_strategies.values()
            .filter(|strategy| strategy.protocol == protocol)
            .cloned()
            .collect()
    }

    /// Calculate optimal staking amounts for yield maximization
    pub fn calculate_optimal_staking(&self, protocol: &str, available_balance: f64, risk_tolerance: GovernanceRisk) -> OptimalStaking {
        let protocol_config = self.protocol_governance.get(protocol);

        if protocol_config.is_none() || available_balance <= 0.0 {
            return OptimalStaking::default();
        }

        let protocol_config = protocol_config.unwrap();
        let mut recommendations = Vec::new();

        // Find governance yields for this protocol that match risk tolerance
        for opportunity in &self.yield_opportunities {
            if opportunity.protocol == protocol && opportunity.risk_factors.len() as u32 <= self.risk_to_penalty(&risk_tolerance) {
                if available_balance >= opportunity.min_stake_amount {
                    recommendations.push(StakingRecommendation {
                        opportunity_id: opportunity.opportunity_id.clone(),
                        yield_type: opportunity.yield_type.clone(),
                        recommended_amount: available_balance.min(opportunity.min_stake_amount * 10.0),
                        expected_apy: opportunity.expected_apy,
                        risk_adjusted_return: self.calculate_risk_adjusted_return(opportunity, risk_tolerance),
                        lock_period: opportunity.lock_period_days,
                    });
                }
            }
        }

        // Sort by risk-adjusted returns (highest first)
        recommendations.sort_by(|a, b| b.risk_adjusted_return.partial_cmp(&a.risk_adjusted_return).unwrap());

        OptimalStaking {
            total_available: available_balance,
            recommendations: recommendations.into_iter().take(3).collect(), // Top 3 opportunities
            expected_total_apy: recommendations.iter().take(3)
                .map(|r| (r.recommended_amount / available_balance) * r.expected_apy)
                .sum(),
            risk_score: self.risk_to_penalty(&risk_tolerance) as f64 * 0.1,
        }
    }

    /// Execute governance action (staking, voting, etc.)
    pub fn execute_governance_action(&mut self, action: GovernanceActionType, protocol: &str, amount: Option<f64>, reasoning: String) -> GovernanceAction {
        let action_record = GovernanceAction {
            action_id: format!("gov_{}_{}", protocol, Utc::now().timestamp()),
            timestamp: Utc::now(),
            protocol: protocol.to_string(),
            action_type: action.clone(),
            amount,
            voting_power_used: self.calculate_voting_power_change(&action, amount),
            expected_yield: self.estimate_action_yield(&action, protocol, amount),
            reasoning,
            outcome: None, // Will be updated when action completes
        };

        self.governance_history.push(action_record.clone());

        // Update governance positions
        self.update_governance_positions(&action_record);

        action_record
    }

    /// Update governance positions based on actions
    fn update_governance_positions(&mut self, action: &GovernanceAction) {
        match action.action_type {
            GovernanceActionType::StakeTokens => {
                if let Some(amount) = action.amount {
                    let position = self.governance_positions.iter_mut()
                        .find(|p| p.protocol == action.protocol);

                    if let Some(pos) = position {
                        pos.token_balance += amount;
                        pos.voting_power += amount; // Simplified: 1 token = 1 vote
                    } else {
                        self.governance_positions.push(GovernancePosition {
                            protocol: action.protocol.clone(),
                            token_balance: amount,
                            voting_power: amount,
                            lock_duration: Some(30), // Default 30 days
                            yield_rate: None,
                            last_vote: None,
                        });
                    }
                }
            },
            GovernanceActionType::UnstakeTokens => {
                if let Some(amount) = action.amount {
                    if let Some(position) = self.governance_positions.iter_mut()
                        .find(|p| p.protocol == action.protocol) {
                        position.token_balance -= amount;
                        position.voting_power -= amount;
                    }
                }
            },
            _ => {} // Other actions don't directly affect token balances
        }
    }

    /// Helper functions
    fn calculate_voting_power_change(&self, action: &GovernanceActionType, amount: Option<f64>) -> Option<f64> {
        match action {
            GovernanceActionType::StakeTokens => amount,
            GovernanceActionType::UnstakeTokens => amount.map(|a| -a),
            _ => None,
        }
    }

    fn estimate_action_yield(&self, action: &GovernanceActionType, protocol: &str, amount: Option<f64>) -> Option<f64> {
        if let Some(amt) = amount {
            match action {
                GovernanceActionType::StakeTokens => {
                    self.yield_opportunities.iter()
                        .find(|opp| opp.protocol == protocol)
                        .map(|opp| opp.expected_apy * amt / 100.0)
                },
                _ => None,
            }
        } else {
            None
        }
    }

    fn risk_to_penalty(&self, risk: &GovernanceRisk) -> u32 {
        match risk {
            GovernanceRisk::Low => 1,
            GovernanceRisk::Medium => 2,
            GovernanceRisk::High => 3,
            GovernanceRisk::VeryHigh => 4,
        }
    }

    fn calculate_risk_adjusted_return(&self, opportunity: &GovernanceYield, risk_tolerance: GovernanceRisk) -> f64 {
        let base_return = opportunity.expected_apy;
        let risk_penalty = match risk_tolerance {
            GovernanceRisk::Low => 0.9,      // Conservative - reduce expected returns
            GovernanceRisk::Medium => 1.0,   // Neutral
            GovernanceRisk::High => 1.1,     // Aggressive - amplify returns
            GovernanceRisk::VeryHigh => 1.2, // Very aggressive
        };

        base_return * risk_penalty
    }
}

#[derive(Debug, Clone, Default)]
pub struct OptimalStaking {
    pub total_available: f64,
    pub recommendations: Vec<StakingRecommendation>,
    pub expected_total_apy: f64,
    pub risk_score: f64,
}

#[derive(Debug, Clone)]
pub struct StakingRecommendation {
    pub opportunity_id: String,
    pub yield_type: GovernanceYieldType,
    pub recommended_amount: f64,
    pub expected_apy: f64,
    pub risk_adjusted_return: f64,
    pub lock_period: u32,
}

#[async_trait]
impl Agent for GovernanceAnalysisAgent {
    fn id(&self) -> &AgentId {
        &self.agent_id
    }

    fn name(&self) -> &str {
        "Governance Analysis Agent"
    }

    fn description(&self) -> &str {
        "Protocol governance participation optimization and yield farming analysis across DeFi protocols"
    }

    async fn run(&mut self, input: serde_json::Value) -> AgentResult<serde_json::Value> {
        let portfolio: Portfolio = serde_json::from_value(input.clone())
            .map_err(|e| format!("Failed to parse portfolio data: {}", e))?;

        let opportunities = self.analyze_governance_opportunities(&portfolio);

        Ok(serde_json::json!({
            "governance_opportunities": opportunities.len(),
            "protocols_monitored": self.protocol_governance.len(),
            "active_positions": self.governance_positions.len(),
            "voting_strategies": self.voting_strategies.len(),
            "top_opportunity_apy": opportunities.first().map(|opp| opp.expected_apy).unwrap_or(0.0),
            "total_voting_power": self.governance_positions.iter().map(|p| p.voting_power).sum::<f64>()
        }))
    }
}

#[async_trait]
impl TradingAgent for GovernanceAnalysisAgent {
    async fn analyze_market(&self, market_data: &MarketData) -> AgentResult<Vec<TradeSignal>> {
        let mut signals = Vec::new();

        // Check if market data relates to governance tokens
        let governance_tokens = vec!["UNI", "AAVE", "MKR", "COMP"];

        if governance_tokens.iter().any(|token| market_data.asset_pair.contains(token)) {
            // Governance token movements may indicate yield farming opportunities

            if let (Some(price_change), Some(volume_change)) = (market_data.price_change_24h, market_data.volume_change_24h) {
                if price_change > 0.05 && volume_change > 1.5 { // 5%+ price increase with high volume
                    signals.push(TradeSignal {
                        timestamp: Utc::now(),
                        signal_type: TradeSignalType::Buy,
                        asset_pair: market_data.asset_pair.clone(),
                        entry_price: market_data.price,
                        exit_price: None,
                        confidence: SignalConfidence::Medium,
                        reasoning: "Governance token strength may indicate protocol yield opportunities".to_string(),
                        risk_level: "Medium".to_string(),
                        expected_return: Some(12.0), // Governance yields
                        time_horizon: Some("30-90 days".to_string()),
                    });
                }
            }
        }

        Ok(signals)
    }

    async fn execute_trade(&self, _signal: &TradeSignal, _portfolio: &mut Portfolio) -> AgentResult<Position> {
        Err("GovernanceAnalysisAgent analyzes participation - execution handled by TradeAnalysisAgent".to_string())
    }

    async fn assess_risk(&self, portfolio: &Portfolio, position: &Position) -> AgentResult<crate::types::TradingRisk> {
        // Assess governance risk based on protocol stability
        let protocol_risk = if position.asset_symbol.contains("MKR") {
            0.8 // High risk - complex protocol
        } else if position.asset_symbol.contains("UNI") || position.asset_symbol.contains("AAVE") {
            0.5 // Medium risk - large, established protocols
        } else {
            0.3 // Lower risk - other governance tokens
        };

        let exposure_pct = (position.market_value / portfolio.total_value) * 100.0;

        Ok(crate::types::TradingRisk {
            risk_level: if protocol_risk > 0.6 { "High" } else if protocol_risk > 0.3 { "Medium" } else { "Low" }.to_string(),
            volatility: Some(protocol_risk),
            exposure_percentage: exposure_pct,
            recommendations: vec![
                format!("Protocol governance risk score: {:.1}%", protocol_risk * 100.0),
                "Diversify across governance tokens".to_string(),
                "Monitor protocol treasury health".to_string(),
                "Stay informed on governance proposals".to_string(),
            ],
        })
    }

    async fn check_compliance(&self, action: &str, parameters: &serde_json::Value) -> AgentResult<crate::types::ComplianceStatus> {
        // Governance participation compliance
        let protocol = parameters.get("protocol").and_then(|v| v.as_str()).unwrap_or("");
        let action_type = action.to_lowercase();

        // Check if protocol requires governance compliance
        let known_protocols = ["uniswap", "aave", "makerdao", "compound"];

        if known_protocols.contains(&protocol.to_lowercase().as_str()) {
            if action_type.contains("vote") || action_type.contains("stake") {
                // Verify minimum holdings for voting
                let min_balance = match protocol.to_lowercase().as_str() {
                    "uniswap" => 1.0,     // 1 UNI minimum
                    "aave" => 0.5,        // 0.5 AAVE minimum
                    "makerdao" => 0.1,    // 0.1 MKR minimum
                    "compound" => 1.0,    // 1 COMP minimum
                    _ => 0.0,
                };

                let current_balance = parameters.get("balance").and_then(|v| v.as_f64()).unwrap_or(0.0);

                if current_balance < min_balance {
                    return Ok(crate::types::ComplianceStatus {
                        compliant: false,
                        violations: vec![format!("Insufficient balance for {} governance participation", protocol)],
                        recommended_actions: vec![
                            format!("Acquire at least {} {} tokens", min_balance, protocol.to_uppercase()),
                            "Delegate voting power if balance insufficient".to_string(),
                        ],
                    });
                }
            }

            Ok(crate::types::ComplianceStatus {
                compliant: true,
                violations: vec![],
                recommended_actions: vec![
                    "Review governance proposals before voting".to_string(),
                    "Understand protocol risks and yields".to_string(),
                ],
            })
        } else {
            Ok(crate::types::ComplianceStatus {
                compliant: false,
                violations: vec!["Unknown or unsupported governance protocol".to_string()],
                recommended_actions: vec!["Research protocol governance requirements".to_string()],
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Position, Portfolio};

    #[tokio::test]
    async fn test_governance_opportunity_analysis() {
        let mut agent = GovernanceAnalysisAgent::new();

        let portfolio = Portfolio {
            positions: vec![
                Position {
                    asset_symbol: "UNI".to_string(),
                    quantity: 1000.0, // Sufficient for Uniswap governance
                    entry_price: 20.0,
                    current_price: 20.0,
                    unrealized_pnl: 0.0,
                    market_value: 20000.0,
                },
                Position {
                    asset_symbol: "AAVE".to_string(),
                    quantity: 100.0,
                    entry_price: 150.0,
                    current_price: 150.0,
                    unrealized_pnl: 0.0,
                    market_value: 15000.0,
                },
            ],
            total_value: 35000.0,
        };

        let opportunities = agent.analyze_governance_opportunities(&portfolio);

        assert!(!opportunities.is_empty(), "Should find governance opportunities");
        assert!(opportunities.iter().any(|opp| opp.protocol == "uniswap"));
        assert!(opportunities.iter().any(|opp| opp.protocol == "aave"));

        // Check that opportunities meet minimum requirements
        for opp in opportunities {
            assert!(opp.expected_apy > 0.0);
            assert!(opp.min_stake_amount > 0.0);
        }
    }

    #[tokio::test]
    async fn test_optimal_staking_calculation() {
        let agent = GovernanceAnalysisAgent::new();

        // Test Uniswap staking optimization
        let optimal = agent.calculate_optimal_staking("uniswap", 2000.0, GovernanceRisk::Medium);

        assert!(optimal.total_available == 2000.0);
        assert!(!optimal.recommendations.is_empty());
        assert!(optimal.expected_total_apy > 0.0);
        assert!(optimal.risk_score >= 0.0 && optimal.risk_score <= 1.0);
    }

    #[tokio::test]
    async fn test_governance_action_execution() {
        let mut agent = GovernanceAnalysisAgent::new();

        // Execute a staking action
        let action = agent.execute_governance_action(
            GovernanceActionType::StakeTokens,
            "uniswap",
            Some(500.0),
            "Optimizing for governance yield".to_string()
        );

        assert_eq!(action.protocol, "uniswap");
        assert_eq!(action.amount, Some(500.0));
        assert_eq!(action.action_type, GovernanceActionType::StakeTokens);

        // Check that position was updated
        let uni_position = agent.governance_positions.iter()
            .find(|p| p.protocol == "uniswap");

        assert!(uni_position.is_some(), "Should create Uniswap governance position");
        assert_eq!(uni_position.unwrap().token_balance, 500.0);
        assert_eq!(uni_position.unwrap().voting_power, 500.0);
    }

    #[tokio::test]
    async fn test_voting_strategies() {
        let agent = GovernanceAnalysisAgent::new();

        let strategies = agent.generate_voting_strategies("uniswap");
        assert!(!strategies.is_empty());

        let uni_strategy = strategies.iter().find(|s| s.protocol == "uniswap");
        assert!(uni_strategy.is_some());

        let strategy = uni_strategy.unwrap();
        assert_eq!(strategy.strategy_name, "Uniswap High Yield Focus");
        assert!(strategy.expected_yield > 0.0);
        assert!(strategy.min_voting_threshold > 0.0);
    }

    #[tokio::test]
    async fn test_governance_compliance_check() {
        let agent = GovernanceAnalysisAgent::new();

        // Test with sufficient balance
        let sufficient_params = serde_json::json!({
            "protocol": "uniswap",
            "balance": 1500.0
        });

        let result = agent.check_compliance("vote", &sufficient_params).await.unwrap();
        assert!(result.compliant, "Should be compliant with sufficient UNI balance");

        // Test with insufficient balance
        let insufficient_params = serde_json::json!({
            "protocol": "uniswap",
            "balance": 0.5
        });

        let result2 = agent.check_compliance("vote", &insufficient_params).await.unwrap();
        assert!(!result2.compliant, "Should be non-compliant with insufficient balance");
    }
}
