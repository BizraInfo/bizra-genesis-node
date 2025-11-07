// synthesis_orchestrator/src/trust.rs
// Cryptographic receipts and Proof-of-Impact

use crate::Candidate;
use ring::rand::SystemRandom;
use ring::signature::{Ed25519KeyPair, KeyPair, UnparsedPublicKey, ED25519};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RunReceipt {
    pub run_id: String,
    pub inputs_sha256: String,
    pub winner_model: String,
    pub winner_json_sha256: String,
    pub consensus_hash_hex: String,
    pub policy_version: String,
    pub pattern_pack_sha256: String,
    pub timestamp_ms: u64,
    pub public_key_der: Vec<u8>,
    pub signature: Vec<u8>,
    pub proof_of_impact: Option<ProofOfImpact>,
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
            proof_of_impact: None,
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

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProofOfImpact {
    pub quality: f32,
    pub utility: f32,
    pub trust: f32,
    pub fairness: f32,
    pub diversity: f32,
}

impl ProofOfImpact {
    pub fn normalized_score(&self) -> f32 {
        (self.quality + self.utility + self.trust + self.fairness + self.diversity) / 100.0
    }
}

pub struct TrustBridge {
    key_pair: Ed25519KeyPair,
    _rng: SystemRandom,
}

impl TrustBridge {
    pub fn new() -> Result<Self, String> {
        let rng = SystemRandom::new();
        let pkcs8 =
            Ed25519KeyPair::generate_pkcs8(&rng).map_err(|e| format!("Key gen failed: {:?}", e))?;

        let key_pair = Ed25519KeyPair::from_pkcs8(pkcs8.as_ref())
            .map_err(|e| format!("Key parse failed: {:?}", e))?;

        Ok(Self {
            key_pair,
            _rng: rng,
        })
    }

    pub fn sign_receipt(&self, mut receipt: RunReceipt) -> RunReceipt {
        let payload = self.serialize_for_signing(&receipt);
        let signature = self.key_pair.sign(&payload);

        receipt.public_key_der = self.key_pair.public_key().as_ref().to_vec();
        receipt.signature = signature.as_ref().to_vec();

        receipt
    }

    pub fn verify_receipt(&self, receipt: &RunReceipt) -> bool {
        let payload = self.serialize_for_signing(receipt);
        let pk = UnparsedPublicKey::new(&ED25519, &receipt.public_key_der);
        pk.verify(&payload, &receipt.signature).is_ok()
    }

    fn serialize_for_signing(&self, receipt: &RunReceipt) -> Vec<u8> {
        let stripped = serde_json::json!({
            "run_id": receipt.run_id,
            "winner_model": receipt.winner_model,
            "timestamp_ms": receipt.timestamp_ms,
        });
        serde_json::to_vec(&stripped).unwrap()
    }
}

pub struct ImpactTracker {
    impacts: Vec<ProofOfImpact>,
}

impl Default for ImpactTracker {
    fn default() -> Self {
        Self::new()
    }
}

impl ImpactTracker {
    pub fn new() -> Self {
        Self {
            impacts: Vec::new(),
        }
    }

    pub fn record(&mut self, impact: ProofOfImpact) {
        self.impacts.push(impact);
    }

    pub fn len(&self) -> usize {
        self.impacts.len()
    }

    pub fn is_empty(&self) -> bool {
        self.impacts.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn create_test_candidate() -> Candidate {
        Candidate {
            model: "test-model".to_string(),
            json: json!({"result": "test"}),
            cost_usd: 0.001,
            latency_ms: 100,
            scores: crate::CandidateScores {
                accuracy: 0.9,
                safety: 0.95,
                efficiency: 0.85,
                ihsan: 0.9,
            },
        }
    }

    #[test]
    fn test_trust_bridge_creation() {
        let bridge = TrustBridge::new();
        assert!(bridge.is_ok());
    }

    #[test]
    fn test_receipt_creation() {
        let candidate = create_test_candidate();
        let receipt = RunReceipt::new("test-run-id".to_string(), &candidate);
        assert_eq!(receipt.run_id, "test-run-id");
        assert_eq!(receipt.winner_model, "test-model");
        assert!(!receipt.winner_json_sha256.is_empty());
        // public_key_der and signature are empty until signed
        assert!(receipt.public_key_der.is_empty());
        assert!(receipt.signature.is_empty());
    }

    #[test]
    fn test_receipt_signing() {
        let bridge = TrustBridge::new().unwrap();
        let candidate = create_test_candidate();
        let receipt = RunReceipt::new("test-run-id".to_string(), &candidate);
        let signed = bridge.sign_receipt(receipt);
        
        assert!(!signed.signature.is_empty());
        assert!(!signed.public_key_der.is_empty());
    }

    #[test]
    fn test_receipt_verification() {
        let bridge = TrustBridge::new().unwrap();
        let candidate = create_test_candidate();
        let receipt = RunReceipt::new("test-run-id".to_string(), &candidate);
        let signed = bridge.sign_receipt(receipt);
        
        let verified = bridge.verify_receipt(&signed);
        assert!(verified);
    }

    #[test]
    fn test_receipt_verification_tampered() {
        let bridge = TrustBridge::new().unwrap();
        let candidate = create_test_candidate();
        let mut receipt = RunReceipt::new("test-run-id".to_string(), &candidate);
        receipt = bridge.sign_receipt(receipt);
        
        // Tamper with the receipt
        receipt.winner_model = "tampered-model".to_string();
        
        let verified = bridge.verify_receipt(&receipt);
        assert!(!verified);
    }

    #[test]
    fn test_proof_of_impact_normalized_score() {
        let poi = ProofOfImpact {
            quality: 90.0,
            utility: 80.0,
            trust: 85.0,
            fairness: 75.0,
            diversity: 70.0,
        };
        // (90 + 80 + 85 + 75 + 70) / 100 = 400 / 100 = 4.0
        let normalized = poi.normalized_score();
        assert!((3.99..=4.01).contains(&normalized));
    }

    #[test]
    fn test_impact_tracker() {
        let mut tracker = ImpactTracker::new();
        assert!(tracker.is_empty());
        
        let poi = ProofOfImpact {
            quality: 90.0,
            utility: 80.0,
            trust: 85.0,
            fairness: 75.0,
            diversity: 70.0,
        };
        
        tracker.record(poi);
        assert_eq!(tracker.len(), 1);
        assert!(!tracker.is_empty());
    }

    #[test]
    fn test_receipt_timestamp() {
        let candidate = create_test_candidate();
        let receipt1 = RunReceipt::new("run-1".to_string(), &candidate);
        std::thread::sleep(std::time::Duration::from_millis(10));
        let receipt2 = RunReceipt::new("run-2".to_string(), &candidate);
        
        assert!(receipt2.timestamp_ms >= receipt1.timestamp_ms);
    }

    #[test]
    fn test_hash_json_consistency() {
        let candidate1 = create_test_candidate();
        let candidate2 = create_test_candidate();
        
        let receipt1 = RunReceipt::new("run-1".to_string(), &candidate1);
        let receipt2 = RunReceipt::new("run-2".to_string(), &candidate2);
        
        // Same JSON should produce same hash
        assert_eq!(receipt1.winner_json_sha256, receipt2.winner_json_sha256);
    }
}
