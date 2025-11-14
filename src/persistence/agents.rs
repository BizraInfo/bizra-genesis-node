// synthesis_orchestrator/src/persistence/agents.rs
// Agent state repository for AEGIS multi-agent system

use crate::persistence::traits::{AgentRepositoryTrait, AgentState};
use crate::persistence::{DbError, DbResult};
use async_trait::async_trait;
use sqlx::PgPool;

/// Agent state repository
///
/// Manages state for 18 AEGIS agents (7 PAT + 5 SAT + 6 TAT).
#[derive(Clone)]
pub struct AgentRepository {
    pool: PgPool,
}

impl AgentRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl AgentRepositoryTrait for AgentRepository {
    async fn update_state(&self, agent: &AgentState) -> DbResult<()> {
        sqlx::query!(
            r#"
            INSERT INTO agent_state (
                agent_id,
                agent_type,
                agent_name,
                agent_role,
                state,
                health_status,
                tasks_completed,
                tasks_failed,
                last_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (agent_id)
            DO UPDATE SET
                state = EXCLUDED.state,
                health_status = EXCLUDED.health_status,
                tasks_completed = EXCLUDED.tasks_completed,
                tasks_failed = EXCLUDED.tasks_failed,
                last_active = EXCLUDED.last_active,
                updated_at = NOW()
            "#,
            agent.agent_id,
            agent.agent_type,
            agent.agent_name,
            agent.agent_role,
            agent.state,
            agent.health_status,
            agent.tasks_completed,
            agent.tasks_failed,
            agent.last_active
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update agent state {}: {}", agent.agent_id, e);
            DbError::Connection(e)
        })?;

        tracing::debug!("Agent state updated: {}", agent.agent_id);
        Ok(())
    }

    async fn get(&self, agent_id: &str) -> DbResult<Option<AgentState>> {
        let row = sqlx::query!(
            r#"
            SELECT
                agent_id,
                agent_type,
                agent_name,
                agent_role,
                state,
                health_status,
                tasks_completed,
                tasks_failed,
                last_active
            FROM agent_state
            WHERE agent_id = $1
            "#,
            agent_id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch agent {}: {}", agent_id, e);
            DbError::Connection(e)
        })?;

        Ok(row.map(|r| AgentState {
            agent_id: r.agent_id,
            agent_type: r.agent_type,
            agent_name: r.agent_name,
            agent_role: r.agent_role,
            state: r.state,
            health_status: r.health_status,
            tasks_completed: r.tasks_completed,
            tasks_failed: r.tasks_failed,
            last_active: r.last_active.and_utc(),
        }))
    }

    async fn get_by_type(&self, agent_type: &str) -> DbResult<Vec<AgentState>> {
        let rows = sqlx::query!(
            r#"
            SELECT
                agent_id,
                agent_type,
                agent_name,
                agent_role,
                state,
                health_status,
                tasks_completed,
                tasks_failed,
                last_active
            FROM agent_state
            WHERE agent_type = $1
            ORDER BY agent_name
            "#,
            agent_type
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch agents by type {}: {}", agent_type, e);
            DbError::Connection(e)
        })?;

        Ok(rows
            .into_iter()
            .map(|r| AgentState {
                agent_id: r.agent_id,
                agent_type: r.agent_type,
                agent_name: r.agent_name,
                agent_role: r.agent_role,
                state: r.state,
                health_status: r.health_status,
                tasks_completed: r.tasks_completed,
                tasks_failed: r.tasks_failed,
                last_active: r.last_active.and_utc(),
            })
            .collect())
    }

    async fn get_healthy(&self) -> DbResult<Vec<AgentState>> {
        let rows = sqlx::query!(
            r#"
            SELECT
                agent_id,
                agent_type,
                agent_name,
                agent_role,
                state,
                health_status,
                tasks_completed,
                tasks_failed,
                last_active
            FROM agent_state
            WHERE health_status = 'healthy'
            ORDER BY last_active DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch healthy agents: {}", e);
            DbError::Connection(e)
        })?;

        Ok(rows
            .into_iter()
            .map(|r| AgentState {
                agent_id: r.agent_id,
                agent_type: r.agent_type,
                agent_name: r.agent_name,
                agent_role: r.agent_role,
                state: r.state,
                health_status: r.health_status,
                tasks_completed: r.tasks_completed,
                tasks_failed: r.tasks_failed,
                last_active: r.last_active.and_utc(),
            })
            .collect())
    }

    async fn update_health(&self, agent_id: &str, status: &str) -> DbResult<()> {
        let result = sqlx::query!(
            r#"
            UPDATE agent_state
            SET health_status = $2,
                updated_at = NOW()
            WHERE agent_id = $1
            "#,
            agent_id,
            status
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update health for {}: {}", agent_id, e);
            DbError::Connection(e)
        })?;

        if result.rows_affected() == 0 {
            return Err(DbError::NotFound(format!("Agent not found: {}", agent_id)));
        }

        tracing::debug!("Agent health updated: {} -> {}", agent_id, status);
        Ok(())
    }
}
