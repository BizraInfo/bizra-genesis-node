//! BIZRA Node0 - Resource Pool Service
//! 
//! Manages node resource allocation and tracking.

use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Resource pool status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PoolStatus {
    Active,
    Paused,
    Offline,
    Maintenance,
}

impl std::fmt::Display for PoolStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Active => "active",
            Self::Paused => "paused",
            Self::Offline => "offline",
            Self::Maintenance => "maintenance",
        };
        write!(f, "{}", s)
    }
}

/// Resource allocation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceAllocation {
    pub cpu_cores: i32,
    pub gpu_enabled: bool,
    pub storage_gb: f64,
    pub availability_hours: Vec<String>,
}

/// Resource pool state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcePool {
    pub id: Uuid,
    pub node_id: String,
    pub cpu_cores_total: i32,
    pub cpu_cores_allocated: i32,
    pub gpu_enabled: bool,
    pub gpu_vram_gb: Option<f64>,
    pub storage_total_gb: f64,
    pub storage_allocated_gb: f64,
    pub bandwidth_mbps: Option<i32>,
    pub availability_hours: Vec<String>,
    pub status: String,
    pub total_tasks_processed: i32,
    pub total_compute_hours: f64,
    pub total_bzc_earned: f64,
    pub system_info: serde_json::Value,
}

/// Network task (simulated for Node0)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkTask {
    pub id: String,
    pub task_type: String,
    pub description: String,
    pub cpu_cores_needed: i32,
    pub gpu_needed: bool,
    pub estimated_minutes: i32,
    pub reward_bzc: f64,
    pub status: String,
}

/// Resource Pool Service
pub struct ResourcePoolService {
    pool: PgPool,
    node_id: String,
}

impl ResourcePoolService {
    /// Create new Resource Pool service
    pub fn new(pool: PgPool) -> Self {
        let node_id = std::env::var("NODE_ID")
            .unwrap_or_else(|_| "NODE0-TITAN".into());

        Self { pool, node_id }
    }

    /// Get current resource pool state
    pub async fn get_status(&self) -> anyhow::Result<Option<ResourcePool>> {
        let result = sqlx::query!(
            r#"
            SELECT 
                id, node_id, cpu_cores_total, cpu_cores_allocated,
                gpu_enabled, gpu_vram_gb::float8 as gpu_vram_gb,
                storage_total_gb::float8 as "storage_total_gb!",
                storage_allocated_gb::float8 as "storage_allocated_gb!",
                bandwidth_mbps,
                availability_hours,
                status, total_tasks_processed,
                total_compute_hours::float8 as "total_compute_hours!",
                total_bzc_earned::float8 as "total_bzc_earned!",
                system_info
            FROM resource_pool
            WHERE node_id = $1
            "#,
            self.node_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.map(|row| {
            let availability: Vec<String> = row.availability_hours
                .as_ref()
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();

            ResourcePool {
                id: row.id,
                node_id: row.node_id,
                cpu_cores_total: row.cpu_cores_total,
                cpu_cores_allocated: row.cpu_cores_allocated,
                gpu_enabled: row.gpu_enabled.unwrap_or(false),
                gpu_vram_gb: row.gpu_vram_gb,
                storage_total_gb: row.storage_total_gb,
                storage_allocated_gb: row.storage_allocated_gb,
                bandwidth_mbps: row.bandwidth_mbps,
                availability_hours: availability,
                status: row.status,
                total_tasks_processed: row.total_tasks_processed.unwrap_or(0),
                total_compute_hours: row.total_compute_hours,
                total_bzc_earned: row.total_bzc_earned,
                system_info: row.system_info.unwrap_or(serde_json::json!({})),
            }
        }))
    }

    /// Configure resource allocation
    pub async fn configure(&self, allocation: ResourceAllocation) -> anyhow::Result<()> {
        let availability_json = serde_json::to_value(&allocation.availability_hours)?;

        sqlx::query!(
            r#"
            UPDATE resource_pool SET
                cpu_cores_allocated = $1,
                gpu_enabled = $2,
                storage_allocated_gb = $3,
                availability_hours = $4,
                updated_at = NOW()
            WHERE node_id = $5
            "#,
            allocation.cpu_cores,
            allocation.gpu_enabled,
            allocation.storage_gb,
            availability_json,
            self.node_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Update pool status
    pub async fn set_status(&self, status: PoolStatus) -> anyhow::Result<()> {
        sqlx::query!(
            "UPDATE resource_pool SET status = $1, updated_at = NOW() WHERE node_id = $2",
            status.to_string(),
            self.node_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Simulate network task assignment (Node0 only)
    pub fn generate_simulated_task(&self) -> NetworkTask {
        use rand::Rng;
        let mut rng = rand::thread_rng();

        let task_types = [
            ("data_processing", "Process CSV dataset for sentiment analysis"),
            ("model_inference", "Run inference batch for classification"),
            ("embedding_generation", "Generate embeddings for text corpus"),
            ("data_validation", "Validate data integrity for network"),
        ];

        let (task_type, description) = task_types[rng.gen_range(0..task_types.len())];
        let cpu_cores_needed = rng.gen_range(1..=4);
        let estimated_minutes = rng.gen_range(5..=30);
        let reward_bzc = estimated_minutes as f64 * 2.0 + rng.gen::<f64>() * 10.0;

        NetworkTask {
            id: format!("task-{}", uuid::Uuid::new_v4()),
            task_type: task_type.to_string(),
            description: description.to_string(),
            cpu_cores_needed,
            gpu_needed: false,
            estimated_minutes,
            reward_bzc: (reward_bzc * 100.0).round() / 100.0,
            status: "pending".to_string(),
        }
    }

    /// Record task completion
    pub async fn record_task_completion(
        &self,
        task: &NetworkTask,
        actual_minutes: i32,
    ) -> anyhow::Result<()> {
        let compute_hours = actual_minutes as f64 / 60.0;

        sqlx::query!(
            r#"
            UPDATE resource_pool SET
                total_tasks_processed = total_tasks_processed + 1,
                total_compute_hours = total_compute_hours + $1,
                total_bzc_earned = total_bzc_earned + $2,
                updated_at = NOW()
            WHERE node_id = $3
            "#,
            compute_hours,
            task.reward_bzc,
            self.node_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Check if node is available for tasks
    pub async fn is_available(&self) -> anyhow::Result<bool> {
        let status = self.get_status().await?;

        Ok(status
            .map(|s| s.status == "active" && s.cpu_cores_allocated > 0)
            .unwrap_or(false))
    }

    /// Get recommended allocation based on system info
    pub async fn get_recommended_allocation(&self) -> anyhow::Result<ResourceAllocation> {
        let status = self.get_status().await?;

        match status {
            Some(pool) => {
                // Recommend 25% of total cores, up to 8
                let cpu_recommend = std::cmp::min(pool.cpu_cores_total / 4, 8).max(2);
                
                // Enable GPU if available and have enough memory
                let gpu_recommend = pool.gpu_enabled;
                
                // Recommend 10% of storage, min 50GB, max 500GB
                let storage_recommend = (pool.storage_total_gb * 0.1)
                    .min(500.0)
                    .max(50.0);

                Ok(ResourceAllocation {
                    cpu_cores: cpu_recommend,
                    gpu_enabled: gpu_recommend,
                    storage_gb: storage_recommend,
                    availability_hours: vec![
                        "00:00-08:00".to_string(),
                        "18:00-24:00".to_string(),
                    ],
                })
            }
            None => {
                // Default if no pool exists
                Ok(ResourceAllocation {
                    cpu_cores: 2,
                    gpu_enabled: false,
                    storage_gb: 50.0,
                    availability_hours: vec![
                        "00:00-08:00".to_string(),
                        "18:00-24:00".to_string(),
                    ],
                })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pool_status_display() {
        assert_eq!(PoolStatus::Active.to_string(), "active");
        assert_eq!(PoolStatus::Paused.to_string(), "paused");
        assert_eq!(PoolStatus::Offline.to_string(), "offline");
        assert_eq!(PoolStatus::Maintenance.to_string(), "maintenance");
    }
}
