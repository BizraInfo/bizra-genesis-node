//! ╔═══════════════════════════════════════════════════════════════════════════╗
//! ║  SAT-LAB v0.1: BIZRA LAB's Internal Marketing Team                         ║
//! ║  SAT serves BIZRA LAB first - Enterprise marketing AI agents              ║
//! ╚═══════════════════════════════════════════════════════════════════════════╝

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// SAT Agent types in SAT-LAB v0.1
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SatAgentType {
    MarketingDirector,
    SocialMedia,
    Content,
    Pr,
}

impl SatAgentType {
    pub fn as_str(&self) -> &'static str {
        match self {
            SatAgentType::MarketingDirector => "marketing_director",
            SatAgentType::SocialMedia => "social_media",
            SatAgentType::Content => "content",
            SatAgentType::Pr => "pr",
        }
    }

    /// Parse from string representation
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "marketing_director" => Some(SatAgentType::MarketingDirector),
            "social_media" => Some(SatAgentType::SocialMedia),
            "content" => Some(SatAgentType::Content),
            "pr" => Some(SatAgentType::Pr),
            _ => None,
        }
    }
}

/// Publishing channel types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SatChannelType {
    Twitter,
    LinkedIn,
    GitHub,
    YouTube,
    Internal,
}

impl SatChannelType {
    pub fn as_str(&self) -> &'static str {
        match self {
            SatChannelType::Twitter => "twitter",
            SatChannelType::LinkedIn => "linkedin",
            SatChannelType::GitHub => "github",
            SatChannelType::YouTube => "youtube",
            SatChannelType::Internal => "internal",
        }
    }

    /// Parse from string representation
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "twitter" => Some(SatChannelType::Twitter),
            "linkedin" => Some(SatChannelType::LinkedIn),
            "github" => Some(SatChannelType::GitHub),
            "youtube" => Some(SatChannelType::YouTube),
            "internal" => Some(SatChannelType::Internal),
            _ => None,
        }
    }
}

/// Outbox item status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SatOutboxStatus {
    Draft,
    Approved,
    Published,
    Rejected,
}

impl SatOutboxStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            SatOutboxStatus::Draft => "draft",
            SatOutboxStatus::Approved => "approved",
            SatOutboxStatus::Published => "published",
            SatOutboxStatus::Rejected => "rejected",
        }
    }

    /// Parse from string representation
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "draft" => Some(SatOutboxStatus::Draft),
            "approved" => Some(SatOutboxStatus::Approved),
            "published" => Some(SatOutboxStatus::Published),
            "rejected" => Some(SatOutboxStatus::Rejected),
            _ => None,
        }
    }
}

/// SAT Outbox Item - Content generated for approval
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SatOutboxItem {
    pub id: Uuid,
    pub agent_type: String,
    pub channel_type: String,
    pub content_title: Option<String>,
    pub content_body: String,
    pub schedule_date: Option<DateTime<Utc>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
    pub engagement_metrics: Option<serde_json::Value>,
}

/// SAT Activity - Log of actions performed
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SatActivity {
    pub id: Uuid,
    pub agent_type: String,
    pub action_type: String,
    pub action_details: Option<serde_json::Value>,
    pub impact_score: Option<i32>,
    pub created_at: DateTime<Utc>,
}

/// SAT Recommendation - Growth strategy suggestions
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SatRecommendation {
    pub id: Uuid,
    pub priority: String,
    pub category: Option<String>,
    pub recommendation: String,
    pub rationale: Option<String>,
    pub actionable_by: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
}

/// Priority levels for recommendations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SatRecommendationPriority {
    High,
    Medium,
    Low,
}

impl SatRecommendationPriority {
    pub fn as_str(&self) -> &'static str {
        match self {
            SatRecommendationPriority::High => "high",
            SatRecommendationPriority::Medium => "medium",
            SatRecommendationPriority::Low => "low",
        }
    }

    /// Parse from string representation
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "high" => Some(SatRecommendationPriority::High),
            "medium" => Some(SatRecommendationPriority::Medium),
            "low" => Some(SatRecommendationPriority::Low),
            _ => None,
        }
    }
}

/// New Outbox Item for creation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewSatOutboxItem {
    pub agent_type: SatAgentType,
    pub channel_type: SatChannelType,
    pub content_title: Option<String>,
    pub content_body: String,
    pub schedule_date: Option<DateTime<Utc>>,
    pub model_id: Option<String>, // Track which BIZRA model generated this content
}

/// New Recommendation for creation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewSatRecommendation {
    pub priority: SatRecommendationPriority,
    pub category: Option<String>,
    pub recommendation: String,
    pub rationale: Option<String>,
    pub actionable_by: Option<NaiveDate>,
}

/// Weekly content plan generated by SAT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketingPlan {
    pub week_start: DateTime<Utc>,
    pub outbox_items: Vec<NewSatOutboxItem>,
    pub recommendations: Vec<NewSatRecommendation>,
}

impl MarketingPlan {
    pub fn to_outbox_items(&self) -> Vec<NewSatOutboxItem> {
        self.outbox_items.clone()
    }

    pub fn to_recommendations(&self) -> Vec<NewSatRecommendation> {
        self.recommendations.clone()
    }
}
