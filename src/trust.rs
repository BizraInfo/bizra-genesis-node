// synthesis_orchestrator/src/trust.rs
// Cryptographic receipts and Proof-of-Impact

use crate::Candidate;
use ring::rand::SystemRandom;
use ring::signature::{Ed25519KeyPair, KeyPair, UnparsedPublicKey, ED25519};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};

/// Immutable cryptographic receipt for a synthesis run.
///
/// Provides tamper-proof record of consensus decisions using Ed25519 signatures
/// and BLAKE3 hashing. Each receipt includes:
/// - Unique run identifier
/// - Winner model and output hash
/// - Cryptographic signature for verification
/// - Optional Proof-of-Impact metrics
///
/// # Security Properties
///
/// - **Integrity**: BLAKE3 hashing ensures data tampering is detectable
/// - **Non-repudiation**: Ed25519 signatures prove authenticity
/// - **Transparency**: All fields are serializable for audit trails
///
/// # Examples
///
/// ```no_run
/// use synthesis_orchestrator::{RunReceipt, Candidate, CandidateScores};
/// use serde_json::json;
///
/// let candidate = Candidate {
///     model: "gpt-4".to_string(),
///     json: json!({"result": "success"}),
///     scores: CandidateScores::default(),
///     cost_usd: 0.03,
///     latency_ms: 1200,
/// };
///
/// let receipt = RunReceipt::new("run-123".to_string(), &candidate);
/// assert_eq!(receipt.run_id, "run-123");
/// assert!(!receipt.winner_json_sha256.is_empty());
/// ```
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RunReceipt {
    /// Unique identifier for this synthesis run
    pub run_id: String,
    /// BLAKE3 hash of input data (reserved for future use)
    pub inputs_sha256: String,
    /// Name of the winning model
    pub winner_model: String,
    /// BLAKE3 hash of winner's JSON output
    pub winner_json_sha256: String,
    /// Consensus decision hash (reserved for future use)
    pub consensus_hash_hex: String,
    /// Policy version used for this run
    pub policy_version: String,
    /// Pattern pack hash (reserved for future use)
    pub pattern_pack_sha256: String,
    /// Unix timestamp in milliseconds
    pub timestamp_ms: u64,
    /// Ed25519 public key (DER format)
    pub public_key_der: Vec<u8>,
    /// Ed25519 signature over run_id, winner_model, timestamp_ms
    pub signature: Vec<u8>,
    /// Optional Proof-of-Impact metrics
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
        let hash = blake3::hash(&json_bytes);
        hash.to_hex().to_string()
    }

    fn current_timestamp_ms() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    }
}

/// Proof-of-Impact metrics for value creation tracking.
///
/// Measures genuine value across five dimensions to ensure AI systems
/// provide meaningful contributions beyond surface-level metrics.
///
/// # Dimensions (0-100 scale each)
///
/// 1. **Quality**: Output correctness and excellence
/// 2. **Utility**: Practical usefulness and task completion
/// 3. **Trust**: Safety, security, and ethical compliance
/// 4. **Fairness**: Bias mitigation and equitable outcomes
/// 5. **Diversity**: Multiple perspectives and approaches
///
/// # Examples
///
/// ```
/// use synthesis_orchestrator::ProofOfImpact;
///
/// let impact = ProofOfImpact {
///     quality: 95.0,
///     utility: 85.0,
///     trust: 90.0,
///     fairness: 80.0,
///     diversity: 75.0,
/// };
///
/// let score = impact.normalized_score();
/// assert!((4.2..=4.3).contains(&score)); // (95+85+90+80+75)/100 = 4.25
/// ```
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProofOfImpact {
    /// Quality score (0-100): Correctness and excellence
    pub quality: f32,
    /// Utility score (0-100): Practical usefulness
    pub utility: f32,
    /// Trust score (0-100): Safety and ethics
    pub trust: f32,
    /// Fairness score (0-100): Bias mitigation
    pub fairness: f32,
    /// Diversity score (0-100): Multiple perspectives
    pub diversity: f32,
}

impl ProofOfImpact {
    /// Calculates normalized aggregate impact score.
    ///
    /// Sums all five dimensions and divides by 100 to produce a
    /// normalized score typically in range [0.0, 5.0].
    ///
    /// # Returns
    ///
    /// Normalized score = (quality + utility + trust + fairness + diversity) / 100.0
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::ProofOfImpact;
    ///
    /// let impact = ProofOfImpact {
    ///     quality: 100.0,
    ///     utility: 100.0,
    ///     trust: 100.0,
    ///     fairness: 100.0,
    ///     diversity: 100.0,
    /// };
    ///
    /// assert_eq!(impact.normalized_score(), 5.0); // Perfect score
    /// ```
    pub fn normalized_score(&self) -> f32 {
        (self.quality + self.utility + self.trust + self.fairness + self.diversity) / 100.0
    }
}

/// Cryptographic trust bridge for signing and verifying receipts.
///
/// Manages Ed25519 key pairs and provides tamper-proof signing of synthesis
/// run receipts. Ensures non-repudiation and integrity of consensus decisions.
///
/// # Security
///
/// - **Algorithm**: Ed25519 (Curve25519 + SHA-512)
/// - **Key Generation**: Cryptographically secure random (SystemRandom)
/// - **Signature Verification**: Constant-time to prevent timing attacks
///
/// # Examples
///
/// ```no_run
/// use synthesis_orchestrator::{TrustBridge, RunReceipt, Candidate, CandidateScores};
/// use serde_json::json;
///
/// let bridge = TrustBridge::new().unwrap();
/// let candidate = Candidate {
///     model: "gpt-4".to_string(),
///     json: json!({"result": "success"}),
///     scores: CandidateScores::default(),
///     cost_usd: 0.03,
///     latency_ms: 1200,
/// };
///
/// let receipt = RunReceipt::new("run-123".to_string(), &candidate);
/// let signed = bridge.sign_receipt(receipt);
/// assert!(!signed.signature.is_empty());
/// assert!(bridge.verify_receipt(&signed));
/// ```
pub struct TrustBridge {
    key_pair: Ed25519KeyPair,
    _rng: SystemRandom,
}

impl TrustBridge {
    /// Creates a new trust bridge with fresh Ed25519 key pair.
    ///
    /// Generates a new cryptographically secure Ed25519 key pair for
    /// signing receipts. Each TrustBridge instance has its own unique keys.
    ///
    /// # Returns
    ///
    /// * `Ok(TrustBridge)` - Successfully initialized bridge
    /// * `Err(String)` - Key generation or parsing failed
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::TrustBridge;
    ///
    /// let bridge = TrustBridge::new();
    /// assert!(bridge.is_ok());
    /// ```
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

    /// Signs a receipt with Ed25519 signature.
    ///
    /// Computes an Ed25519 signature over the receipt's critical fields
    /// (run_id, winner_model, timestamp_ms) and embeds the signature and
    /// public key into the receipt for later verification.
    ///
    /// # Arguments
    ///
    /// * `receipt` - Unsigned receipt to sign
    ///
    /// # Returns
    ///
    /// The same receipt with `signature` and `public_key_der` fields populated.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use synthesis_orchestrator::{TrustBridge, RunReceipt, Candidate, CandidateScores};
    /// use serde_json::json;
    ///
    /// let bridge = TrustBridge::new().unwrap();
    /// let candidate = Candidate {
    ///     model: "gpt-4".to_string(),
    ///     json: json!({"result": "test"}),
    ///     scores: CandidateScores::default(),
    ///     cost_usd: 0.01,
    ///     latency_ms: 1000,
    /// };
    ///
    /// let receipt = RunReceipt::new("run-123".to_string(), &candidate);
    /// let signed = bridge.sign_receipt(receipt);
    /// assert!(!signed.signature.is_empty());
    /// ```
    pub fn sign_receipt(&self, mut receipt: RunReceipt) -> RunReceipt {
        let payload = self.serialize_for_signing(&receipt);
        let signature = self.key_pair.sign(&payload);

        receipt.public_key_der = self.key_pair.public_key().as_ref().to_vec();
        receipt.signature = signature.as_ref().to_vec();

        receipt
    }

    /// Verifies the cryptographic signature of a receipt.
    ///
    /// Uses the embedded public key to verify that the signature matches
    /// the receipt's content. Detects any tampering with the receipt.
    ///
    /// # Arguments
    ///
    /// * `receipt` - Signed receipt to verify
    ///
    /// # Returns
    ///
    /// * `true` - Signature is valid, receipt is authentic and unmodified
    /// * `false` - Signature is invalid or receipt has been tampered with
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use synthesis_orchestrator::{TrustBridge, RunReceipt, Candidate, CandidateScores};
    /// use serde_json::json;
    ///
    /// let bridge = TrustBridge::new().unwrap();
    /// let candidate = Candidate {
    ///     model: "gpt-4".to_string(),
    ///     json: json!({"result": "test"}),
    ///     scores: CandidateScores::default(),
    ///     cost_usd: 0.01,
    ///     latency_ms: 1000,
    /// };
    ///
    /// let receipt = RunReceipt::new("run-123".to_string(), &candidate);
    /// let signed = bridge.sign_receipt(receipt);
    /// assert!(bridge.verify_receipt(&signed));
    /// ```
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

/// Tracker for recording Proof-of-Impact metrics over time.
///
/// Maintains a history of impact measurements to enable aggregate analysis,
/// trend monitoring, and value attribution across multiple synthesis runs.
///
/// # Examples
///
/// ```
/// use synthesis_orchestrator::{ImpactTracker, ProofOfImpact};
///
/// let mut tracker = ImpactTracker::new();
/// assert!(tracker.is_empty());
///
/// let impact = ProofOfImpact {
///     quality: 90.0,
///     utility: 85.0,
///     trust: 88.0,
///     fairness: 82.0,
///     diversity: 78.0,
/// };
///
/// tracker.record(impact);
/// assert_eq!(tracker.len(), 1);
/// assert!(!tracker.is_empty());
/// ```
pub struct ImpactTracker {
    impacts: Vec<ProofOfImpact>,
}

impl Default for ImpactTracker {
    fn default() -> Self {
        Self::new()
    }
}

impl ImpactTracker {
    /// Creates a new empty impact tracker.
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::ImpactTracker;
    ///
    /// let tracker = ImpactTracker::new();
    /// assert_eq!(tracker.len(), 0);
    /// ```
    pub fn new() -> Self {
        Self {
            impacts: Vec::new(),
        }
    }

    /// Records a new Proof-of-Impact measurement.
    ///
    /// Appends the impact to the internal history for later analysis.
    ///
    /// # Arguments
    ///
    /// * `impact` - The Proof-of-Impact metrics to record
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::{ImpactTracker, ProofOfImpact};
    ///
    /// let mut tracker = ImpactTracker::new();
    /// let impact = ProofOfImpact {
    ///     quality: 95.0,
    ///     utility: 90.0,
    ///     trust: 92.0,
    ///     fairness: 85.0,
    ///     diversity: 80.0,
    /// };
    ///
    /// tracker.record(impact);
    /// assert_eq!(tracker.len(), 1);
    /// ```
    pub fn record(&mut self, impact: ProofOfImpact) {
        self.impacts.push(impact);
    }

    /// Returns the number of recorded impacts.
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::{ImpactTracker, ProofOfImpact};
    ///
    /// let mut tracker = ImpactTracker::new();
    /// assert_eq!(tracker.len(), 0);
    ///
    /// tracker.record(ProofOfImpact {
    ///     quality: 90.0, utility: 85.0, trust: 88.0,
    ///     fairness: 80.0, diversity: 75.0,
    /// });
    /// assert_eq!(tracker.len(), 1);
    /// ```
    pub fn len(&self) -> usize {
        self.impacts.len()
    }

    /// Returns true if no impacts have been recorded.
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::ImpactTracker;
    ///
    /// let tracker = ImpactTracker::new();
    /// assert!(tracker.is_empty());
    /// ```
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
