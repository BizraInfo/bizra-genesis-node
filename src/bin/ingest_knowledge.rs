// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  KNOWLEDGE INGESTION SYSTEM - Offline Processing                         ║
// ║  BIZRA Genesis Node Knowledge Base Population                            ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

//! # Knowledge Ingestion
//!
//! Offline system to populate PostgreSQL knowledge_base with embedded documents.
//! Uses nomic-embed-text for consistent embeddings with SAPE Engine retrieval.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::PgPool;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
struct Document {
    id: Option<String>,
    title: String,
    content: String,
    source: String,
    tags: Vec<String>,
    created_at: Option<DateTime<Utc>>,
    metadata: HashMap<String, Value>,
}

#[derive(Debug, sqlx::FromRow)]
struct KnowledgeEntry {
    id: uuid::Uuid,
    content: String,
    embedding: Vec<f32>,
    metadata: Value,
    created_at: chrono::DateTime<chrono::Utc>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🧠 Knowledge Ingestion System - Starting");

    // Load configuration
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://localhost/bizra".to_string());
    let docs_path = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "./docs".to_string());

    println!("📚 Connecting to database: {}", database_url);
    let pool = PgPool::connect(&database_url).await?;

    // Ensure knowledge_base table exists
    create_knowledge_table(&pool).await?;

    // Process documents
    if Path::new(&docs_path).exists() {
        println!("📖 Processing documents from: {}", docs_path);
        process_documents(&pool, &docs_path).await?;
    } else {
        println!(
            "⚠️ Document path {} not found, using sample data",
            docs_path
        );
        ingest_sample_data(&pool).await?;
    }

    println!("✅ Knowledge ingestion complete!");
    Ok(())
}

async fn create_knowledge_table(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create knowledge_base table with pgvector extension
    sqlx::query(
        r#"
        CREATE EXTENSION IF NOT EXISTS vector;

        CREATE TABLE IF NOT EXISTS knowledge_base (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            content TEXT NOT NULL,
            embedding vector(768), -- nomic-embed-text dimension
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
        ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);

        CREATE INDEX IF NOT EXISTS idx_knowledge_metadata
        ON knowledge_base USING gin (metadata);
        "#,
    )
    .execute(pool)
    .await?;

    println!("📋 Knowledge base table ready");
    Ok(())
}

async fn process_documents(
    pool: &PgPool,
    docs_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let entries = fs::read_dir(docs_path)?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry
                .path()
                .extension()
                .map_or(false, |ext| ext == "json" || ext == "md")
        })
        .collect::<Vec<_>>();

    println!("📄 Found {} documents to process", entries.len());

    for entry in entries {
        let path = entry.path();
        println!("🔍 Processing: {}", path.display());

        // For now, create a simple document entry
        // In full implementation, this would parse markdown, create chunks, embed, etc.
        let doc = Document {
            id: None,
            title: path.file_stem().unwrap().to_string_lossy().to_string(),
            content: if path.extension().unwrap() == "json" {
                fs::read_to_string(&path)?
            } else {
                format!("Content from {}", path.display())
            },
            source: path.to_string_lossy().to_string(),
            tags: vec!["document".to_string()],
            created_at: Some(Utc::now()),
            metadata: HashMap::new(),
        };

        // Placeholder embedding - would be replaced with actual nomic-embed-text
        let placeholder_embedding: Vec<f32> = (0..768).map(|i| (i as f32 * 0.01) % 1.0).collect();

        insert_knowledge_chunk(pool, &doc, &placeholder_embedding).await?;
    }

    Ok(())
}

async fn ingest_sample_data(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    println!("🌱 Ingesting sample knowledge data");

    let sample_docs = vec![
        Document {
            id: None,
            title: "BIZRA Consensus Mechanism".to_string(),
            content: "BIZRA uses Proof-of-Impact consensus, combining reputation and contribution metrics to select block validators.".to_string(),
            source: "sample".to_string(),
            tags: vec!["consensus".to_string(), "blockchain".to_string()],
            created_at: Some(Utc::now()),
            metadata: HashMap::new(),
        },
        Document {
            id: None,
            title: "Synaptic Activation Patterns".to_string(),
            content: "SAPE employs three reasoning paths: Impulse (I-path), Counter-Impulse (C-path), and Orthogonal (O-path) to explore diverse solution spaces.".to_string(),
            source: "sample".to_string(),
            tags: vec!["ai".to_string(), "reasoning".to_string()],
            created_at: Some(Utc::now()),
            metadata: HashMap::new(),
        },
        Document {
            id: None,
            title: "Reward System Economics".to_string(),
            content: "The BIZRA reward system uses multi-dimensional scoring based on user engagement, content quality, and network contribution.".to_string(),
            source: "sample".to_string(),
            tags: vec!["economics".to_string(), "rewards".to_string()],
            created_at: Some(Utc::now()),
            metadata: HashMap::new(),
        }
    ];

    for doc in sample_docs {
        // Placeholder embeddings - replace with actual nomic-embed-text integration
        let placeholder_embedding: Vec<f32> = (0..768).map(|i| (i as f32 * 0.001) % 1.0).collect();
        insert_knowledge_chunk(pool, &doc, &placeholder_embedding).await?;
    }

    Ok(())
}

async fn insert_knowledge_chunk(
    pool: &PgPool,
    doc: &Document,
    embedding: &[f32],
) -> Result<(), sqlx::Error> {
    let metadata = serde_json::json!({
        "title": doc.title,
        "source": doc.source,
        "tags": doc.tags,
        "created_at": doc.created_at
    });

    sqlx::query(
        r#"
        INSERT INTO knowledge_base (content, embedding, metadata)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(&doc.content)
    .bind(embedding)
    .bind(metadata)
    .execute(pool)
    .await?;

    println!("✅ Ingested: {}", doc.title);
    Ok(())
}
