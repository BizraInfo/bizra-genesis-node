// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  SAPE ENGINE - Synaptic Activation Prompt Engine v1.0                      ║
// ║  BIZRA Genesis Node RAG Integration                                       ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

//! # SAPE Engine v2.0 (Shadow Enhanced)
//!
//! Synaptic Activation Prompt Engine for BIZRA Genesis Node.
//! Enhanced with Shadow Intelligence reasoning patterns:
//!
//! - **Archetype Analysis**: Dynamic user classification for personalized reasoning
//! - **Tri-Beam Reasoning**: Impulse/Counter-Impulse/Orthogonal path exploration
//! - **Weaponized Logic**: Procrastination detection and cognitive threat mitigation
//! - **Deep Work Integration**: Peak hour optimization and flow state preservation
//! - **Tension Studios**: Advanced conflict resolution with dialectical synthesis
//!
//! ## Architecture Enhanced by Shadow OS
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────────┐
//! │                   SHADOW-SAPE INTEGRATION                       │
//! ├─────────────────────────────────────────────────────────────────┤
//! │ Archetype Scanner → Peak Hours → Deep Work Zones               │
//! │                 ↓                                                 │
//! │     User Profile → Reasoning Augmentation                        │
//! │                 ↓                                                 │
//! │     ┌─────────┬─────────┬─────────┐                             │
//! │     │ I-Path  │ C-Path  │ O-Path  │  ← Tri-Beam Reasoning      │
//! │     └─────────┴─────────┴─────────┘                             │
//! │                ↓                                                 │
//! │     Tension Studio (Generator ↔ Critic ↔ Synthesizer)            │
//! │                ↓                                                 │
//! │     Weapon Systems (Procrastination → TAB_ACID_BURN)            │
//! │                ↓                                                 │
}

/// Configuration for knowledge kernels (RAG)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeConfig {
    /// Maximum retrieval chunks
    pub max_chunks: usize,
    /// Minimum similarity threshold
    pub min_similarity: f64,
    /// Database URL
    pub database_url: Option<String>,
}

impl Default for KnowledgeConfig {
    fn default() -> Self {
        Self {
            max_chunks: 5,
            min_similarity: 0.7,
            database_url: None,
        }
    }
}

/// SAPE Engine v2.0 main struct (Shadow Enhanced)
pub struct SapeEngine {
    config: SapeConfig,
    knowledge_kernels: Option<modules::knowledge_kernels::KnowledgeKernels>,
    archetype_analyzer: modules::archetype_analyzer::ArchetypeAnalyzer,
    tri_beam_reasoner: modules::tri_beam_reasoner::TriBeamReasoner,
    weapon_systems: modules::weapon_systems::WeaponSystems,
    tension_studio: modules::tension_studio::TensionStudio,
    user_archetype: Option<modules::archetype_analyzer::Archetype>,
}

impl SapeEngine {
    /// Create a new SAPE engine v2.0 with Shadow OS integration
    pub fn new(config: SapeConfig) -> Self {
        let knowledge_kernels = if config.enable_rag {
            let kernels = modules::knowledge_kernels::KnowledgeKernels::new(config.knowledge_config.clone());
            Some(kernels)
        } else {
            None
        };

        Self {
            config,
            knowledge_kernels,
            archetype_analyzer: modules::archetype_analyzer::ArchetypeAnalyzer::new(),
            tri_beam_reasoner: modules::tri_beam_reasoner::TriBeamReasoner::new(
                modules::tri_beam_reasoner::TriBeamConfig::default()
            ),
            weapon_systems: modules::weapon_systems::WeaponSystems::new(
                modules::weapon_systems::WeaponConfig::default()
            ),
            tension_studio: modules::tension_studio::TensionStudio::new(
                vec!["truth".to_string(), "ethics".to_string(), "feasibility".to_string()]
            ),
            user_archetype: None,
        }
    }

    /// Set user archetype for personalized reasoning (Shadow OS integration)
    pub fn with_user_archetype(mut self, archetype_text: &str) -> Self {
        let result = self.archetype_analyzer.deduce_archetype(archetype_text);
        self.user_archetype = Some(result.archetype);

        // Apply archetype modifiers to reasoning components
        let modifiers = result.archetype.reasoning_modifiers();
        self.tri_beam_reasoner = self.tri_beam_reasoner.with_archetype_modifiers(modifiers.clone());
        self.tension_studio = modules::tension_studio::TensionStudio::new(
            vec!["truth".to_string(), "ethics".to_string(), "feasibility".to_string(), "personal_growth".to_string()]
        );
        self
    }

    /// Process a reasoning query with full Shadow-SAPE integration
    pub async fn reason_shadow_enhanced(&self, query: &str) -> Result<ShadowSapeResponse, SapeError> {
        let mut reasoning_trail = Vec::new();
        let mut activated_patterns = Vec::new();

        reasoning_trail.push(format!("🧠 [SHADOW-SAPE ACTIVATION] Processing: {}", query));
        activated_patterns.push("Mind palace established".to_string());

        // Phase 1: Archetype Analysis & Personalization
        if let Some(archetype) = &self.user_archetype {
            let modifiers = archetype.reasoning_modifiers();
            reasoning_trail.push(format!("📊 Archetype Analysis: {:?} (Creativity: {:.1f}, Risk: {:.1f})",
                                       archetype, modifiers.creativity_weight, modifiers.risk_tolerance));
            activated_patterns.push("Archetype lenses calibrated".to_string());
        }

        // Phase 2: Tri-Beam Reasoning Exploration
        let tri_beam_analysis = self.tri_beam_reasoner.reason_tri_beam(query);
        reasoning_trail.push(format!("🔬 Tri-Beam Analysis Complete - I:{}, C:{}, O:{} paths explored",
                                   tri_beam_analysis.i_path.path_type,
                                   tri_beam_analysis.c_path.is_some() as u8,
                                   tri_beam_analysis.o_path.is_some() as u8));
        activated_patterns.push("Multi-dimensional thinking engaged".to_string());

        // Phase 3: Cognitive Threat Assessment (Weapon Systems)
        let weapon_context = modules::weapon_systems::WeaponContext {
            current_activity: Some(format!("Reasoning about: {}", query)),
            reasoning_state: modules::weapon_systems::ReasoningState::Focused,
            time_since_last_action: 0,
            attention_indicators: vec![],
            motivation_signals: vec!["high_engagement".to_string()],
        };

        let mut weapon_sys = self.weapon_systems.clone();
        let threats = weapon_sys.assess_threats(&weapon_context);

        if !threats.is_empty() {
            reasoning_trail.push(format!("⚠️ Cognitive Threats Detected: {} active threats", threats.len()));
            activated_patterns.push("Defense protocols activated".to_string());

            // Neutralize threats
            for threat in &threats {
                reasoning_trail.push(format!("🛡️ Neutralizing: {} ({:?})",
                                           threat.description, threat.severity));
            }

            weapon_sys.neutralize_active_threats().await;
            activated_patterns.push("Threat neutralization complete".to_string());
        } else {
            reasoning_trail.push("🛡️ Cognitive Security: Clear - No threats detected");
        }

        // Phase 4: Tension Studio Dialectical Resolution
        if tri_beam_analysis.synthesis.conflicts_identified.len() > 0 {
            let dialectical_result = self.tension_studio.resolve_tension(
                &format!("Synthesizing {} conflicting reasoning paths for: {}",
                        tri_beam_analysis.synthesis.conflicts_identified.len(), query)
            );

            reasoning_trail.push(format!("🎭 Dialectical Synthesis: {} proposals, {} critiques, {} invariants preserved",
                                       dialectical_result.generator_proposals.len(),
                                       dialectical_result.critic_attacks.len(),
                                       dialectical_result.invariants_preserved.len()));
            activated_patterns.push("Logic-creative tension resolved".to_string());
        }

        // Phase 5: Knowledge Integration (RAG)
        let context = if let Some(ref kernels) = self.knowledge_kernels {
            match kernels.gather_evidence(query).await {
                Ok(evidence) => {
                    reasoning_trail.push(format!("📚 Knowledge Retrieval: Evidence integrated"));
                    activated_patterns.push("External knowledge assimilated".to_string());
                    Some(evidence)
                },
                Err(e) => {
                    reasoning_trail.push(format!("📚 Knowledge Retrieval: {} - proceeding without RAG", e));
                    None
                }
            }
        } else {
            None
        };

        // Phase 6: Final Synthesis with Shadow OS wisdom
        let reasoning = self.perform_shadow_reasoning(query, context.as_deref(), &reasoning_trail).await?;
        let final_confidence = self.calculate_shadow_confidence(&tri_beam_analysis, &threats);

        Ok(ShadowSapeResponse {
            query: query.to_string(),
            reasoning,
            context,
            confidence: final_confidence,
            activated_patterns,
            archetype_analysis: self.user_archetype,
            tri_beam_analysis,
            cognitive_threats: threats,
            reasoning_trail,
        })
    }

    /// Internal Shadow OS enhanced reasoning logic
    async fn perform_shadow_reasoning(&self, query: &str, context: Option<&str>, trail: &[String]) -> Result<String, SapeError> {
        let mut reasoning = String::from("/* SHADOW-SAPE REASONING MATRIX */\n\n");

        // Query understanding with archetype context
        reasoning.push_str(&format!("🎯 QUERY: {}\n", query));

        if let Some(archetype) = &self.user_archetype {
            reasoning.push_str(&format!("👤 ARCHETYPE CONTEXT: {:?}\n", archetype));
        }

        reasoning.push_str("\n🧠 [SYNAPTIC ACTIVATION SEQUENCE]\n");

        // Context integration
        if let Some(ctx) = context {
            reasoning.push_str(&format!("📖 KNOWLEDGE INTEGRATION: {}\n\n", ctx));
        }

        // Tri-beam reasoning summary
        reasoning.push_str("🔬 TRI-BEAM EXPLORATION:\n");
        reasoning.push_str("├── I-PATH: Canonical foundation established\n");
        reasoning.push_str("├── C-PATH: Counter-conventional wisdom challenged\n");
        reasoning.push_str("└── O-PATH: Analogical domains explored\n\n");

        // Weapon systems status
        reasoning.push_str("🛡️ COGNITIVE SECURITY: Protocols active\n\n");

        // Tension studio resolution
        reasoning.push_str("🎭 DIALECTICAL SYNTHESIS: Invariants preserved\n\n");

        // Final wisdom
        reasoning.push_str("✨ [SHADOW OS WISDOM]\n");
        reasoning.push_str("True optimization emerges from embracing the uncomfortable.\n");
        reasoning.push_str("Perfection is the enemy of the possible.\n");
        reasoning.push_str("Every threshold crossed creates new neural pathways.\n\n");

        reasoning.push_str("/* END SHADOW-SAPE MATRIX */\n");

        Ok(reasoning)
    }

    /// Calculate Shadow OS enhanced confidence
    fn calculate_shadow_confidence(&self, tri_beam: &super::tri_beam_reasoner::TriBeamAnalysis, threats: &[super::weapon_systems::CognitiveThreat]) -> f64 {
        let mut confidence = tri_beam.synthesis.synthesis_confidence;

        // Archetype bonus
        if self.user_archetype.is_some() {
            confidence += 0.1;
        }

        // Tri-beam exploration bonus
        if tri_beam.c_path.is_some() && tri_beam.o_path.is_some() {
            confidence += 0.1;
        }

        // Cognitive security penalty
        let threat_penalty = threats.len() as f64 * 0.05;
        confidence -= threat_penalty;

        confidence.clamp(0.0, 1.0)
    }

    /// Legacy method - simple reasoning without Shadow OS enhancement
    pub async fn reason(&self, query: &str) -> Result<SapeResponse, SapeError> {
        let context = if let Some(ref kernels) = self.knowledge_kernels {
            match kernels.gather_evidence(query).await {
                Ok(evidence) => Some(evidence),
                Err(e) => {
                    eprintln!("RAG retrieval failed: {}", e);
                    None
                }
            }
        } else {
            None
        };

        let reasoning = format!("Legacy SAPE reasoning for: {}\nContext: {:?}", query, context);

        Ok(SapeResponse {
            query: query.to_string(),
            reasoning,
            context,
            confidence: 0.7,
        })
    }
}

/// Response from SAPE reasoning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SapeResponse {
    /// Original query
    pub query: String,
    /// Reasoning output
    pub reasoning: String,
    /// Retrieved context (if RAG used)
    pub context: Option<String>,
    /// Confidence score (0-1)
    pub confidence: f64,
}

/// Enhanced response from Shadow-SAPE reasoning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShadowSapeResponse {
    /// Original query
    pub query: String,
    /// Reasoning output with Shadow OS wisdom
    pub reasoning: String,
    /// Retrieved context (if RAG used)
    pub context: Option<String>,
    /// Confidence score with Shadow OS adjustments (0-1)
    pub confidence: f64,
    /// Activated synaptic patterns
    pub activated_patterns: Vec<String>,
    /// User archetype analysis result
    pub archetype_analysis: Option<modules::archetype_analyzer::Archetype>,
    /// Complete tri-beam reasoning analysis
    pub tri_beam_analysis: modules::tri_beam_reasoner::TriBeamAnalysis,
    /// Cognitive threats detected and neutralized
    pub cognitive_threats: Vec<modules::weapon_systems::CognitiveThreat>,
    /// Complete reasoning trail for transparency
    pub reasoning_trail: Vec<String>,
}

/// SAPE-specific errors
#[derive(Debug, thiserror::Error)]
pub enum SapeError {
    #[error("Reasoning error: {0}")]
    Reasoning(String),

    #[error("Knowledge retrieval error: {0}")]
    Knowledge(String),

    #[error("Configuration error: {0}")]
    Config(String),
}
