// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AGENT PERFORMANCE BENCHMARKS                        ║
// ║  Comprehensive benchmarks for PAT/SAT agent operations                    ║
// ║  Professional Elite Performance Testing Infrastructure                    ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use std::collections::HashMap;
use std::time::Duration;

// ═══════════════════════════════════════════════════════════════════════════
// Task Processing Benchmarks
// ═══════════════════════════════════════════════════════════════════════════

mod task_processing {
    use super::*;

    #[derive(Debug, Clone)]
    struct Task {
        id: String,
        description: String,
        priority: Priority,
        metadata: HashMap<String, String>,
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
    enum Priority {
        Low,
        Medium,
        High,
        Critical,
    }

    impl Task {
        fn new(id: &str, description: &str, priority: Priority) -> Self {
            Self {
                id: id.to_string(),
                description: description.to_string(),
                priority,
                metadata: HashMap::new(),
            }
        }

        fn with_metadata(mut self, key: &str, value: &str) -> Self {
            self.metadata.insert(key.to_string(), value.to_string());
            self
        }
    }

    struct TaskQueue {
        tasks: Vec<Task>,
        priority_index: HashMap<Priority, Vec<usize>>,
    }

    impl TaskQueue {
        fn new() -> Self {
            Self {
                tasks: Vec::new(),
                priority_index: HashMap::new(),
            }
        }

        fn push(&mut self, task: Task) {
            let idx = self.tasks.len();
            let priority = task.priority;
            self.tasks.push(task);
            self.priority_index
                .entry(priority)
                .or_insert_with(Vec::new)
                .push(idx);
        }

        fn pop_highest_priority(&mut self) -> Option<Task> {
            for priority in [
                Priority::Critical,
                Priority::High,
                Priority::Medium,
                Priority::Low,
            ] {
                if let Some(indices) = self.priority_index.get_mut(&priority) {
                    if let Some(idx) = indices.pop() {
                        // Mark as removed (simplified - real impl would handle this better)
                        return Some(self.tasks[idx].clone());
                    }
                }
            }
            None
        }

        fn len(&self) -> usize {
            self.tasks.len()
        }
    }

    fn create_sample_tasks(count: usize) -> Vec<Task> {
        (0..count)
            .map(|i| {
                let priority = match i % 4 {
                    0 => Priority::Low,
                    1 => Priority::Medium,
                    2 => Priority::High,
                    _ => Priority::Critical,
                };
                Task::new(
                    &format!("task-{}", i),
                    &format!("Task description {} with some details", i),
                    priority,
                )
                .with_metadata("source", "benchmark")
                .with_metadata("iteration", &i.to_string())
            })
            .collect()
    }

    pub fn task_benchmarks(c: &mut Criterion) {
        let mut group = c.benchmark_group("task_processing");
        group.measurement_time(Duration::from_secs(10));

        // Task creation
        group.bench_function("create_task", |b| {
            b.iter(|| {
                Task::new(
                    black_box("task-001"),
                    black_box("Complete the project analysis"),
                    black_box(Priority::High),
                )
            })
        });

        // Task with metadata
        group.bench_function("create_task_with_metadata", |b| {
            b.iter(|| {
                Task::new("task-001", "Analysis task", Priority::High)
                    .with_metadata("project", "genesis")
                    .with_metadata("sprint", "4")
                    .with_metadata("assignee", "agent-planner")
            })
        });

        // Queue operations
        for queue_size in [10, 100, 1000, 10000] {
            let tasks = create_sample_tasks(queue_size);

            group.bench_with_input(
                BenchmarkId::new("queue_push", queue_size),
                &tasks,
                |b, tasks| {
                    b.iter(|| {
                        let mut queue = TaskQueue::new();
                        for task in tasks {
                            queue.push(task.clone());
                        }
                        black_box(queue.len())
                    })
                },
            );

            group.bench_with_input(
                BenchmarkId::new("queue_pop_all", queue_size),
                &tasks,
                |b, tasks| {
                    b.iter_batched(
                        || {
                            let mut queue = TaskQueue::new();
                            for task in tasks {
                                queue.push(task.clone());
                            }
                            queue
                        },
                        |mut queue| {
                            while queue.pop_highest_priority().is_some() {}
                        },
                        criterion::BatchSize::SmallInput,
                    )
                },
            );
        }

        // Priority sorting
        group.bench_function("sort_by_priority_1000", |b| {
            let mut tasks = create_sample_tasks(1000);
            b.iter(|| {
                tasks.sort_by(|a, b| b.priority.cmp(&a.priority));
                black_box(&tasks)
            })
        });

        group.finish();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Agent Coordination Benchmarks
// ═══════════════════════════════════════════════════════════════════════════

mod agent_coordination {
    use super::*;
    use parking_lot::RwLock;
    use std::sync::Arc;

    #[derive(Debug, Clone)]
    struct AgentState {
        id: String,
        role: String,
        status: AgentStatus,
        tasks_completed: u64,
        current_task: Option<String>,
        metrics: AgentMetrics,
    }

    #[derive(Debug, Clone, Copy, PartialEq)]
    enum AgentStatus {
        Idle,
        Working,
        Waiting,
        Error,
    }

    #[derive(Debug, Clone, Default)]
    struct AgentMetrics {
        total_tasks: u64,
        successful_tasks: u64,
        failed_tasks: u64,
        avg_latency_ms: f64,
        total_tokens: u64,
    }

    struct AgentRegistry {
        agents: HashMap<String, Arc<RwLock<AgentState>>>,
    }

    impl AgentRegistry {
        fn new() -> Self {
            Self {
                agents: HashMap::new(),
            }
        }

        fn register(&mut self, agent: AgentState) {
            self.agents
                .insert(agent.id.clone(), Arc::new(RwLock::new(agent)));
        }

        fn get(&self, id: &str) -> Option<Arc<RwLock<AgentState>>> {
            self.agents.get(id).cloned()
        }

        fn update_status(&self, id: &str, status: AgentStatus) -> bool {
            if let Some(agent) = self.agents.get(id) {
                agent.write().status = status;
                true
            } else {
                false
            }
        }

        fn get_idle_agents(&self) -> Vec<String> {
            self.agents
                .iter()
                .filter(|(_, agent)| agent.read().status == AgentStatus::Idle)
                .map(|(id, _)| id.clone())
                .collect()
        }

        fn get_metrics_snapshot(&self) -> Vec<(String, AgentMetrics)> {
            self.agents
                .iter()
                .map(|(id, agent)| (id.clone(), agent.read().metrics.clone()))
                .collect()
        }
    }

    fn create_agent(id: &str, role: &str) -> AgentState {
        AgentState {
            id: id.to_string(),
            role: role.to_string(),
            status: AgentStatus::Idle,
            tasks_completed: 0,
            current_task: None,
            metrics: AgentMetrics::default(),
        }
    }

    pub fn coordination_benchmarks(c: &mut Criterion) {
        let mut group = c.benchmark_group("agent_coordination");
        group.measurement_time(Duration::from_secs(10));

        // Agent registration
        group.bench_function("register_agent", |b| {
            b.iter_batched(
                AgentRegistry::new,
                |mut registry| {
                    registry.register(create_agent("agent-001", "planner"));
                },
                criterion::BatchSize::SmallInput,
            )
        });

        // Registry with many agents
        for agent_count in [7, 12, 50, 100] {
            group.bench_with_input(
                BenchmarkId::new("register_agents", agent_count),
                &agent_count,
                |b, &count| {
                    b.iter(|| {
                        let mut registry = AgentRegistry::new();
                        for i in 0..count {
                            let role = match i % 7 {
                                0 => "planner",
                                1 => "researcher",
                                2 => "coder",
                                3 => "evaluator",
                                4 => "ethicist",
                                5 => "publisher",
                                _ => "integrator",
                            };
                            registry.register(create_agent(&format!("agent-{}", i), role));
                        }
                        black_box(registry)
                    })
                },
            );
        }

        // Agent lookup
        let mut registry = AgentRegistry::new();
        for i in 0..100 {
            registry.register(create_agent(&format!("agent-{}", i), "worker"));
        }

        group.bench_function("lookup_agent", |b| {
            b.iter(|| registry.get(black_box("agent-50")))
        });

        // Status updates
        group.bench_function("update_status", |b| {
            b.iter(|| {
                registry.update_status(black_box("agent-50"), black_box(AgentStatus::Working))
            })
        });

        // Get idle agents
        group.bench_function("get_idle_agents", |b| b.iter(|| registry.get_idle_agents()));

        // Metrics snapshot
        group.bench_function("metrics_snapshot", |b| {
            b.iter(|| registry.get_metrics_snapshot())
        });

        group.finish();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Response Aggregation Benchmarks
// ═══════════════════════════════════════════════════════════════════════════

mod response_aggregation {
    use super::*;

    #[derive(Debug, Clone)]
    struct AgentResponse {
        agent_id: String,
        content: String,
        confidence: f64,
        latency_ms: u64,
        tokens_used: u32,
    }

    #[derive(Debug, Clone)]
    struct AggregatedResponse {
        combined_content: String,
        total_confidence: f64,
        total_latency_ms: u64,
        total_tokens: u32,
        contributing_agents: Vec<String>,
    }

    fn aggregate_responses(responses: &[AgentResponse]) -> AggregatedResponse {
        let mut combined = String::new();
        let mut total_confidence = 0.0;
        let mut total_latency = 0u64;
        let mut total_tokens = 0u32;
        let mut agents = Vec::new();

        for response in responses {
            combined.push_str(&response.content);
            combined.push('\n');
            total_confidence += response.confidence;
            total_latency += response.latency_ms;
            total_tokens += response.tokens_used;
            agents.push(response.agent_id.clone());
        }

        AggregatedResponse {
            combined_content: combined,
            total_confidence: total_confidence / responses.len() as f64,
            total_latency_ms: total_latency,
            total_tokens,
            contributing_agents: agents,
        }
    }

    fn weighted_aggregate(responses: &[(AgentResponse, f64)]) -> AggregatedResponse {
        let total_weight: f64 = responses.iter().map(|(_, w)| w).sum();
        let mut combined = String::new();
        let mut weighted_confidence = 0.0;
        let mut total_latency = 0u64;
        let mut total_tokens = 0u32;
        let mut agents = Vec::new();

        for (response, weight) in responses {
            combined.push_str(&response.content);
            combined.push('\n');
            weighted_confidence += response.confidence * weight;
            total_latency += response.latency_ms;
            total_tokens += response.tokens_used;
            agents.push(response.agent_id.clone());
        }

        AggregatedResponse {
            combined_content: combined,
            total_confidence: weighted_confidence / total_weight,
            total_latency_ms: total_latency,
            total_tokens,
            contributing_agents: agents,
        }
    }

    fn create_sample_responses(count: usize) -> Vec<AgentResponse> {
        (0..count)
            .map(|i| AgentResponse {
                agent_id: format!("agent-{}", i),
                content: format!(
                    "This is the response from agent {} with detailed analysis \
                     and recommendations for the task at hand.",
                    i
                ),
                confidence: 0.85 + (i as f64 * 0.01) % 0.15,
                latency_ms: 500 + (i as u64 * 100),
                tokens_used: 200 + (i as u32 * 50),
            })
            .collect()
    }

    pub fn aggregation_benchmarks(c: &mut Criterion) {
        let mut group = c.benchmark_group("response_aggregation");
        group.measurement_time(Duration::from_secs(10));

        // Simple aggregation with varying response counts
        for count in [3, 7, 12, 20, 50] {
            let responses = create_sample_responses(count);

            group.bench_with_input(
                BenchmarkId::new("simple_aggregate", count),
                &responses,
                |b, responses| b.iter(|| aggregate_responses(black_box(responses))),
            );
        }

        // Weighted aggregation
        let responses_with_weights: Vec<(AgentResponse, f64)> = create_sample_responses(7)
            .into_iter()
            .enumerate()
            .map(|(i, r)| (r, 1.0 + (i as f64 * 0.1)))
            .collect();

        group.bench_function("weighted_aggregate_7", |b| {
            b.iter(|| weighted_aggregate(black_box(&responses_with_weights)))
        });

        // Content concatenation (string heavy)
        let responses = create_sample_responses(20);
        group.bench_function("content_concat_20", |b| {
            b.iter(|| {
                let mut combined = String::with_capacity(responses.len() * 200);
                for r in &responses {
                    combined.push_str(&r.content);
                    combined.push('\n');
                }
                black_box(combined)
            })
        });

        // Confidence calculation
        group.bench_function("confidence_calc_20", |b| {
            b.iter(|| {
                let sum: f64 = responses.iter().map(|r| r.confidence).sum();
                black_box(sum / responses.len() as f64)
            })
        });

        group.finish();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Workflow Execution Benchmarks
// ═══════════════════════════════════════════════════════════════════════════

mod workflow {
    use super::*;

    #[derive(Debug, Clone)]
    struct WorkflowStep {
        id: String,
        agent_type: String,
        dependencies: Vec<String>,
        estimated_duration_ms: u64,
    }

    struct WorkflowGraph {
        steps: HashMap<String, WorkflowStep>,
        execution_order: Vec<String>,
    }

    impl WorkflowGraph {
        fn new() -> Self {
            Self {
                steps: HashMap::new(),
                execution_order: Vec::new(),
            }
        }

        fn add_step(&mut self, step: WorkflowStep) {
            self.steps.insert(step.id.clone(), step);
        }

        fn topological_sort(&mut self) {
            // Simplified topological sort
            let mut visited: HashMap<String, bool> = HashMap::new();
            let mut order: Vec<String> = Vec::new();

            fn visit(
                step_id: &str,
                steps: &HashMap<String, WorkflowStep>,
                visited: &mut HashMap<String, bool>,
                order: &mut Vec<String>,
            ) {
                if *visited.get(step_id).unwrap_or(&false) {
                    return;
                }
                visited.insert(step_id.to_string(), true);

                if let Some(step) = steps.get(step_id) {
                    for dep in &step.dependencies {
                        visit(dep, steps, visited, order);
                    }
                }
                order.push(step_id.to_string());
            }

            for step_id in self.steps.keys() {
                visit(step_id, &self.steps, &mut visited, &mut order);
            }

            self.execution_order = order;
        }

        fn get_ready_steps(&self, completed: &[String]) -> Vec<String> {
            self.steps
                .values()
                .filter(|step| {
                    !completed.contains(&step.id)
                        && step.dependencies.iter().all(|d| completed.contains(d))
                })
                .map(|s| s.id.clone())
                .collect()
        }
    }

    fn create_linear_workflow(steps: usize) -> WorkflowGraph {
        let mut graph = WorkflowGraph::new();

        for i in 0..steps {
            let deps = if i > 0 {
                vec![format!("step-{}", i - 1)]
            } else {
                vec![]
            };

            graph.add_step(WorkflowStep {
                id: format!("step-{}", i),
                agent_type: "worker".to_string(),
                dependencies: deps,
                estimated_duration_ms: 100,
            });
        }

        graph
    }

    fn create_parallel_workflow(parallel_tasks: usize) -> WorkflowGraph {
        let mut graph = WorkflowGraph::new();

        // Start step
        graph.add_step(WorkflowStep {
            id: "start".to_string(),
            agent_type: "coordinator".to_string(),
            dependencies: vec![],
            estimated_duration_ms: 10,
        });

        // Parallel steps
        for i in 0..parallel_tasks {
            graph.add_step(WorkflowStep {
                id: format!("parallel-{}", i),
                agent_type: "worker".to_string(),
                dependencies: vec!["start".to_string()],
                estimated_duration_ms: 100,
            });
        }

        // End step (depends on all parallel)
        let parallel_deps: Vec<String> = (0..parallel_tasks)
            .map(|i| format!("parallel-{}", i))
            .collect();

        graph.add_step(WorkflowStep {
            id: "end".to_string(),
            agent_type: "aggregator".to_string(),
            dependencies: parallel_deps,
            estimated_duration_ms: 10,
        });

        graph
    }

    pub fn workflow_benchmarks(c: &mut Criterion) {
        let mut group = c.benchmark_group("workflow_execution");
        group.measurement_time(Duration::from_secs(10));

        // Linear workflow creation
        for steps in [5, 10, 20, 50] {
            group.bench_with_input(
                BenchmarkId::new("create_linear", steps),
                &steps,
                |b, &steps| b.iter(|| create_linear_workflow(black_box(steps))),
            );
        }

        // Parallel workflow creation
        for tasks in [3, 7, 12, 20] {
            group.bench_with_input(
                BenchmarkId::new("create_parallel", tasks),
                &tasks,
                |b, &tasks| b.iter(|| create_parallel_workflow(black_box(tasks))),
            );
        }

        // Topological sort
        let mut workflow = create_linear_workflow(50);
        group.bench_function("topological_sort_50", |b| {
            b.iter(|| {
                let mut w = workflow.clone();
                w.topological_sort();
                black_box(w)
            })
        });

        // Get ready steps
        let workflow = create_parallel_workflow(10);
        let completed = vec!["start".to_string()];

        group.bench_function("get_ready_steps", |b| {
            b.iter(|| workflow.get_ready_steps(black_box(&completed)))
        });

        group.finish();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Quality Scoring Benchmarks
// ═══════════════════════════════════════════════════════════════════════════

mod quality_scoring {
    use super::*;

    #[derive(Debug, Clone)]
    struct QualityScores {
        validity: f64,
        correctness: f64,
        safety: f64,
        efficiency: f64,
    }

    impl QualityScores {
        fn ihsan_score(&self) -> f64 {
            // Weighted average (Ihsan scoring formula)
            0.30 * self.validity
                + 0.35 * self.correctness
                + 0.25 * self.safety
                + 0.10 * self.efficiency
        }

        fn passes_threshold(&self, threshold: f64) -> bool {
            self.ihsan_score() >= threshold
        }

        fn all_above_minimum(&self, minimum: f64) -> bool {
            self.validity >= minimum
                && self.correctness >= minimum
                && self.safety >= minimum
                && self.efficiency >= minimum
        }
    }

    fn score_response(content: &str) -> QualityScores {
        // Simplified scoring (real implementation would use ML models)
        let len = content.len();
        let has_structure = content.contains('\n');
        let has_detail = len > 100;

        QualityScores {
            validity: if has_structure { 0.9 } else { 0.7 },
            correctness: if has_detail { 0.85 } else { 0.75 },
            safety: 0.95, // Default high safety
            efficiency: if len < 500 { 0.9 } else { 0.8 },
        }
    }

    fn select_best_response(responses: &[(String, QualityScores)], threshold: f64) -> Option<&str> {
        responses
            .iter()
            .filter(|(_, scores)| scores.passes_threshold(threshold))
            .max_by(|(_, a), (_, b)| {
                a.ihsan_score()
                    .partial_cmp(&b.ihsan_score())
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .map(|(content, _)| content.as_str())
    }

    pub fn scoring_benchmarks(c: &mut Criterion) {
        let mut group = c.benchmark_group("quality_scoring");
        group.measurement_time(Duration::from_secs(10));

        // Single score calculation
        let scores = QualityScores {
            validity: 0.92,
            correctness: 0.88,
            safety: 0.95,
            efficiency: 0.85,
        };

        group.bench_function("ihsan_score", |b| b.iter(|| scores.ihsan_score()));

        group.bench_function("threshold_check", |b| {
            b.iter(|| scores.passes_threshold(black_box(0.85)))
        });

        group.bench_function("minimum_check", |b| {
            b.iter(|| scores.all_above_minimum(black_box(0.80)))
        });

        // Response scoring
        let sample_content = "This is a detailed response with analysis.\n\
            Key findings:\n1. First point\n2. Second point\n\
            Recommendations:\n- Action A\n- Action B";

        group.bench_function("score_response", |b| {
            b.iter(|| score_response(black_box(sample_content)))
        });

        // Best response selection
        let responses: Vec<(String, QualityScores)> = (0..10)
            .map(|i| {
                let content = format!("Response {} with content", i);
                let scores = QualityScores {
                    validity: 0.80 + (i as f64 * 0.02),
                    correctness: 0.82 + (i as f64 * 0.015),
                    safety: 0.90 + (i as f64 * 0.01),
                    efficiency: 0.85 + (i as f64 * 0.01),
                };
                (content, scores)
            })
            .collect();

        group.bench_function("select_best_10", |b| {
            b.iter(|| select_best_response(black_box(&responses), black_box(0.85)))
        });

        // Batch scoring
        let batch_content: Vec<String> = (0..100)
            .map(|i| {
                format!(
                    "Response content {} with various details.\nMore info here.",
                    i
                )
            })
            .collect();

        group.bench_function("batch_score_100", |b| {
            b.iter(|| {
                batch_content
                    .iter()
                    .map(|c| score_response(c))
                    .collect::<Vec<_>>()
            })
        });

        group.finish();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Criterion Configuration
// ═══════════════════════════════════════════════════════════════════════════

criterion_group!(
    name = agent_benches;
    config = Criterion::default()
        .significance_level(0.05)
        .sample_size(100)
        .warm_up_time(Duration::from_secs(3));
    targets =
        task_processing::task_benchmarks,
        agent_coordination::coordination_benchmarks,
        response_aggregation::aggregation_benchmarks,
        workflow::workflow_benchmarks,
        quality_scoring::scoring_benchmarks
);

criterion_main!(agent_benches);
