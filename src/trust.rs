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
}
