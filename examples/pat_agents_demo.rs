// examples/pat_agents_demo.rs
// Demonstration of Personal Agentic Team (PAT) with MOE integration
// Shows how 7 specialized agents collaborate using real AI models

use std::error::Error;
use std::sync::Arc;
use synthesis_orchestrator::{
    agents::pat::PATManager,
    agents::{a2a::WorkflowOrchestrator, AgentRole},
    AIBackend, MoeBackend, SimulatedBackend, Task,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter("synthesis_orchestrator=info,bizra_moe=info")
        .init();

    println!("\n╔═══════════════════════════════════════════════════════════════╗");
    println!("║  BIZRA Personal Agentic Team (PAT) - Demonstration          ║");
    println!("║  7 Specialized Agents + Multi-Model Ensemble (MOE)           ║");
    println!("╚═══════════════════════════════════════════════════════════════╝\n");

    // Select backend mode
    let use_real_moe = std::env::var("USE_OLLAMA").is_ok();

    let ai_backend: Arc<dyn AIBackend> = if use_real_moe {
        println!("🤖 Using REAL MOE backend with Ollama models");
        println!("   Ensure Ollama is running: `ollama serve`\n");

        let moe_config = bizra_moe::OllamaConfig {
            base_url: "http://localhost:11434".to_string(),
            timeout: std::time::Duration::from_secs(30),
            models: vec![
                "llama3.2".to_string(),
                "mistral-nemo".to_string(),
                "qwen2.5:latest".to_string(),
            ],
            min_healthy_models: 1,
            health_check_interval: std::time::Duration::from_secs(30),
            ihsan_threshold: 0.75,
        };

        Arc::new(MoeBackend::with_config(moe_config))
    } else {
        println!("🎭 Using SIMULATED backend (no Ollama needed)");
        println!("   Set USE_OLLAMA=1 to use real AI models\n");
        Arc::new(SimulatedBackend)
    };

    // Create PAT Manager with 7 agents
    let mut pat_manager = PATManager::new(ai_backend.clone());

    // Example 1: Selective Workflow (Business Strategy)
    println!("═══════════════════════════════════════════════════════════════");
    println!("📋 Example 1: Business Strategy Planning");
    println!("   Agents: Planner → Researcher → Evaluator");
    println!("═══════════════════════════════════════════════════════════════\n");

    let business_task = Task {
        examples: Some(vec![serde_json::json!({
            "domain": "business",
            "objective": "Create a go-to-market strategy for a new AI-powered productivity tool",
            "constraints": [
                "Budget: $50,000",
                "Timeline: 3 months",
                "Target: Small businesses and freelancers"
            ]
        })]),
    };

    let business_roles = vec![
        AgentRole::Planner,
        AgentRole::Researcher,
        AgentRole::Evaluator,
    ];

    match pat_manager
        .execute_selective_workflow(&business_task, business_roles)
        .await
    {
        Ok(responses) => {
            println!("✅ Business Strategy Completed!");
            println!("   Agents processed: {}", responses.len());
            for response in &responses {
                println!(
                    "   • {}: Confidence {:.1}%, Ihsān {:.1}%",
                    response.agent.name(),
                    response.confidence * 100.0,
                    response.ihsan_score * 100.0
                );
            }
            println!();
        }
        Err(e) => println!("❌ Business strategy failed: {}\n", e),
    }

    // Example 2: Creative Content Creation
    println!("═══════════════════════════════════════════════════════════════");
    println!("🎨 Example 2: Creative Content Creation");
    println!("   Agents: Researcher → Coder → Ethicist → Publisher");
    println!("═══════════════════════════════════════════════════════════════\n");

    let creative_task = Task {
        examples: Some(vec![serde_json::json!({
            "domain": "creative",
            "objective": "Write an educational blog post about climate change",
            "requirements": [
                "Target audience: General public",
                "Length: 1000-1500 words",
                "Tone: Informative but accessible",
                "Include: Latest research, actionable tips, hope-focused"
            ]
        })]),
    };

    let creative_roles = vec![
        AgentRole::Researcher,
        AgentRole::Coder, // Creates the content
        AgentRole::Ethicist,
        AgentRole::Publisher,
    ];

    match pat_manager
        .execute_selective_workflow(&creative_task, creative_roles)
        .await
    {
        Ok(responses) => {
            println!("✅ Creative Content Completed!");
            println!("   Agents processed: {}", responses.len());
            for response in &responses {
                println!(
                    "   • {}: Confidence {:.1}%, Ihsān {:.1}%",
                    response.agent.name(),
                    response.confidence * 100.0,
                    response.ihsan_score * 100.0
                );
            }
            println!();
        }
        Err(e) => println!("❌ Content creation failed: {}\n", e),
    }

    // Example 3: Full PAT Workflow (Software Development)
    println!("═══════════════════════════════════════════════════════════════");
    println!("🚀 Example 3: Complete PAT Workflow");
    println!("   All 7 Agents: Plan → Research → Code → Evaluate → Ethics → Publish → Integrate");
    println!("═══════════════════════════════════════════════════════════════\n");

    let software_task = Task {
        examples: Some(vec![serde_json::json!({
            "domain": "software",
            "objective": "Design a Rust library for secure password management",
            "requirements": [
                "Zero-knowledge encryption",
                "Cross-platform (Windows, Linux, macOS)",
                "CLI and library API",
                "Comprehensive documentation",
                "MIT or Apache-2.0 license"
            ]
        })]),
    };

    match pat_manager.execute_full_workflow(&software_task).await {
        Ok(final_result) => {
            println!("✅ Full PAT Workflow Completed!");
            println!(
                "   Final Ihsān Score: {:.1}%",
                final_result.ihsan_score * 100.0
            );
            println!("   Confidence: {:.1}%", final_result.confidence * 100.0);
            println!("   Latency: {}ms", final_result.latency_ms);
            println!("   Integrated by: {}", final_result.agent.name());
            println!();
        }
        Err(e) => println!("❌ Full workflow failed: {}\n", e),
    }

    // Example 4: Parallel Workflow (Research Project)
    println!("═══════════════════════════════════════════════════════════════");
    println!("⚡ Example 4: Parallel Agent Execution");
    println!("   All agents work simultaneously, then integrate");
    println!("═══════════════════════════════════════════════════════════════\n");

    let research_task = Task {
        examples: Some(vec![serde_json::json!({
            "domain": "research",
            "objective": "Analyze the impact of AI on healthcare delivery",
            "scope": [
                "Diagnostic accuracy improvements",
                "Cost-benefit analysis",
                "Ethical considerations",
                "Patient outcomes data",
                "Future trends and predictions"
            ]
        })]),
    };

    match pat_manager.execute_parallel_workflow(&research_task).await {
        Ok(responses) => {
            println!("✅ Parallel Workflow Completed!");
            println!("   Total outputs: {}", responses.len());

            let avg_ihsan =
                responses.iter().map(|r| r.ihsan_score).sum::<f32>() / responses.len() as f32;
            let avg_confidence =
                responses.iter().map(|r| r.confidence).sum::<f32>() / responses.len() as f32;

            println!("   Average Ihsān: {:.1}%", avg_ihsan * 100.0);
            println!("   Average Confidence: {:.1}%", avg_confidence * 100.0);
            println!();

            println!("   Individual Agent Performance:");
            for response in &responses {
                println!(
                    "     • {:<20} | Ihsān: {:.1}% | Confidence: {:.1}% | {}ms",
                    response.agent.name(),
                    response.ihsan_score * 100.0,
                    response.confidence * 100.0,
                    response.latency_ms
                );
            }
            println!();
        }
        Err(e) => println!("❌ Parallel workflow failed: {}\n", e),
    }

    // Example 5: A2A Coordination with Workflow Orchestrator
    println!("═══════════════════════════════════════════════════════════════");
    println!("🔗 Example 5: Agent-to-Agent (A2A) Coordination");
    println!("   Using WorkflowOrchestrator for advanced routing");
    println!("═══════════════════════════════════════════════════════════════\n");

    let workflow = WorkflowOrchestrator::new();

    // Sequential workflow: Plan → Research → Code
    let sequential_agents = vec![AgentRole::Planner, AgentRole::Researcher, AgentRole::Coder];

    let coordination_task = Task {
        examples: Some(vec![serde_json::json!({
            "domain": "personal",
            "objective": "Plan a 2-week trip to Japan",
            "preferences": [
                "Budget-friendly",
                "Mix of cultural and modern experiences",
                "Vegetarian food options",
                "Off-the-beaten-path destinations"
            ]
        })]),
    };

    match workflow
        .execute_sequential(sequential_agents.clone(), coordination_task.clone())
        .await
    {
        Ok(_) => {
            println!("✅ A2A Sequential Coordination Successful!");
            println!("   Agents coordinated: {}", sequential_agents.len());
            println!(
                "   Pending messages: {}",
                workflow.coordinator().pending_count().await
            );
            println!();
        }
        Err(e) => println!("❌ A2A coordination failed: {}\n", e),
    }

    // Team Performance Summary
    println!("═══════════════════════════════════════════════════════════════");
    println!("📊 PAT Team Performance Summary");
    println!("═══════════════════════════════════════════════════════════════\n");

    let team_metrics = pat_manager.get_team_metrics();
    println!(
        "Total Tasks Completed: {}",
        team_metrics.total_tasks_completed
    );
    println!("Total Tasks Failed: {}", team_metrics.total_tasks_failed);
    println!("Success Rate: {:.1}%", team_metrics.success_rate() * 100.0);
    println!("Average Latency: {:.0}ms", team_metrics.avg_latency_ms);
    println!(
        "Average Confidence: {:.1}%",
        team_metrics.avg_confidence * 100.0
    );
    println!("Total Tokens Used: ~{}", team_metrics.total_tokens_used);
    println!(
        "Average Tasks/Agent: {:.1}",
        team_metrics.avg_tasks_per_agent()
    );

    println!("\n╔═══════════════════════════════════════════════════════════════╗");
    println!("║  PAT Demonstration Complete!                                 ║");
    println!("╚═══════════════════════════════════════════════════════════════╝\n");

    println!("💡 Key Takeaways:");
    println!("   • 7 PAT agents seamlessly integrate with MOE backend");
    println!("   • Domain-agnostic: business, creative, research, software, personal");
    println!("   • Multiple workflow patterns: selective, full, parallel, sequential");
    println!("   • Agent-to-Agent (A2A) coordination for complex tasks");
    println!("   • Ihsān-based quality metrics ensure excellence");
    println!("\n🔧 Next Steps:");
    println!("   • Add SAT (System Agentic Team) for infrastructure management");
    println!("   • Implement persistent agent memory");
    println!("   • Add agent learning and adaptation");
    println!("   • Create web UI for agent interaction\n");

    Ok(())
}
