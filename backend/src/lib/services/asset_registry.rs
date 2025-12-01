//! BIZRA Node0 - Asset Registry Service
//! 
//! Indexes and manages all files Node0 can access.

use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::path::{Path, PathBuf};
use tokio::fs;
use uuid::Uuid;

/// Asset domain classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AssetDomain {
    CoreBizra,          // BIZRA system code
    RdKnowledge,        // Research papers, whitepapers
    ThirdPartyTooling,  // External libraries
    SystemInfra,        // Docker configs, deployment
    PersonalSensitive,  // User's personal files
}

impl std::fmt::Display for AssetDomain {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::CoreBizra => "core_bizra",
            Self::RdKnowledge => "rd_knowledge",
            Self::ThirdPartyTooling => "third_party_tooling",
            Self::SystemInfra => "system_infra",
            Self::PersonalSensitive => "personal_sensitive",
        };
        write!(f, "{}", s)
    }
}

/// Indexed asset
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub id: Uuid,
    pub path: String,
    pub file_name: String,
    pub file_extension: Option<String>,
    pub domain: String,
    pub file_type: String,
    pub size_bytes: i64,
    pub last_modified: chrono::DateTime<chrono::Utc>,
    pub content_hash: Option<String>,
    pub is_indexed: bool,
    pub embedding_id: Option<Uuid>,
}

/// Asset Registry statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetStats {
    pub total_assets: i64,
    pub indexed_assets: i64,
    pub total_size_bytes: i64,
    pub by_domain: std::collections::HashMap<String, i64>,
    pub by_type: std::collections::HashMap<String, i64>,
}

/// Asset Registry Service
pub struct AssetRegistry {
    pool: PgPool,
    max_file_size: u64,
    indexed_extensions: Vec<String>,
}

impl AssetRegistry {
    /// Create new Asset Registry service
    pub fn new(pool: PgPool) -> Self {
        let max_file_size = std::env::var("ASSET_MAX_FILE_SIZE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(10_485_760); // 10MB default

        let indexed_extensions = std::env::var("ASSET_INDEX_EXTENSIONS")
            .unwrap_or_else(|_| ".rs,.ts,.tsx,.js,.jsx,.py,.md,.json,.sql,.yaml,.yml,.toml".into())
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();

        Self {
            pool,
            max_file_size,
            indexed_extensions,
        }
    }

    /// Index a directory
    pub async fn index_directory(
        &self,
        path: &Path,
        domain: AssetDomain,
    ) -> anyhow::Result<IndexResult> {
        let mut result = IndexResult::default();

        if !path.exists() {
            return Err(anyhow::anyhow!("Path does not exist: {:?}", path));
        }

        self.walk_directory(path, &domain, &mut result).await?;

        Ok(result)
    }

    /// Recursively walk directory and index files
    async fn walk_directory(
        &self,
        path: &Path,
        domain: &AssetDomain,
        result: &mut IndexResult,
    ) -> anyhow::Result<()> {
        let mut entries = fs::read_dir(path).await?;

        while let Some(entry) = entries.next_entry().await? {
            let entry_path = entry.path();
            let metadata = entry.metadata().await?;

            if metadata.is_dir() {
                // Skip hidden directories and common non-code directories
                let name = entry_path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("");
                
                if !name.starts_with('.') 
                    && name != "node_modules" 
                    && name != "target"
                    && name != "__pycache__"
                    && name != ".git"
                {
                    Box::pin(self.walk_directory(&entry_path, domain, result)).await?;
                }
            } else if metadata.is_file() {
                // Check file size
                if metadata.len() > self.max_file_size {
                    result.skipped += 1;
                    continue;
                }

                // Check extension
                let extension = entry_path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| format!(".{}", e));

                let should_index = extension
                    .as_ref()
                    .map(|ext| self.indexed_extensions.contains(ext))
                    .unwrap_or(false);

                if should_index {
                    match self.index_file(&entry_path, domain, &metadata).await {
                        Ok(_) => result.indexed += 1,
                        Err(e) => {
                            tracing::warn!("Failed to index {:?}: {}", entry_path, e);
                            result.failed += 1;
                        }
                    }
                } else {
                    result.skipped += 1;
                }
            }
        }

        Ok(())
    }

    /// Index a single file
    async fn index_file(
        &self,
        path: &Path,
        domain: &AssetDomain,
        metadata: &std::fs::Metadata,
    ) -> anyhow::Result<Asset> {
        let path_str = path.to_string_lossy().to_string();
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_string());
        let file_type = determine_file_type(&extension);
        let size_bytes = metadata.len() as i64;
        let last_modified = metadata.modified()
            .map(|t| chrono::DateTime::<chrono::Utc>::from(t))
            .unwrap_or_else(|_| chrono::Utc::now());

        // Calculate content hash
        let content = fs::read(&path).await?;
        let content_hash = format!("{:x}", md5::compute(&content));

        // Insert or update in database
        let asset = sqlx::query_as!(
            Asset,
            r#"
            INSERT INTO asset_registry (
                path, file_name, file_extension, domain,
                file_type, size_bytes, last_modified, content_hash
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (path) DO UPDATE SET
                file_name = EXCLUDED.file_name,
                file_extension = EXCLUDED.file_extension,
                size_bytes = EXCLUDED.size_bytes,
                last_modified = EXCLUDED.last_modified,
                content_hash = EXCLUDED.content_hash,
                updated_at = NOW()
            RETURNING 
                id, path, file_name, file_extension, domain,
                file_type, size_bytes, last_modified,
                content_hash, is_indexed, embedding_id
            "#,
            path_str,
            file_name,
            extension,
            domain.to_string(),
            file_type,
            size_bytes,
            last_modified,
            content_hash,
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(asset)
    }

    /// Search assets by query (basic text search)
    pub async fn search(
        &self,
        query: &str,
        limit: i64,
    ) -> anyhow::Result<Vec<Asset>> {
        let search_pattern = format!("%{}%", query.to_lowercase());

        let assets = sqlx::query_as!(
            Asset,
            r#"
            SELECT 
                id, path, file_name, file_extension, domain,
                file_type, size_bytes, last_modified,
                content_hash, is_indexed, embedding_id
            FROM asset_registry
            WHERE LOWER(path) LIKE $1 OR LOWER(file_name) LIKE $1
            ORDER BY last_modified DESC
            LIMIT $2
            "#,
            search_pattern,
            limit,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(assets)
    }

    /// Get asset statistics
    pub async fn get_stats(&self) -> anyhow::Result<AssetStats> {
        let basic_stats = sqlx::query!(
            r#"
            SELECT 
                COUNT(*)::bigint as "total_assets!",
                COUNT(*) FILTER (WHERE is_indexed = true)::bigint as "indexed_assets!",
                COALESCE(SUM(size_bytes), 0)::bigint as "total_size_bytes!"
            FROM asset_registry
            "#
        )
        .fetch_one(&self.pool)
        .await?;

        // Get counts by domain
        let domain_counts = sqlx::query!(
            r#"
            SELECT domain, COUNT(*)::bigint as "count!"
            FROM asset_registry
            GROUP BY domain
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut by_domain = std::collections::HashMap::new();
        for row in domain_counts {
            by_domain.insert(row.domain, row.count);
        }

        // Get counts by type
        let type_counts = sqlx::query!(
            r#"
            SELECT file_type, COUNT(*)::bigint as "count!"
            FROM asset_registry
            GROUP BY file_type
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut by_type = std::collections::HashMap::new();
        for row in type_counts {
            by_type.insert(row.file_type, row.count);
        }

        Ok(AssetStats {
            total_assets: basic_stats.total_assets,
            indexed_assets: basic_stats.indexed_assets,
            total_size_bytes: basic_stats.total_size_bytes,
            by_domain,
            by_type,
        })
    }

    /// Get asset by path
    pub async fn get_by_path(&self, path: &str) -> anyhow::Result<Option<Asset>> {
        let asset = sqlx::query_as!(
            Asset,
            r#"
            SELECT 
                id, path, file_name, file_extension, domain,
                file_type, size_bytes, last_modified,
                content_hash, is_indexed, embedding_id
            FROM asset_registry
            WHERE path = $1
            "#,
            path,
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(asset)
    }
}

/// Index operation result
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct IndexResult {
    pub indexed: u64,
    pub skipped: u64,
    pub failed: u64,
}

/// Determine file type from extension
fn determine_file_type(extension: &Option<String>) -> String {
    match extension.as_deref() {
        Some("rs") => "rust",
        Some("ts") | Some("tsx") => "typescript",
        Some("js") | Some("jsx") => "javascript",
        Some("py") => "python",
        Some("md") => "markdown",
        Some("json") => "json",
        Some("sql") => "sql",
        Some("yaml") | Some("yml") => "yaml",
        Some("toml") => "toml",
        Some("html") => "html",
        Some("css") => "css",
        Some("sh") | Some("bash") => "shell",
        Some("ps1") => "powershell",
        Some("dockerfile") => "dockerfile",
        _ => "unknown",
    }
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_determine_file_type() {
        assert_eq!(determine_file_type(&Some("rs".into())), "rust");
        assert_eq!(determine_file_type(&Some("ts".into())), "typescript");
        assert_eq!(determine_file_type(&Some("py".into())), "python");
        assert_eq!(determine_file_type(&None), "unknown");
    }

    #[test]
    fn test_asset_domain_display() {
        assert_eq!(AssetDomain::CoreBizra.to_string(), "core_bizra");
        assert_eq!(AssetDomain::RdKnowledge.to_string(), "rd_knowledge");
    }
}
