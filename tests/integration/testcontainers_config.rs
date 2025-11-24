// ═══════════════════════════════════════════════════════════════════════════
// BIZRA GENESIS NODE - TESTCONTAINERS CONFIGURATION
// Integration testing with real PostgreSQL and Redis containers
// ═══════════════════════════════════════════════════════════════════════════

use testcontainers::{clients::Cli, Container, GenericImage, RunnableImage};
use sqlx::{PgPool, postgres::PgPoolOptions};
use redis::Client as RedisClient;
use std::time::Duration;

/// PostgreSQL test container configuration
pub struct PostgresContainer<'a> {
    container: Container<'a, GenericImage>,
    connection_string: String,
}

impl<'a> PostgresContainer<'a> {
    /// Create and start a PostgreSQL container
    pub async fn new(docker: &'a Cli) -> Self {
        let postgres_image = GenericImage::new("postgres", "16-alpine")
            .with_env_var("POSTGRES_DB", "bizra_test")
            .with_env_var("POSTGRES_USER", "bizra_test")
            .with_env_var("POSTGRES_PASSWORD", "bizra_test_password")
            .with_wait_for(testcontainers::core::WaitFor::message_on_stderr(
                "database system is ready to accept connections",
            ));

        let runnable = RunnableImage::from(postgres_image)
            .with_tag("16-alpine");

        let container = docker.run(runnable);
        let port = container.get_host_port_ipv4(5432);

        let connection_string = format!(
            "postgresql://bizra_test:bizra_test_password@localhost:{}/bizra_test",
            port
        );

        Self {
            container,
            connection_string,
        }
    }

    /// Get database connection pool
    pub async fn get_pool(&self) -> Result<PgPool, sqlx::Error> {
        PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(Duration::from_secs(30))
            .connect(&self.connection_string)
            .await
    }

    /// Run database migrations
    pub async fn run_migrations(&self) -> Result<(), sqlx::Error> {
        let pool = self.get_pool().await?;
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await?;
        Ok(())
    }

    /// Get connection string
    pub fn connection_string(&self) -> &str {
        &self.connection_string
    }
}

/// Redis test container configuration
pub struct RedisContainer<'a> {
    container: Container<'a, GenericImage>,
    connection_string: String,
}

impl<'a> RedisContainer<'a> {
    /// Create and start a Redis container
    pub fn new(docker: &'a Cli) -> Self {
        let redis_image = GenericImage::new("redis", "7-alpine")
            .with_wait_for(testcontainers::core::WaitFor::message_on_stdout(
                "Ready to accept connections",
            ));

        let runnable = RunnableImage::from(redis_image)
            .with_tag("7-alpine");

        let container = docker.run(runnable);
        let port = container.get_host_port_ipv4(6379);

        let connection_string = format!("redis://localhost:{}", port);

        Self {
            container,
            connection_string,
        }
    }

    /// Get Redis client
    pub fn get_client(&self) -> Result<RedisClient, redis::RedisError> {
        RedisClient::open(self.connection_string.as_str())
    }

    /// Get connection string
    pub fn connection_string(&self) -> &str {
        &self.connection_string
    }
}

/// Complete test environment with PostgreSQL and Redis
pub struct TestEnvironment<'a> {
    pub postgres: PostgresContainer<'a>,
    pub redis: RedisContainer<'a>,
}

impl<'a> TestEnvironment<'a> {
    /// Create a complete test environment
    pub async fn new(docker: &'a Cli) -> Self {
        let postgres = PostgresContainer::new(docker).await;
        let redis = RedisContainer::new(docker);

        // Run migrations on PostgreSQL
        postgres
            .run_migrations()
            .await
            .expect("Failed to run migrations");

        Self { postgres, redis }
    }

    /// Get database pool
    pub async fn db_pool(&self) -> Result<PgPool, sqlx::Error> {
        self.postgres.get_pool().await
    }

    /// Get Redis client
    pub fn redis_client(&self) -> Result<RedisClient, redis::RedisError> {
        self.redis.get_client()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_postgres_container() {
        let docker = Cli::default();
        let postgres = PostgresContainer::new(&docker).await;

        // Test connection
        let pool = postgres.get_pool().await.expect("Failed to connect");

        // Execute a simple query
        let result: (i32,) = sqlx::query_as("SELECT 1")
            .fetch_one(&pool)
            .await
            .expect("Query failed");

        assert_eq!(result.0, 1);
    }

    #[tokio::test]
    async fn test_redis_container() {
        let docker = Cli::default();
        let redis = RedisContainer::new(&docker);

        // Test connection
        let client = redis.get_client().expect("Failed to create client");
        let mut conn = client
            .get_connection()
            .expect("Failed to connect");

        // Test SET/GET
        redis::cmd("SET")
            .arg("test_key")
            .arg("test_value")
            .execute(&mut conn);

        let value: String = redis::cmd("GET")
            .arg("test_key")
            .query(&mut conn)
            .expect("Failed to get value");

        assert_eq!(value, "test_value");
    }

    #[tokio::test]
    async fn test_full_environment() {
        let docker = Cli::default();
        let env = TestEnvironment::new(&docker).await;

        // Test database
        let pool = env.db_pool().await.expect("Failed to get pool");
        let result: (i32,) = sqlx::query_as("SELECT 1")
            .fetch_one(&pool)
            .await
            .expect("Query failed");
        assert_eq!(result.0, 1);

        // Test Redis
        let client = env.redis_client().expect("Failed to get client");
        let mut conn = client.get_connection().expect("Failed to connect");
        redis::cmd("PING")
            .execute(&mut conn);
    }
}
