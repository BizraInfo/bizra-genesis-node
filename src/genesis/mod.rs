//! # BIZRA Genesis Block & Hyper Blocktree
//!
//! This module implements the core data structures for the BIZRA Hyper Blocktree,
//! starting with the Genesis Block (Node0).
//!
//! ## Vision
//! "Bizra is not just a project, it's a complete vision ecosystem...
//! Node0 is also the genesis block or block zero for our system."
//!
//! ## Architecture
//! - **Genesis Block**: The immutable anchor of the ecosystem (Ramadan 2023).
//! - **Hyper Blocktree**: A directed acyclic graph (DAG) of blocks, allowing for
//!   parallel processing and "Proof of Impact" consensus.
//! - **Proof of Impact**: The consensus mechanism that validates value creation.

use crate::trust::ProofOfImpact;
use chrono::{Datelike, DateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// The Genesis Block (Node0) - The Seed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenesisBlock {
    /// Unique identifier (Hash of "BIZRA GENESIS")
    pub id: String,
    /// Timestamp of the Genesis (Ramadan 2023)
    pub timestamp: DateTime<Utc>,
    /// The foundational Proof of Impact (The Vision)
    pub initial_impact: ProofOfImpact,
    /// The "Seed" message or manifesto hash
    pub seed_hash: String,
    /// Configuration for the dual-token system (Stable/Growth)
    pub token_config: TokenConfig,
}

impl Default for GenesisBlock {
    fn default() -> Self {
        Self::new()
    }
}

impl GenesisBlock {
    /// Create the immutable Genesis Block
    pub fn new() -> Self {
        // Ramadan 2023 (approximate start date: March 23, 2023)
        let genesis_time = Utc.with_ymd_and_hms(2023, 3, 23, 0, 0, 0).unwrap();

        Self {
            id: "BIZRA_GENESIS_NODE_0".to_string(),
            timestamp: genesis_time,
            initial_impact: ProofOfImpact {
                quality: 100.0,   // Pure Vision
                utility: 100.0,   // Universal Resource Pool
                trust: 100.0,     // Ihsan
                fairness: 100.0,  // Solidarity
                diversity: 100.0, // Global Ecosystem
            },
            seed_hash: blake3::hash(b"BIZRA: From Darkness to Light").to_hex().to_string(),
            token_config: TokenConfig::default(),
        }
    }
}

/// Configuration for the Dual Token System
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenConfig {
    pub stable_token_symbol: String,
    pub growth_token_symbol: String,
    pub initial_supply: u64,
}

impl Default for TokenConfig {
    fn default() -> Self {
        Self {
            stable_token_symbol: "BZRS".to_string(), // Bizra Stable
            growth_token_symbol: "BZRG".to_string(), // Bizra Growth
            initial_supply: 1_000_000_000,
        }
    }
}

/// A Block in the Hyper Blocktree
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperBlock {
    /// Block ID (Hash)
    pub id: String,
    /// Parent Block IDs (DAG structure - can have multiple parents)
    pub parent_ids: Vec<String>,
    /// Timestamp
    pub timestamp: DateTime<Utc>,
    /// Proof of Impact for this block
    pub impact: ProofOfImpact,
    /// Transactions or State Transitions
    pub data_hash: String,
    /// Generator Agent ID (PAT or SAT)
    pub generator_id: String,
}

/// The Hyper Blocktree Manager
pub struct HyperBlocktree {
    /// The Genesis Block
    pub genesis: GenesisBlock,
    /// The Blocktree (In-memory for now, would be distributed)
    pub blocks: HashMap<String, HyperBlock>,
}

impl HyperBlocktree {
    /// Initialize the Hyper Blocktree with the Genesis Block
    pub fn new() -> Self {
        Self {
            genesis: GenesisBlock::new(),
            blocks: HashMap::new(),
        }
    }

    /// Add a new block to the tree
    pub fn add_block(&mut self, block: HyperBlock) -> Result<(), String> {
        // Verify parents exist (or are genesis)
        for parent_id in &block.parent_ids {
            if parent_id != &self.genesis.id && !self.blocks.contains_key(parent_id) {
                return Err(format!("Parent block {} not found", parent_id));
            }
        }

        // Verify Proof of Impact (Basic check)
        if block.impact.normalized_score() < 1.0 {
            return Err("Insufficient Proof of Impact".to_string());
        }

        self.blocks.insert(block.id.clone(), block);
        Ok(())
    }

    /// Get the Genesis Block
    pub fn get_genesis(&self) -> &GenesisBlock {
        &self.genesis
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_genesis_block_creation() {
        let genesis = GenesisBlock::new();
        assert_eq!(genesis.id, "BIZRA_GENESIS_NODE_0");
        assert_eq!(genesis.timestamp.year(), 2023);
        assert_eq!(genesis.initial_impact.quality, 100.0);
    }

    #[test]
    fn test_hyper_blocktree_init() {
        let tree = HyperBlocktree::new();
        assert_eq!(tree.get_genesis().id, "BIZRA_GENESIS_NODE_0");
        assert!(tree.blocks.is_empty());
    }

    #[test]
    fn test_add_block() {
        let mut tree = HyperBlocktree::new();
        let genesis_id = tree.get_genesis().id.clone();

        let block = HyperBlock {
            id: "block_1".to_string(),
            parent_ids: vec![genesis_id],
            timestamp: Utc::now(),
            impact: ProofOfImpact {
                quality: 80.0,
                utility: 80.0,
                trust: 80.0,
                fairness: 80.0,
                diversity: 80.0,
            },
            data_hash: "data".to_string(),
            generator_id: "agent_1".to_string(),
        };

        assert!(tree.add_block(block).is_ok());
    }
}
