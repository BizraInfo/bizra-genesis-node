// synthesis_orchestrator/src/trust_receipts_week4.rs
// WEEK-4: TRUST & RECEIPTS - Professional Elite Provenance
// Targets: Cryptographic signing, audit trails, Proof-of-Impact

use crate::*;
use blake3::Hasher as Blake3Hasher;
use ring::signature::{Ed25519KeyPair, KeyPair, UnparsedPublicKey, ED25519};
use ring::rand::SystemRandom;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: RUN RECEIPT (Immutable Audit Record)
// ═══════════════════════════════════════════════════════════════════════

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RunReceipt {
    /// Unique run identifier
    pub run_id: String,
    
    /// SHA-256 hash of inputs
    pub inputs_sha256: String,
    
    /// Winner model name
    pub winner_model: String,
    
    /// SHA-256 hash of winner JSON output
    pub winner_json_sha256: String,
    
    /// BLAKE3 hash of consensus state
    pub consensus_hash_hex: String,
    
    /// Policy version used
    pub policy_version: String,
    
    /// Pattern pack SHA-256 (for reproducibility)
    pub pattern_pack_sha256: String,
    
    /// Timestamp (milliseconds since epoch)
    pub timestamp_ms: u64,
    
    /// Ed25519 public key (DER format)
    pub public_key_der: Vec<u8>,
    
    /// Ed25519 signature over receipt fields
    pub signature: Vec<u8>,
}

impl RunReceipt {
    pub fn new(run_id: String, winner: &Candidate) -> Self {
        Self {
            run_id,
            inputs_sha256: String::new(),
            winner_model: winner.model.clone(),
            winner_json_sha256: Self::hash_json(&winner.json),
            consensus_hash_hex: String::new(),
            policy_version: "1.0.0".to_string(),
            pattern_pack_sha256: String::new(),
            timestamp_ms: Self::current_timestamp_ms(),
            public_key_der: vec![],
            signature: vec![],
        }
    }

    fn hash_json(value: &Value) -> String {
        let json_bytes = serde_json::to_vec(value).unwrap_or_default();
        let hash = ring::digest::digest(&ring::digest::SHA256, &json_bytes);
        hex::encode(hash.as_ref())
    }

    fn current_timestamp_ms() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: TRUST BRIDGE (Cryptographic Signing & Verification)
// ═══════════════════════════════════════════════════════════════════════

pub struct TrustBridge {
    key_pair: Ed25519KeyPair,
    rng: SystemRandom,
}

impl TrustBridge {
    /// Initialize with new Ed25519 keypair
    pub fn new() -> Result<Self, String> {
        let rng = SystemRandom::new();
        let pkcs8_bytes = Ed25519KeyPair::generate_pkcs8(&rng)
            .map_err(|e| format!("Key generation failed: {:?}", e))?;
        
        let key_pair = Ed25519KeyPair::from_pkcs8(pkcs8_bytes.as_ref())
            .map_err(|e| format!("Key parsing failed: {:?}", e))?;

        Ok(Self { key_pair, rng })
    }

    /// Sign a receipt with Ed25519
    pub fn sign_receipt(&self, mut receipt: RunReceipt) -> RunReceipt {
        // Serialize receipt fields (excluding signature)
        let payload = self.serialize_for_signing(&receipt);
        
        // Sign
        let signature = self.key_pair.sign(&payload);
        
        // Attach public key and signature
        receipt.public_key_der = self.key_pair.public_key().as_ref().to_vec();
        receipt.signature = signature.as_ref().to_vec();
        
        receipt
    }

    /// Verify receipt signature
    pub fn verify_receipt(&self, receipt: &RunReceipt) -> bool {
        // Reconstruct payload
        let payload = self.serialize_for_signing(receipt);
        
        // Verify signature
        let public_key = UnparsedPublicKey::new(&ED25519, &receipt.public_key_der);
        public_key.verify(&payload, &receipt.signature).is_ok()
    }

    /// Serialize receipt for signing (deterministic)
    fn serialize_for_signing(&self, receipt: &RunReceipt) -> Vec<u8> {
        // Create a stripped version without signature
        let stripped = serde_json::json!({
            "run_id": receipt.run_id,
            "inputs_sha256": receipt.inputs_sha256,
            "winner_model": receipt.winner_model,
            "winner_json_sha256": receipt.winner_json_sha256,
            "consensus_hash_hex": receipt.consensus_hash_hex,
            "policy_version": receipt.policy_version,
            "pattern_pack_sha256": receipt.pattern_pack_sha256,
            "timestamp_ms": receipt.timestamp_ms,
        });
        
        serde_json::to_vec(&stripped).unwrap()
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: PROOF-OF-IMPACT TRACKER
// ═══════════════════════════════════════════════════════════════════════

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProofOfImpact {
    /// Quality dimension (0-100)
    pub quality: f32,
    
    /// Utility dimension (0-100)
    pub utility: f32,
    
    /// Trust dimension (0-100)
    pub trust: f32,
    
    /// Fairness dimension (0-100)
    pub fairness: f32,
    
    /// Diversity dimension (0-100)
    pub diversity: f32,
}

impl ProofOfImpact {
    pub fn new() -> Self {
        Self {
            quality: 30.0,
            utility: 30.0,
            trust: 20.0,
            fairness: 10.0,
            diversity: 10.0,
        }
    }

    /// Total impact score (sum of all dimensions)
    pub fn total_score(&self) -> f32 {
        self.quality + self.utility + self.trust + self.fairness + self.diversity
    }

    /// Normalize to 0-1 range
    pub fn normalized_score(&self) -> f32 {
        self.total_score() / 100.0
    }
}

pub struct ImpactTracker {
    impacts: Vec<ProofOfImpact>,
}

impl ImpactTracker {
    pub fn new() -> Self {
        Self {
            impacts: Vec::new(),
        }
    }

    /// Record impact for a run
    pub fn record(&mut self, impact: ProofOfImpact) {
        self.impacts.push(impact);
    }

    /// Get average impact over all runs
    pub fn average_impact(&self) -> ProofOfImpact {
        if self.impacts.is_empty() {
            return ProofOfImpact::new();
        }

        let sum = self.impacts.iter().fold(
            ProofOfImpact {
                quality: 0.0,
                utility: 0.0,
                trust: 0.0,
                fairness: 0.0,
                diversity: 0.0,
            },
            |acc, impact| ProofOfImpact {
                quality: acc.quality + impact.quality,
                utility: acc.utility + impact.utility,
                trust: acc.trust + impact.trust,
                fairness: acc.fairness + impact.fairness,
                diversity: acc.diversity + impact.diversity,
            },
        );

        let count = self.impacts.len() as f32;
        ProofOfImpact {
            quality: sum.quality / count,
            utility: sum.utility / count,
            trust: sum.trust / count,
            fairness: sum.fairness / count,
            diversity: sum.diversity / count,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: CONSENSUS HASH (BLAKE3)
// ═══════════════════════════════════════════════════════════════════════

pub struct ConsensusHasher;

impl ConsensusHasher {
    /// Compute BLAKE3 hash of consensus state
    pub fn hash_consensus(winner_json: &Value, telemetry: &Telemetry) -> String {
        let mut hasher = Blake3Hasher::new();
        
        // Hash winner output
        let winner_bytes = serde_json::to_vec(winner_json).unwrap();
        hasher.update(&winner_bytes);
        
        // Hash telemetry
        let telemetry_bytes = serde_json::to_vec(telemetry).unwrap();
        hasher.update(&telemetry_bytes);
        
        hasher.finalize().to_hex().to_string()
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 5: TESTS (Week-4 Trust Validation)
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_receipt_creation() {
        let winner = Candidate::example();
        let receipt = RunReceipt::new("test-run-123".to_string(), &winner);
        
        assert_eq!(receipt.run_id, "test-run-123");
        assert_eq!(receipt.winner_model, "model-1");
        assert!(!receipt.winner_json_sha256.is_empty());
    }

    #[test]
    fn test_trust_bridge_sign_verify() {
        let bridge = TrustBridge::new().unwrap();
        let winner = Candidate::example();
        let mut receipt = RunReceipt::new("test-run-456".to_string(), &winner);
        
        // Sign
        receipt = bridge.sign_receipt(receipt);
        
        // Verify signature present
        assert!(!receipt.signature.is_empty());
        assert!(!receipt.public_key_der.is_empty());
        
        // Verify signature valid
        let is_valid = bridge.verify_receipt(&receipt);
        assert!(is_valid);
    }

    #[test]
    fn test_proof_of_impact_scoring() {
        let impact = ProofOfImpact::new();
        
        assert_eq!(impact.total_score(), 100.0);
        assert_eq!(impact.normalized_score(), 1.0);
    }

    #[test]
    fn test_impact_tracker_averaging() {
        let mut tracker = ImpactTracker::new();
        
        let impact1 = ProofOfImpact {
            quality: 40.0,
            utility: 30.0,
            trust: 15.0,
            fairness: 10.0,
            diversity: 5.0,
        };
        
        let impact2 = ProofOfImpact {
            quality: 20.0,
            utility: 30.0,
            trust: 25.0,
            fairness: 15.0,
            diversity: 10.0,
        };
        
        tracker.record(impact1);
        tracker.record(impact2);
        
        let avg = tracker.average_impact();
        assert_eq!(avg.quality, 30.0);
        assert_eq!(avg.trust, 20.0);
    }

    #[test]
    fn test_consensus_hash() {
        let winner_json = json!({"result": "success", "value": 42});
        let telemetry = Telemetry {
            sli_metrics: Sli {
                json_compliance_rate: 0.99,
            },
            quality_metrics: Quality {
                accuracy_uplift: 0.15,
            },
        };
        
        let hash = ConsensusHasher::hash_consensus(&winner_json, &telemetry);
        
        // BLAKE3 hash should be 64 hex chars
        assert_eq!(hash.len(), 64);
        
        // Same inputs should produce same hash
        let hash2 = ConsensusHasher::hash_consensus(&winner_json, &telemetry);
        assert_eq!(hash, hash2);
    }

    #[test]
    fn test_tamper_detection() {
        let bridge = TrustBridge::new().unwrap();
        let winner = Candidate::example();
        let mut receipt = RunReceipt::new("test-run-789".to_string(), &winner);
        
        // Sign original
        receipt = bridge.sign_receipt(receipt);
        assert!(bridge.verify_receipt(&receipt));
        
        // Tamper with data
        receipt.winner_model = "tampered-model".to_string();
        
        // Verification should fail
        assert!(!bridge.verify_receipt(&receipt));
    }
}
