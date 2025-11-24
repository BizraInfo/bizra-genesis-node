//! Enterprise Secrets Management for BIZRA Genesis Node
//!
//! Provides centralized secrets management with support for:
//! - HashiCorp Vault for development and self-hosted deployments
//! - Google Cloud KMS for cloud-native deployments
//! - Automatic credential rotation and renewal
//! - Fallback mechanisms for high availability

pub mod vault;
pub mod kms;
pub mod manager;

pub use manager::{SecretManager, SecretError};
pub use vault::VaultClient;
pub use kms::KmsClient;
