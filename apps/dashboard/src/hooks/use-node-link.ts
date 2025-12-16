import { useState, useEffect, useCallback } from 'react';

interface NodeStatus {
  online: boolean;
  version?: string;
  mode?: string;
  uptime?: number;
  hardware?: {
    cpu_cores: number;
    ram_gb: number;
    has_gpu: boolean;
    gpu_name: string;
  };
}

export function useNodeLink() {
  const [status, setStatus] = useState<NodeStatus>({ online: false });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkNodeStatus = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      // Attempt to connect to the local node
      // Note: In a real deployment, this might need CORS configuration on the local server
      // or a proxy if the dashboard is hosted remotely.
      // For the "Genesis" local-first architecture, we assume localhost access.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${apiUrl}/health`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setStatus({
          online: true,
          version: data.version,
          mode: data.mode,
          uptime: data.uptime,
          hardware: data.hardware
        });
      } else {
        setStatus({ online: false });
      }
    } catch (error) {
      setStatus({ online: false });
    } finally {
      setLastChecked(new Date());
    }
  }, []);

  // Poll every 5 seconds
  useEffect(() => {
    checkNodeStatus();
    const interval = setInterval(checkNodeStatus, 5000);
    return () => clearInterval(interval);
  }, [checkNodeStatus]);

  return { status, checkNodeStatus, lastChecked };
}
