//! ╔═══════════════════════════════════════════════════════════════════════════╗
//! ║  SAT-LAB ORCHESTRATOR v0.1                                                ║
//! ║  BIZRA LAB's Internal Enterprise Team - Weekly Content Cycle             ║
//! ╚═══════════════════════════════════════════════════════════════════════════╝

use crate::models::traits::ModelProvider;
use crate::sat::lab::{
    MarketingPlan, NewSatOutboxItem, NewSatRecommendation, SatAgentType, SatChannelType,
    SatOutboxStatus, SatRecommendationPriority,
};
use crate::AppState;
use anyhow::Result;
use chrono::{DateTime, Days, Utc};
use serde_json;
use sqlx::PgPool;
use std::sync::Arc;
use tracing::{info, warn};
use uuid::Uuid;

/// SAT-LAB v0.1 Orchestrator - BIZRA LAB's Internal Marketing & Communication Team
pub struct SatLabOrchestrator {
    db: PgPool,
    model_provider: Box<dyn ModelProvider>,
    #[allow(dead_code)] // Reserved for future app state integration
    app_state: Arc<AppState>,
}

impl SatLabOrchestrator {
    pub fn new(
        db: PgPool,
        model_provider: Box<dyn ModelProvider>,
        app_state: Arc<AppState>,
    ) -> Self {
        Self {
            db,
            model_provider,
            app_state,
        }
    }

    /// Execute weekly content generation cycle for BIZRA LAB
    /// SAT serves BIZRA LAB first as its #1 customer
    pub async fn execute_weekly_cycle(&self) -> Result<()> {
        info!("🚀 Starting SAT-LAB v0.1 weekly cycle - serving BIZRA LAB first");

        // Gather current BIZRA LAB context
        let context = self.gather_bizra_lab_context().await?;
        info!(
            "📊 Gathered BIZRA LAB context: {} items",
            context.items.len()
        );

        // Generate content plan
        let plan = self.generate_content_plan(&context).await?;
        let content_items_count = plan.outbox_items.len();
        let recommendations_count = plan.recommendations.len();
        info!(
            "✨ Generated marketing plan with {} outbox items, {} recommendations",
            content_items_count, recommendations_count
        );

        // Store draft content for human approval (v0.1 policy: no auto-posting)
        self.store_content_plan(plan).await?;
        info!("💾 Stored SAT content plan in outbox - ready for human approval");

        // Log SAT activity for BIZRA LAB visibility
        self.log_sat_activity(
            SatAgentType::MarketingDirector,
            "weekly_content_cycle",
            serde_json::json!({
                "content_items": content_items_count,
                "recommendations": recommendations_count,
                "context_items": context.items.len()
            }),
            9, // High impact score - this is SAT serving its creator
        )
        .await?;

        info!("✨ SAT-LAB v0.1 weekly cycle completed - BIZRA LAB content ready for approval");

        Ok(())
    }

    /// Gather context from BIZRA LAB's current state
    async fn gather_bizra_lab_context(&self) -> Result<BizraLabContext> {
        let context_items = vec![
            // Recent repository activity
            "Recent GitHub activity: New PRs, commits, releases".to_string(),
            // System health metrics
            "System health: Core routing healthy, agent orchestration functional".to_string(),
            // Sacred UX validation status
            "Sacred UX operational: Consciousness meter, hours monument validated".to_string(),
            // Genesis v0.9.0 progress
            "Genesis v0.9.0: Complete with sacred economics, PAT/SAT teams ready".to_string(),
            // Origins story
            "Origins: Ramadan 2023, 15,000+ hours, consciousness evolution technology".to_string(),
        ];

        Ok(BizraLabContext {
            week_start: Utc::now(),
            items: context_items,
        })
    }

    /// Generate weekly content plan using SAT-Agents
    async fn generate_content_plan(&self, context: &BizraLabContext) -> Result<MarketingPlan> {
        let prompt = self.build_marketing_prompt(context)?;

        // Call BIZRA Planner for SAT-LAB content generation
        use crate::models::types::CompletionOptions;

        let options = CompletionOptions {
            temperature: 0.8,
            max_tokens: 4096,
            ..Default::default()
        };

        let plan_response = self
            .model_provider
            .complete(
                "bizra-planner:latest", // Use BIZRA sovereign planner
                &prompt,
                &options,
            )
            .await?;

        info!(
            "BIZRA Planner generated content plan: {} chars",
            plan_response.content.len()
        );
        let plan = self.parse_plan_from_response(&plan_response, context.week_start)?;

        Ok(plan)
    }

    fn build_marketing_prompt(&self, _context: &BizraLabContext) -> Result<String> {
        Ok(r#"You are SAT-LAB Marketing Director for BIZRA LAB.

CONTEXT: You serve BIZRA LAB as its first customer. BIZRA LAB has built magnificent sacred consciousness technology after 15,000+ hours.

CURRENT REALITY:
- Ramadan 2023 origins
- Sacred AI technology (Proof-of-Impact vs Proof-of-Work)
- Genesis v0.9.0 complete with sacred UX
- Consciousness meter, hours monument, spiritual economics
- Production system, not prototype

MISSION: Create a weekly content plan that:
1. Makes BIZRA LAB look serious, credible, and alive
2. Builds awareness of sacred consciousness technology
3. Attracts researchers, developers, change-makers
4. Shows BIZRA LAB as a serious research collective

CONTENT TYPES:
- X (Twitter): Short technical insights + narrative
- LinkedIn: Professional analysis + business case
- GitHub: Project updates + technical achievements
- YouTube: Sacred technology vision + demos

RULES:
- No financial advice or trading recommendations
- Educational framing only
- Show seriousness: technical depth, system confidence
- Highlight ihsan (excellence) in all domains

Generate a weekly plan with specific content for each channel."#
            .to_string())
    }

    fn parse_plan_from_response(
        &self,
        response: &crate::models::types::CompletionResponse,
        week_start: DateTime<Utc>,
    ) -> Result<MarketingPlan> {
        // Parse the actual BIZRA Planner response
        // For now, we'll extract structured content from the response
        // TODO: Implement proper JSON parsing of structured marketing plan

        let content = &response.content;
        let model_used = "bizra-planner:latest"; // Track which BIZRA model generated this

        // Extract content items from the response
        // This is a simplified parser - in production, the prompt would request structured JSON
        let outbox_items = self.extract_content_items_from_response(content, model_used);

        // Extract recommendations from the response
        let recommendations = self.extract_recommendations_from_response(content, week_start);

        Ok(MarketingPlan {
            week_start,
            outbox_items,
            recommendations,
        })
    }

    fn extract_content_items_from_response(
        &self,
        response: &str,
        model_id: &str,
    ) -> Vec<NewSatOutboxItem> {
        // Simple content extraction - look for platform-specific sections
        let mut items = Vec::new();

        // Twitter/X content
        if let Some(twitter_start) = response.find("TWITTER:") {
            let twitter_content = self.extract_section(response, twitter_start + 8);
            if !twitter_content.trim().is_empty() {
                items.push(NewSatOutboxItem {
                    agent_type: SatAgentType::SocialMedia,
                    channel_type: SatChannelType::Twitter,
                    content_title: Some("BIZRA LAB Update".to_string()),
                    content_body: twitter_content.trim().to_string(),
                    schedule_date: None,
                    model_id: Some(model_id.to_string()),
                });
            }
        }

        // LinkedIn content
        if let Some(linkedin_start) = response.find("LINKEDIN:") {
            let linkedin_content = self.extract_section(response, linkedin_start + 9);
            if !linkedin_content.trim().is_empty() {
                items.push(NewSatOutboxItem {
                    agent_type: SatAgentType::Content,
                    channel_type: SatChannelType::LinkedIn,
                    content_title: Some("BIZRA LAB Professional Update".to_string()),
                    content_body: linkedin_content.trim().to_string(),
                    schedule_date: None,
                    model_id: Some(model_id.to_string()),
                });
            }
        }

        // GitHub content
        if let Some(github_start) = response.find("GITHUB:") {
            let github_content = self.extract_section(response, github_start + 7);
            if !github_content.trim().is_empty() {
                items.push(NewSatOutboxItem {
                    agent_type: SatAgentType::Pr,
                    channel_type: SatChannelType::GitHub,
                    content_title: Some("BIZRA LAB Technical Update".to_string()),
                    content_body: github_content.trim().to_string(),
                    schedule_date: None,
                    model_id: Some(model_id.to_string()),
                });
            }
        }

        // If no structured content found, create a fallback item
        if items.is_empty() {
            items.push(NewSatOutboxItem {
                agent_type: SatAgentType::MarketingDirector,
                channel_type: SatChannelType::Internal,
                content_title: Some("BIZRA LAB Weekly Update".to_string()),
                content_body: format!("Generated by BIZRA Planner:\n\n{}", response),
                schedule_date: None,
                model_id: Some(model_id.to_string()),
            });
        }

        items
    }

    fn extract_recommendations_from_response(
        &self,
        response: &str,
        week_start: DateTime<Utc>,
    ) -> Vec<NewSatRecommendation> {
        // Extract recommendations from the response
        let mut recommendations = Vec::new();

        // Convert week_start to NaiveDate for actionable_by calculations
        let base_date = week_start.date_naive();

        // Look for recommendation patterns
        if response.contains("video") || response.contains("demonstration") {
            recommendations.push(NewSatRecommendation {
                priority: SatRecommendationPriority::High,
                category: Some("Content".to_string()),
                recommendation: "Create visual content demonstrating BIZRA LAB technology"
                    .to_string(),
                rationale: Some(
                    "Visual demonstrations improve engagement and understanding".to_string(),
                ),
                actionable_by: base_date.checked_add_days(Days::new(7)),
            });
        }

        if response.contains("partnership") || response.contains("collaboration") {
            recommendations.push(NewSatRecommendation {
                priority: SatRecommendationPriority::Medium,
                category: Some("Partnership".to_string()),
                recommendation: "Explore strategic partnerships with aligned organizations"
                    .to_string(),
                rationale: Some(
                    "Partnerships can accelerate BIZRA LAB's mission reach".to_string(),
                ),
                actionable_by: base_date.checked_add_days(Days::new(14)),
            });
        }

        // Default recommendation if none found
        if recommendations.is_empty() {
            recommendations.push(NewSatRecommendation {
                priority: SatRecommendationPriority::Medium,
                category: Some("Growth".to_string()),
                recommendation: "Continue building BIZRA LAB's technical and community presence"
                    .to_string(),
                rationale: Some(
                    "Consistent presence builds credibility and attracts collaborators".to_string(),
                ),
                actionable_by: base_date.checked_add_days(Days::new(30)),
            });
        }

        recommendations
    }

    fn extract_section(&self, text: &str, start_pos: usize) -> String {
        // Extract content until next section marker or end
        let remaining = &text[start_pos..];
        let end_markers = ["TWITTER:", "LINKEDIN:", "GITHUB:", "\n\n"];

        let mut end_pos = remaining.len();
        for marker in &end_markers {
            if let Some(pos) = remaining.find(marker) {
                if pos < end_pos {
                    end_pos = pos;
                }
            }
        }

        remaining[..end_pos].to_string()
    }

    /// Store marketing plan in SAT outbox for human approval
    async fn store_content_plan(&self, plan: MarketingPlan) -> Result<()> {
        // Store content items
        for item in plan.outbox_items {
            self.insert_outbox_item(item).await?;
        }

        // Store recommendations
        for rec in plan.recommendations {
            self.insert_recommendation(rec).await?;
        }

        Ok(())
    }

    async fn insert_outbox_item(&self, new_item: NewSatOutboxItem) -> Result<Uuid> {
        let id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO sat_outbox_items
            (id, agent_type, channel_type, content_title, content_body, schedule_date, status, model_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(id)
        .bind(new_item.agent_type.as_str())
        .bind(new_item.channel_type.as_str())
        .bind(&new_item.content_title)
        .bind(&new_item.content_body)
        .bind(new_item.schedule_date)
        .bind(SatOutboxStatus::Draft.as_str())
        .bind(&new_item.model_id)
        .execute(&self.db)
        .await?;

        let model_info = new_item.model_id.as_deref().unwrap_or("unknown");
        info!(
            "📝 SAT outbox item created by {}: {} → {} ({})",
            model_info,
            new_item.agent_type.as_str(),
            new_item.channel_type.as_str(),
            new_item.content_title.unwrap_or_default()
        );

        Ok(id)
    }

    async fn insert_recommendation(&self, new_rec: NewSatRecommendation) -> Result<Uuid> {
        let id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO sat_recommendations
            (id, priority, category, recommendation, rationale, actionable_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(id)
        .bind(new_rec.priority.as_str())
        .bind(&new_rec.category)
        .bind(&new_rec.recommendation)
        .bind(&new_rec.rationale)
        .bind(new_rec.actionable_by)
        .execute(&self.db)
        .await?;

        info!(
            "💡 SAT recommendation created: {} priority - {}",
            new_rec.priority.as_str(),
            &new_rec.recommendation
        );

        Ok(id)
    }

    async fn log_sat_activity(
        &self,
        agent: SatAgentType,
        action: &str,
        details: serde_json::Value,
        impact_score: i32,
    ) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO sat_activities
            (agent_type, action_type, action_details, impact_score)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(agent.as_str())
        .bind(action)
        .bind(&details)
        .bind(impact_score)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Manual trigger for testing (v0.1 debugging)
    pub async fn generate_sample_content(&self) -> Result<()> {
        warn!("🧪 Generating SAT sample content - for development testing only");
        let context = BizraLabContext {
            week_start: Utc::now(),
            items: vec![
                "Testing SAT-LAB v0.1 functionality".to_string(),
                "Genesis system operational".to_string(),
            ],
        };

        let plan = self.generate_content_plan(&context).await?;
        self.store_content_plan(plan).await?;

        Ok(())
    }
}

/// Context about BIZRA LAB for SAT content generation
struct BizraLabContext {
    week_start: DateTime<Utc>,
    items: Vec<String>,
}

impl BizraLabContext {
    #[allow(dead_code)] // Reserved for future SAT summarization features
    fn summary(&self) -> String {
        self.items.join("; ")
    }
}
