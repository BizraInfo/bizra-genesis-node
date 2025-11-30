// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - TRADING AGENTIC TEAM (TAT) MODULE                   ║
// ║  Specialized trading agents for auto-trading and trade signal services     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

//! # Trading Agentic Team (TAT)
//!
//! The TAT provides comprehensive automated trading services including:
//! - Real-time trade signal generation
//! - Automated trade execution
//! - Risk management and position sizing
//! - Arbitrage opportunity detection
//! - Compliance monitoring
//! - Governance participation optimization

pub mod threat_analysis;
pub mod trade_analysis;
pub mod risk_analysis;
pub mod opportunity_analysis;
pub mod compliance_analysis;
pub mod governance_analysis;

pub use threat_analysis::ThreatAnalysisAgent;
pub use trade_analysis::TradeAnalysisAgent;
pub use risk_analysis::RiskAnalysisAgent;
pub use opportunity_analysis::OpportunityAnalysisAgent;
pub use compliance_analysis::ComplianceAnalysisAgent;
pub use governance_analysis::GovernanceAnalysisAgent;

// ═══════════════════════════════════════════════════════════════════════════
// TRADING AGENT TRAIT
// ═══════════════════════════════════════════════════════════════════════════

use crate::agents::{Agent, AgentId, AgentResult};
use crate::models::{MarketData, Position, Portfolio};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use chrono;

/// Core trait for all trading agents
#[async_trait]
pub trait TradingAgent: Agent {
    /// Analyze market conditions and generate trading signals
    async fn analyze_market(&self, market_data: &MarketData) -> AgentResult<Vec<TradeSignal>>;

    /// Execute automated trades based on signals
    async fn execute_trade(&self, signal: &TradeSignal, portfolio: &mut Portfolio) -> AgentResult<Position>;

    /// Assess trading risks for position/portfolio
    async fn assess_risk(&self, portfolio: &Portfolio, position: &Position) -> AgentResult<TradingRisk>;

    /// Monitor compliance status and regulatory requirements
    async fn check_compliance(&self, action: &str, parameters: &serde_json::Value) -> AgentResult<ComplianceStatus>;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMON TRADING TYPES
// ═══════════════════════════════════════════════════════════════════════════

/// Trading signal types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TradeSignalType {
    Buy,
    Sell,
    Hold,
    Arbitrage,
    Liquidation,
    RiskReduction,
}

/// Confidence levels for signals
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SignalConfidence {
    Low,      // <60% confidence
    Medium,   // 60-80% confidence
    High,     // 80-95% confidence
    Critical, // >95% confidence
}

/// Standard trading signal format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeSignal {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub signal_type: TradeSignalType,
    pub asset_pair: String,
    pub entry_price: Option<f64>,
    pub exit_price: Option<f64>,
    pub confidence: SignalConfidence,
    pub reasoning: String,
    pub risk_level: String,
    pub expected_return: Option<f64>,
    pub time_horizon: Option<String>,
}
