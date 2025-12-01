//! BIZRA Node0 - Environment Snapshot Service
//! 
//! Captures hardware and system information for Node0.
//! Used during onboarding to recommend resource allocation.

use serde::{Deserialize, Serialize};
use sysinfo::{System, Disks, Networks};

/// Complete environment snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvSnapshot {
    pub node_id: String,
    pub timestamp: String,
    pub hardware: HardwareInfo,
    pub services: ServicesStatus,
    pub models: Vec<String>,
}

/// Hardware information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareInfo {
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub gpu: Option<GpuInfo>,
    pub storage: StorageInfo,
    pub os: OsInfo,
}

/// CPU information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuInfo {
    pub name: String,
    pub cores: usize,
    pub threads: usize,
    pub usage_percent: f32,
    pub frequency_mhz: u64,
}

/// Memory information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInfo {
    pub total_gb: f64,
    pub used_gb: f64,
    pub available_gb: f64,
    pub usage_percent: f64,
}

/// GPU information (if available)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuInfo {
    pub name: String,
    pub vram_gb: f64,
    pub driver_version: String,
    pub cuda_available: bool,
}

/// Storage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageInfo {
    pub total_gb: f64,
    pub used_gb: f64,
    pub available_gb: f64,
    pub usage_percent: f64,
    pub disks: Vec<DiskInfo>,
}

/// Individual disk information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_gb: f64,
    pub available_gb: f64,
    pub file_system: String,
}

/// OS information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OsInfo {
    pub name: String,
    pub version: String,
    pub hostname: String,
    pub kernel_version: String,
}

/// Service status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServicesStatus {
    pub postgres: ServiceHealth,
    pub redis: ServiceHealth,
    pub ollama: ServiceHealth,
    pub neo4j: ServiceHealth,
    pub qdrant: ServiceHealth,
}

/// Individual service health
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealth {
    pub status: String,  // "healthy", "unhealthy", "unknown"
    pub latency_ms: Option<u64>,
}

impl EnvSnapshot {
    /// Capture current environment snapshot
    pub fn capture() -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();

        let node_id = std::env::var("NODE_ID").unwrap_or_else(|_| "NODE0-TITAN".into());

        // CPU Info
        let cpu_info = CpuInfo {
            name: sys.cpus().first()
                .map(|c| c.brand().to_string())
                .unwrap_or_else(|| "Unknown CPU".into()),
            cores: sys.physical_core_count().unwrap_or(0),
            threads: sys.cpus().len(),
            usage_percent: sys.global_cpu_usage(),
            frequency_mhz: sys.cpus().first()
                .map(|c| c.frequency())
                .unwrap_or(0),
        };

        // Memory Info
        let total_mem = sys.total_memory() as f64 / 1_073_741_824.0; // Convert to GB
        let used_mem = sys.used_memory() as f64 / 1_073_741_824.0;
        let available_mem = sys.available_memory() as f64 / 1_073_741_824.0;
        
        let memory_info = MemoryInfo {
            total_gb: (total_mem * 100.0).round() / 100.0,
            used_gb: (used_mem * 100.0).round() / 100.0,
            available_gb: (available_mem * 100.0).round() / 100.0,
            usage_percent: if total_mem > 0.0 { (used_mem / total_mem * 100.0).round() } else { 0.0 },
        };

        // GPU Info (basic detection - would need NVML for full details)
        let gpu_info = detect_gpu();

        // Storage Info
        let disks = Disks::new_with_refreshed_list();
        let mut disk_infos: Vec<DiskInfo> = Vec::new();
        let mut total_storage: f64 = 0.0;
        let mut available_storage: f64 = 0.0;

        for disk in disks.list() {
            let total = disk.total_space() as f64 / 1_073_741_824.0;
            let available = disk.available_space() as f64 / 1_073_741_824.0;
            
            total_storage += total;
            available_storage += available;

            disk_infos.push(DiskInfo {
                name: disk.name().to_string_lossy().to_string(),
                mount_point: disk.mount_point().to_string_lossy().to_string(),
                total_gb: (total * 100.0).round() / 100.0,
                available_gb: (available * 100.0).round() / 100.0,
                file_system: disk.file_system().to_string_lossy().to_string(),
            });
        }

        let storage_info = StorageInfo {
            total_gb: (total_storage * 100.0).round() / 100.0,
            used_gb: ((total_storage - available_storage) * 100.0).round() / 100.0,
            available_gb: (available_storage * 100.0).round() / 100.0,
            usage_percent: if total_storage > 0.0 {
                ((total_storage - available_storage) / total_storage * 100.0).round()
            } else {
                0.0
            },
            disks: disk_infos,
        };

        // OS Info
        let os_info = OsInfo {
            name: System::name().unwrap_or_else(|| "Unknown".into()),
            version: System::os_version().unwrap_or_else(|| "Unknown".into()),
            hostname: System::host_name().unwrap_or_else(|| "Unknown".into()),
            kernel_version: System::kernel_version().unwrap_or_else(|| "Unknown".into()),
        };

        // Services status (placeholder - would check actual services)
        let services = ServicesStatus {
            postgres: ServiceHealth { status: "unknown".into(), latency_ms: None },
            redis: ServiceHealth { status: "unknown".into(), latency_ms: None },
            ollama: ServiceHealth { status: "unknown".into(), latency_ms: None },
            neo4j: ServiceHealth { status: "unknown".into(), latency_ms: None },
            qdrant: ServiceHealth { status: "unknown".into(), latency_ms: None },
        };

        EnvSnapshot {
            node_id,
            timestamp: chrono::Utc::now().to_rfc3339(),
            hardware: HardwareInfo {
                cpu: cpu_info,
                memory: memory_info,
                gpu: gpu_info,
                storage: storage_info,
                os: os_info,
            },
            services,
            models: vec![],
        }
    }

    /// Recommend resource allocation based on hardware
    pub fn recommend_allocation(&self) -> ResourceRecommendation {
        let cpu_recommend = std::cmp::min(
            self.hardware.cpu.cores / 4,  // 25% of cores
            8
        ).max(2);

        let gpu_recommend = self.hardware.gpu.is_some() 
            && self.hardware.memory.total_gb >= 32.0;

        let storage_recommend = (self.hardware.storage.available_gb * 0.1)
            .min(500.0)
            .max(50.0) as u64;

        ResourceRecommendation {
            cpu_cores: cpu_recommend,
            gpu_enabled: gpu_recommend,
            storage_gb: storage_recommend,
            reasoning: format!(
                "Based on {} cores, {:.1}GB RAM, {:.1}GB available storage",
                self.hardware.cpu.cores,
                self.hardware.memory.total_gb,
                self.hardware.storage.available_gb
            ),
        }
    }
}

/// Resource allocation recommendation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceRecommendation {
    pub cpu_cores: usize,
    pub gpu_enabled: bool,
    pub storage_gb: u64,
    pub reasoning: String,
}

/// Detect GPU (basic implementation)
fn detect_gpu() -> Option<GpuInfo> {
    // In production, would use NVML or similar for detailed GPU info
    // This is a placeholder that checks for common GPU indicators
    
    #[cfg(target_os = "windows")]
    {
        // Check for NVIDIA GPU via environment or WMI
        if std::env::var("CUDA_VISIBLE_DEVICES").is_ok() {
            return Some(GpuInfo {
                name: "NVIDIA GPU (detected)".into(),
                vram_gb: 16.0, // Would need NVML for actual value
                driver_version: "Unknown".into(),
                cuda_available: true,
            });
        }
    }
    
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_env_snapshot_capture() {
        let snapshot = EnvSnapshot::capture();
        assert!(!snapshot.node_id.is_empty());
        assert!(snapshot.hardware.cpu.cores > 0);
        assert!(snapshot.hardware.memory.total_gb > 0.0);
    }

    #[test]
    fn test_resource_recommendation() {
        let snapshot = EnvSnapshot::capture();
        let recommendation = snapshot.recommend_allocation();
        assert!(recommendation.cpu_cores >= 2);
        assert!(recommendation.storage_gb >= 50);
    }
}
