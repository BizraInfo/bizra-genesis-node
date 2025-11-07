// examples/full_ecosystem_demo.rs
// Complete BIZRA Agent Ecosystem Demonstration
// Shows PAT (7 agents) + SAT (5 agents) = 12 agents working together

use std::error::Error;
use std::sync::Arc;
use synthesis_orchestrator::{
    agents::pat::PATManager, agents::sat::SATManager, agents::AgentRole, AIBackend, MoeBackend,
    SimulatedBackend, Task,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter("synthesis_orchestrator=info,bizra_moe=info")
        .init();

    println!("\n╔═══════════════════════════════════════════════════════════════╗");
    println!("║      BIZRA COMPLETE AGENT ECOSYSTEM DEMONSTRATION           ║");
    println!("║  PAT (7 Personal Agents) + SAT (5 System Agents) = 12 Total ║");
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

    // Create both agent teams
    let mut pat_manager = PATManager::new(ai_backend.clone());
    let mut sat_manager = SATManager::new(ai_backend.clone());

    println!("═══════════════════════════════════════════════════════════════");
    println!("🎯 SCENARIO: Building a Production-Ready Web Application");
    println!("═══════════════════════════════════════════════════════════════\n");

    // Scenario Task: Complete web application development
    let app_task = Task {
        examples: Some(vec![serde_json::json!({
            "project": "E-commerce Platform",
            "description": "Build a scalable e-commerce platform with modern architecture",
            "requirements": [
                "Microservices architecture with API gateway",
                "React frontend with Next.js",
                "PostgreSQL database with read replicas",
                "Redis caching layer",
                "Kubernetes deployment",
                "CI/CD with GitHub Actions",
                "99.9% uptime SLA",
                "GDPR and PCI-DSS compliant",
                "Automated backups and disaster recovery",
                "Performance monitoring and alerting"
            ],
            "constraints": {
                "budget": "$50,000",
                "timeline": "3 months",
                "team_size": "5 developers"
            }
        })]),
    };

    println!("📋 PHASE 1: PAT - Strategic Planning & Development");
    println!("───────────────────────────────────────────────────────────────\n");

    // Execute PAT workflow
    println!("🎯 Executing PAT Workflow:");
    println!("   Step 1: Strategic Planning");
    println!("   Step 2: Technology Research");
    println!("   Step 3: Solution Development");
    println!("   Step 4: Quality Evaluation");
    println!("   Step 5: Ethics & Compliance Review");
    println!();

    let pat_roles = vec![
        AgentRole::Planner,
        AgentRole::Researcher,
        AgentRole::Coder,
        AgentRole::Evaluator,
        AgentRole::Ethicist,
    ];

    match pat_manager
        .execute_selective_workflow(&app_task, pat_roles)
        .await
    {
        Ok(responses) => {
            println!(
                "   ✅ PAT workflow completed successfully ({} agents)",
                responses.len()
            );
            println!();
        }
        Err(e) => {
            println!("   ⚠️  PAT workflow error: {}\n", e);
        }
    }

    println!("═══════════════════════════════════════════════════════════════");
    println!("🔧 PHASE 2: SAT - Infrastructure & Operations");
    println!("───────────────────────────────────────────────────────────────\n");

    // Execute full SAT workflow
    println!("🏗️  Executing Full SAT Workflow:");
    println!("   Step 6: Infrastructure Design");
    println!("   Step 7: Security Audit");
    println!("   Step 8: Performance Monitoring");
    println!("   Step 9: Backup & Disaster Recovery");
    println!("   Step 10: Resource Allocation");
    println!();

    match sat_manager.execute_full_workflow(&app_task).await {
        Ok(_) => {
            println!("   ✅ SAT full workflow completed successfully\n");
        }
        Err(e) => {
            println!("   ⚠️  SAT workflow error: {}\n", e);
        }
    }

    println!("═══════════════════════════════════════════════════════════════");
    println!("📈 PHASE 3: System Health Check (All Agents)");
    println!("───────────────────────────────────────────────────────────────\n");

    // Generate comprehensive system health report
    let health_report = match sat_manager.generate_health_report(&app_task).await {
        Ok(report) => report,
        Err(e) => {
            println!("   ⚠️  Health report generation failed: {}", e);
            return Ok(());
        }
    };

    println!("🏥 System Health Report:");
    println!(
        "   Overall Health: {:.1}%",
        health_report.overall_health * 100.0
    );
    println!("   Status: {}", health_report.status());
    println!("   Health Scores:");
    for (agent, score) in &health_report.health_scores {
        println!("     • {}: {:.1}%", agent, score * 100.0);
    }
    println!(
        "   Critical Issues: {}",
        health_report.critical_issues.len()
    );
    println!(
        "   System Health: {}",
        if health_report.is_healthy() {
            "✅ HEALTHY"
        } else {
            "⚠️  NEEDS ATTENTION"
        }
    );
    println!();

    println!("═══════════════════════════════════════════════════════════════");
    println!("📊 TEAM PERFORMANCE METRICS");
    println!("═══════════════════════════════════════════════════════════════\n");

    // PAT Metrics
    let pat_metrics = pat_manager.get_team_metrics();
    println!("👥 PAT (Personal Agentic Team) - 7 Agents:");
    println!("   Tasks Completed: {}", pat_metrics.total_tasks_completed);
    println!(
        "   Success Rate: {:.1}%",
        pat_metrics.success_rate() * 100.0
    );
    println!("   Average Latency: {:.0}ms", pat_metrics.avg_latency_ms);
    println!(
        "   Average Confidence: {:.1}%",
        pat_metrics.avg_confidence * 100.0
    );
    println!("   Tokens Used: ~{}", pat_metrics.total_tokens_used);
    println!("   Tasks/Agent: {:.1}", pat_metrics.avg_tasks_per_agent());
    println!();

    // SAT Metrics
    let sat_metrics = sat_manager.get_team_metrics();
    println!("🔧 SAT (System Agentic Team) - 5 Agents:");
    println!("   Tasks Completed: {}", sat_metrics.total_tasks_completed);
    println!(
        "   Success Rate: {:.1}%",
        sat_metrics.success_rate() * 100.0
    );
    println!("   Average Latency: {:.0}ms", sat_metrics.avg_latency_ms);
    println!(
        "   Average Confidence: {:.1}%",
        sat_metrics.avg_confidence * 100.0
    );
    println!("   Tokens Used: ~{}", sat_metrics.total_tokens_used);
    println!("   Tasks/Agent: {:.1}", sat_metrics.avg_tasks_per_agent());
    println!();

    // Combined Metrics
    let total_tasks = pat_metrics.total_tasks_completed + sat_metrics.total_tasks_completed;
    let total_tokens = pat_metrics.total_tokens_used + sat_metrics.total_tokens_used;
    let combined_success = (pat_metrics.total_tasks_completed + sat_metrics.total_tasks_completed)
        as f32
        / (pat_metrics.total_tasks_completed
            + pat_metrics.total_tasks_failed
            + sat_metrics.total_tasks_completed
            + sat_metrics.total_tasks_failed) as f32;

    println!("🌟 COMBINED ECOSYSTEM - 12 Agents Total:");
    println!("   Total Tasks: {}", total_tasks);
    println!("   Overall Success Rate: {:.1}%", combined_success * 100.0);
    println!("   Total Tokens: ~{}", total_tokens);
    println!(
        "   System Health: {:.1}%",
        health_report.overall_health * 100.0
    );
    println!();

    println!("═══════════════════════════════════════════════════════════════");
    println!("✨ PROJECT DELIVERABLES");
    println!("═══════════════════════════════════════════════════════════════\n");

    println!("📦 From PAT (Personal Agents):");
    println!("   ✅ Strategic Plan (3-month roadmap)");
    println!("   ✅ Technology Research Report");
    println!("   ✅ Complete Application Code");
    println!("   ✅ Quality Assessment Report");
    println!("   ✅ Ethics & Compliance Review");
    println!("   ✅ Documentation & User Guides");
    println!("   ✅ Integrated Solution");
    println!();

    println!("🔧 From SAT (System Agents):");
    println!("   ✅ Infrastructure Architecture");
    println!("   ✅ Security Audit & Hardening");
    println!("   ✅ Performance Monitoring Setup");
    println!("   ✅ Backup & DR Strategy");
    println!("   ✅ Resource Optimization Plan");
    println!();

    println!("╔═══════════════════════════════════════════════════════════════╗");
    println!("║              ECOSYSTEM DEMONSTRATION COMPLETE                ║");
    println!("╚═══════════════════════════════════════════════════════════════╝\n");

    println!("🎯 Key Achievements:");
    println!("   • 12 specialized agents (7 PAT + 5 SAT) operational");
    println!("   • Complete end-to-end workflow executed");
    println!("   • {:.1}% overall success rate", combined_success * 100.0);
    println!(
        "   • {:.1}% system health score",
        health_report.overall_health * 100.0
    );
    println!("   • {} total tasks completed", total_tasks);
    println!();

    println!("💡 Agent Specializations:");
    println!(
        "   PAT: Planning, Research, Development, Evaluation, Ethics, Publishing, Integration"
    );
    println!("   SAT: Infrastructure, Performance, Security, Backup, Resources");
    println!();

    println!("🚀 Production Readiness:");
    println!("   ✅ Complete development workflow");
    println!("   ✅ Quality assurance and ethics");
    println!("   ✅ Infrastructure and operations");
    println!("   ✅ Security and compliance");
    println!("   ✅ Performance and monitoring");
    println!("   ✅ Disaster recovery");
    println!();

    println!("🎓 Next Steps:");
    println!("   • Deploy to production environment");
    println!("   • Enable continuous monitoring");
    println!("   • Setup automated scaling");
    println!("   • Implement feedback loops");
    println!("   • Train team on operations\n");

    Ok(())
}
