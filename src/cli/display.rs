// src/cli/display.rs
// BIZRA Professional Display System
// World-Class Output Formatting and Visualization

use crate::agents::{AgentResponse, AgentMetrics, TeamMetrics};
use std::time::Duration;

/// Color codes for terminal output
pub struct Colors;

impl Colors {
    pub const RESET: &'static str = "\x1b[0m";
    pub const BOLD: &'static str = "\x1b[1m";
    pub const DIM: &'static str = "\x1b[2m";

    // Foreground colors
    pub const RED: &'static str = "\x1b[31m";
    pub const GREEN: &'static str = "\x1b[32m";
    pub const YELLOW: &'static str = "\x1b[33m";
    pub const BLUE: &'static str = "\x1b[34m";
    pub const MAGENTA: &'static str = "\x1b[35m";
    pub const CYAN: &'static str = "\x1b[36m";
    pub const WHITE: &'static str = "\x1b[37m";

    // Bright colors
    pub const BRIGHT_RED: &'static str = "\x1b[91m";
    pub const BRIGHT_GREEN: &'static str = "\x1b[92m";
    pub const BRIGHT_YELLOW: &'static str = "\x1b[93m";
    pub const BRIGHT_BLUE: &'static str = "\x1b[94m";
    pub const BRIGHT_MAGENTA: &'static str = "\x1b[95m";
    pub const BRIGHT_CYAN: &'static str = "\x1b[96m";
}

/// Display formatter
pub struct Display {
    color_enabled: bool,
}

impl Display {
    pub fn new(color_enabled: bool) -> Self {
        Self { color_enabled }
    }

    /// Format text with color
    fn colorize(&self, text: &str, color: &str) -> String {
        if self.color_enabled {
            format!("{}{}{}", color, text, Colors::RESET)
        } else {
            text.to_string()
        }
    }

    /// Display welcome banner
    pub fn welcome_banner(&self) {
        let line = "╔═══════════════════════════════════════════════════════════════╗";
        println!("\n{}", self.colorize(line, Colors::BRIGHT_CYAN));
        println!("{}", self.colorize("║           BIZRA GENESIS NODE - AGENT ORCHESTRATOR            ║", Colors::BRIGHT_CYAN));
        println!("{}", self.colorize("║          Professional Elite Multi-Agent System               ║", Colors::BRIGHT_CYAN));
        let line = "╚═══════════════════════════════════════════════════════════════╝";
        println!("{}", self.colorize(line, Colors::BRIGHT_CYAN));
        println!();
        println!("🤖 12 Specialized Agents Ready");
        println!("⚡ MOE Backend with Parallel Execution");
        println!("🔒 Enterprise-Grade Security & Compliance");
        println!("📊 Real-Time Performance Monitoring");
        println!();
    }

    /// Display progress bar
    pub fn progress_bar(&self, current: usize, total: usize, label: &str) {
        let percentage = if total > 0 {
            (current as f32 / total as f32 * 100.0) as usize
        } else {
            0
        };

        let bar_width = 50;
        let filled = (percentage * bar_width / 100).min(bar_width);
        let empty = bar_width - filled;

        let bar = format!(
            "[{}{}{}] {}/{} ({}%)",
            self.colorize(&"█".repeat(filled), Colors::BRIGHT_GREEN),
            " ".repeat(empty),
            Colors::RESET,
            current,
            total,
            percentage
        );

        print!("\r{} {}", label, bar);
        if current >= total {
            println!();
        }
    }

    /// Display agent response
    pub fn agent_response(&self, response: &AgentResponse) {
        let agent_name = response.agent.name();
        let confidence = response.confidence;
        let latency_ms = response.latency_ms;

        let separator = "─────────────────────────────────────────────────────────────────";
        println!("\n{}", self.colorize(separator, Colors::DIM));
        println!("🤖 {} {}",
            self.colorize("Agent:", Colors::BOLD),
            self.colorize(agent_name, Colors::BRIGHT_CYAN)
        );
        println!("📊 {} {:.1}% | ⏱️  {} {}ms",
            self.colorize("Confidence:", Colors::BOLD),
            confidence * 100.0,
            self.colorize("Latency:", Colors::BOLD),
            latency_ms
        );

        if !response.reasoning.is_empty() {
            println!("\n💭 {}:", self.colorize("Reasoning", Colors::BOLD));
            println!("   {}", response.reasoning);
        }

        // Display result (JSON value)
        println!("\n📤 {}:", self.colorize("Result", Colors::BOLD));
        if let Ok(pretty) = serde_json::to_string_pretty(&response.result) {
            for line in pretty.lines().take(20) {
                println!("   {}", line);
            }
            if pretty.lines().count() > 20 {
                println!("   {} ...", self.colorize("(truncated)", Colors::DIM));
            }
        }

        println!("{}", self.colorize(separator, Colors::DIM));
    }

    /// Display workflow start
    pub fn workflow_start(&self, workflow_name: &str, agent_count: usize) {
        let separator = "═════════════════════════════════════════════════════════════════";
        println!("\n{}", self.colorize(separator, Colors::BRIGHT_BLUE));
        println!("🚀 {} {}",
            self.colorize("Starting Workflow:", Colors::BOLD),
            self.colorize(workflow_name, Colors::BRIGHT_YELLOW)
        );
        println!("👥 {} {}",
            self.colorize("Agents:", Colors::BOLD),
            agent_count
        );
        println!("{}", self.colorize(separator, Colors::BRIGHT_BLUE));
    }

    /// Display workflow completion
    pub fn workflow_complete(&self, workflow_name: &str, duration: Duration, success: bool) {
        let status = if success {
            self.colorize("✅ SUCCESS", Colors::BRIGHT_GREEN)
        } else {
            self.colorize("❌ FAILED", Colors::BRIGHT_RED)
        };

        let separator = "═════════════════════════════════════════════════════════════════";
        println!("\n{}", self.colorize(separator, Colors::BRIGHT_BLUE));
        println!("🏁 {} {} - {}",
            self.colorize("Workflow Complete:", Colors::BOLD),
            self.colorize(workflow_name, Colors::BRIGHT_YELLOW),
            status
        );
        println!("⏱️  {} {}ms",
            self.colorize("Duration:", Colors::BOLD),
            duration.as_millis()
        );
        println!("{}", self.colorize(separator, Colors::BRIGHT_BLUE));
    }

    /// Display team metrics
    pub fn team_metrics(&self, team_name: &str, metrics: &TeamMetrics) {
        println!("\n{}", self.colorize(&format!("📊 {} Metrics", team_name), Colors::BOLD));
        let separator = "─────────────────────────────────────────────────────────────────";
        println!("{}", self.colorize(separator, Colors::DIM));

        println!("  {} {}",
            self.colorize("Tasks Completed:", Colors::CYAN),
            metrics.total_tasks_completed
        );
        println!("  {} {}",
            self.colorize("Tasks Failed:", Colors::CYAN),
            metrics.total_tasks_failed
        );
        println!("  {} {:.1}%",
            self.colorize("Success Rate:", Colors::CYAN),
            metrics.success_rate() * 100.0
        );
        println!("  {} {:.0}ms",
            self.colorize("Avg Latency:", Colors::CYAN),
            metrics.avg_latency_ms
        );
        println!("  {} {:.1}%",
            self.colorize("Avg Confidence:", Colors::CYAN),
            metrics.avg_confidence * 100.0
        );
        println!("  {} ~{}",
            self.colorize("Tokens Used:", Colors::CYAN),
            metrics.total_tokens_used
        );
        println!("  {} {:.1}",
            self.colorize("Tasks/Agent:", Colors::CYAN),
            metrics.avg_tasks_per_agent()
        );
    }

    /// Display agent metrics
    pub fn agent_metrics(&self, agent_name: &str, metrics: &AgentMetrics) {
        println!("\n{}", self.colorize(&format!("🤖 {} Performance", agent_name), Colors::BOLD));
        let separator = "─────────────────────────────────────────────────────────────────";
        println!("{}", self.colorize(separator, Colors::DIM));

        println!("  {} {}",
            self.colorize("Tasks Completed:", Colors::CYAN),
            metrics.tasks_completed
        );
        println!("  {} {}",
            self.colorize("Tasks Failed:", Colors::CYAN),
            metrics.tasks_failed
        );

        if metrics.tasks_completed > 0 {
            let success_rate = metrics.tasks_completed as f32 /
                (metrics.tasks_completed + metrics.tasks_failed) as f32;
            println!("  {} {:.1}%",
                self.colorize("Success Rate:", Colors::CYAN),
                success_rate * 100.0
            );
        }

        println!("  {} {:.0}ms",
            self.colorize("Avg Latency:", Colors::CYAN),
            metrics.avg_latency_ms
        );
        println!("  {} {:.1}%",
            self.colorize("Avg Confidence:", Colors::CYAN),
            metrics.avg_confidence * 100.0
        );
        println!("  {} ~{}",
            self.colorize("Tokens Used:", Colors::CYAN),
            metrics.total_tokens_used
        );
    }

    /// Display health status
    pub fn health_status(&self, health_score: f32) {
        let (status, color) = if health_score >= 0.9 {
            ("🟢 EXCELLENT", Colors::BRIGHT_GREEN)
        } else if health_score >= 0.7 {
            ("🟡 GOOD", Colors::BRIGHT_YELLOW)
        } else if health_score >= 0.5 {
            ("🟠 WARNING", Colors::BRIGHT_YELLOW)
        } else {
            ("🔴 CRITICAL", Colors::BRIGHT_RED)
        };

        println!("\n🏥 {} {:.1}% - {}",
            self.colorize("System Health:", Colors::BOLD),
            health_score * 100.0,
            self.colorize(status, color)
        );
    }

    /// Display error
    pub fn error(&self, error: &str) {
        println!("\n{} {}",
            self.colorize("❌ Error:", Colors::BRIGHT_RED),
            error
        );
    }

    /// Display warning
    pub fn warning(&self, warning: &str) {
        println!("\n{} {}",
            self.colorize("⚠️  Warning:", Colors::BRIGHT_YELLOW),
            warning
        );
    }

    /// Display info
    pub fn info(&self, info: &str) {
        println!("\n{} {}",
            self.colorize("ℹ️  Info:", Colors::BRIGHT_BLUE),
            info
        );
    }

    /// Display success
    pub fn success(&self, message: &str) {
        println!("\n{} {}",
            self.colorize("✅ Success:", Colors::BRIGHT_GREEN),
            message
        );
    }

    /// Display section header
    pub fn section_header(&self, title: &str) {
        let separator = "═════════════════════════════════════════════════════════════════";
        println!("\n{}", self.colorize(separator, Colors::BRIGHT_BLUE));
        println!("{}", self.colorize(&format!("  {}", title), Colors::BOLD));
        println!("{}", self.colorize(separator, Colors::BRIGHT_BLUE));
    }

    /// Display subsection header
    pub fn subsection_header(&self, title: &str) {
        println!("\n{}", self.colorize(&format!("▸ {}", title), Colors::BRIGHT_CYAN));
        let separator = "─────────────────────────────────────────────────────────────────";
        println!("{}", self.colorize(separator, Colors::DIM));
    }

    /// Display key-value pair
    pub fn key_value(&self, key: &str, value: &str) {
        println!("  {}: {}",
            self.colorize(key, Colors::CYAN),
            value
        );
    }

    /// Display performance dashboard
    pub fn performance_dashboard(
        &self,
        total_tasks: usize,
        successful: usize,
        failed: usize,
        avg_latency_ms: f32,
        tokens_used: usize,
    ) {
        self.section_header("PERFORMANCE DASHBOARD");

        let success_rate = if total_tasks > 0 {
            successful as f32 / total_tasks as f32 * 100.0
        } else {
            0.0
        };

        println!();
        println!("  {} {}", self.colorize("Total Tasks:", Colors::BOLD), total_tasks);
        println!("  {} {} ({})",
            self.colorize("Successful:", Colors::BOLD),
            self.colorize(&successful.to_string(), Colors::BRIGHT_GREEN),
            self.colorize(&format!("{:.1}%", success_rate), Colors::GREEN)
        );
        println!("  {} {}",
            self.colorize("Failed:", Colors::BOLD),
            if failed > 0 {
                self.colorize(&failed.to_string(), Colors::BRIGHT_RED)
            } else {
                self.colorize(&failed.to_string(), Colors::DIM)
            }
        );
        println!("  {} {:.0}ms",
            self.colorize("Avg Latency:", Colors::BOLD),
            avg_latency_ms
        );
        println!("  {} ~{}",
            self.colorize("Tokens Used:", Colors::BOLD),
            tokens_used
        );
        println!();

        // ASCII progress bar for success rate
        let bar_width = 50;
        let filled = ((success_rate / 100.0) * bar_width as f32) as usize;
        let empty = bar_width - filled;

        println!("  {} [{}{}] {:.1}%",
            self.colorize("Success:", Colors::BOLD),
            self.colorize(&"█".repeat(filled), Colors::BRIGHT_GREEN),
            self.colorize(&"░".repeat(empty), Colors::DIM),
            success_rate
        );
    }

    /// Display real-time status
    pub fn real_time_status(&self, agent: &str, status: &str) {
        print!("\r{} {} - {}{}",
            self.colorize("⚡", Colors::BRIGHT_YELLOW),
            self.colorize(agent, Colors::CYAN),
            status,
            " ".repeat(20) // Clear line
        );
        std::io::Write::flush(&mut std::io::stdout()).ok();
    }

    /// Clear line
    pub fn clear_line(&self) {
        print!("\r{}\r", " ".repeat(80));
        std::io::Write::flush(&mut std::io::stdout()).ok();
    }

    /// Display agent activity matrix
    pub fn agent_activity_matrix(&self, agents: &[(String, bool)]) {
        println!("\n{}", self.colorize("🤖 Agent Activity Matrix", Colors::BOLD));
        let separator = "─────────────────────────────────────────────────────────────────";
        println!("{}", self.colorize(separator, Colors::DIM));

        for (agent, active) in agents {
            let status = if *active {
                self.colorize("● ACTIVE", Colors::BRIGHT_GREEN)
            } else {
                self.colorize("○ IDLE", Colors::DIM)
            };
            println!("  {:20} {}", agent, status);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_display_creation() {
        let display = Display::new(true);
        assert!(display.color_enabled);
    }

    #[test]
    fn test_colorize() {
        let display = Display::new(true);
        let colored = display.colorize("test", Colors::RED);
        assert!(colored.contains("test"));
        assert!(colored.contains(Colors::RED));
        assert!(colored.contains(Colors::RESET));
    }

    #[test]
    fn test_colorize_disabled() {
        let display = Display::new(false);
        let text = display.colorize("test", Colors::RED);
        assert_eq!(text, "test");
    }
}
