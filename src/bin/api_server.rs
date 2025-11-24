// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - API SERVER                                         ║
// ║  Production-ready Axum API server for BIZRA Genesis Node                 ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use bizra_genesis_node::api;
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "bizra_genesis_node=info,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 Starting BIZRA Genesis Node API Server");

    // Load database URL from environment
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost/bizra_genesis".to_string());

    tracing::info!("📦 Connecting to database: {}", database_url);

    // Create database connection pool
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("✅ Database connection pool established");

    // Run migrations
    tracing::info!("🔄 Running database migrations...");
    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!("✅ Database migrations completed");

    // Create API router
    let app = api::create_router(Arc::new(pool));

    // Configure server address
    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    tracing::info!("🌐 API server listening on http://{}", addr);
    tracing::info!("📋 Available endpoints:");
    tracing::info!("   POST /auth/register - User registration");
    tracing::info!("   GET  /health - Health check");

    // Start server
    let listener = TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
