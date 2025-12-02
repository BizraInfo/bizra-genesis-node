// BIZRA AI Model Registry & Hardware-Based Selection
// Automatically configures optimal models based on user's hardware

export interface AIModel {
  id: string;
  name: string;
  provider: 'ollama' | 'llamacpp' | 'custom';
  size: string; // Human readable (e.g., "3.8GB")
  sizeBytes: number;
  parameters: string; // e.g., "7B", "13B"
  quantization: string; // e.g., "Q4_K_M", "Q8_0"
  vramRequired: number; // In GB
  ramRequired: number; // In GB for CPU-only mode
  cpuMinCores: number;
  capabilities: ModelCapability[];
  speed: 'fast' | 'medium' | 'slow';
  quality: 'basic' | 'good' | 'excellent';
  description: string;
  downloadUrl?: string;
  bestFor: string[];
}

export type ModelCapability = 
  | 'reasoning'
  | 'creative'
  | 'coding'
  | 'analysis'
  | 'conversation'
  | 'multilingual'
  | 'vision'
  | 'function-calling';

export type HardwareTier = 'minimal' | 'basic' | 'standard' | 'powerful' | 'ultra';

export interface HardwareProfile {
  tier: HardwareTier;
  ram: number; // GB
  vram: number; // GB (0 if no GPU)
  cpuCores: number;
  hasGpu: boolean;
  gpuName?: string;
  availableStorage: number; // GB
}

// Model Registry - Curated list of models for each tier
export const MODEL_REGISTRY: AIModel[] = [
  // === MINIMAL TIER (2-4GB RAM, No GPU) ===
  {
    id: 'tinyllama-1.1b',
    name: 'TinyLlama 1.1B',
    provider: 'ollama',
    size: '637MB',
    sizeBytes: 637 * 1024 * 1024,
    parameters: '1.1B',
    quantization: 'Q4_0',
    vramRequired: 0,
    ramRequired: 2,
    cpuMinCores: 2,
    capabilities: ['conversation', 'reasoning'],
    speed: 'fast',
    quality: 'basic',
    description: 'Ultra-light model for basic chat and simple tasks',
    bestFor: ['Basic chat', 'Simple Q&A', 'Low-resource devices'],
  },
  {
    id: 'phi-2',
    name: 'Microsoft Phi-2',
    provider: 'ollama',
    size: '1.7GB',
    sizeBytes: 1.7 * 1024 * 1024 * 1024,
    parameters: '2.7B',
    quantization: 'Q4_K_M',
    vramRequired: 0,
    ramRequired: 4,
    cpuMinCores: 2,
    capabilities: ['reasoning', 'coding', 'conversation'],
    speed: 'fast',
    quality: 'good',
    description: 'Small but mighty - excellent reasoning for its size',
    bestFor: ['Code assistance', 'Reasoning tasks', 'Education'],
  },

  // === BASIC TIER (4-8GB RAM, No/Low GPU) ===
  {
    id: 'gemma-2b',
    name: 'Google Gemma 2B',
    provider: 'ollama',
    size: '1.4GB',
    sizeBytes: 1.4 * 1024 * 1024 * 1024,
    parameters: '2B',
    quantization: 'Q4_K_M',
    vramRequired: 0,
    ramRequired: 4,
    cpuMinCores: 2,
    capabilities: ['conversation', 'reasoning', 'creative'],
    speed: 'fast',
    quality: 'good',
    description: 'Efficient model from Google with great multilingual support',
    bestFor: ['General chat', 'Content writing', 'Multilingual'],
  },
  {
    id: 'stablelm-2-zephyr-1.6b',
    name: 'StableLM 2 Zephyr',
    provider: 'ollama',
    size: '987MB',
    sizeBytes: 987 * 1024 * 1024,
    parameters: '1.6B',
    quantization: 'Q4_K_M',
    vramRequired: 0,
    ramRequired: 3,
    cpuMinCores: 2,
    capabilities: ['conversation', 'creative'],
    speed: 'fast',
    quality: 'good',
    description: 'Instruction-tuned for helpful, harmless conversations',
    bestFor: ['Chat', 'Creative writing', 'Safe conversations'],
  },
  {
    id: 'qwen2-1.5b',
    name: 'Qwen2 1.5B',
    provider: 'ollama',
    size: '934MB',
    sizeBytes: 934 * 1024 * 1024,
    parameters: '1.5B',
    quantization: 'Q4_K_M',
    vramRequired: 0,
    ramRequired: 3,
    cpuMinCores: 2,
    capabilities: ['conversation', 'reasoning', 'multilingual'],
    speed: 'fast',
    quality: 'good',
    description: 'Excellent multilingual support including Arabic',
    bestFor: ['Arabic', 'Chinese', 'Multilingual chat'],
  },

  // === STANDARD TIER (8-16GB RAM, 4-6GB GPU) ===
  {
    id: 'llama3.2-3b',
    name: 'Meta Llama 3.2 3B',
    provider: 'ollama',
    size: '2.0GB',
    sizeBytes: 2.0 * 1024 * 1024 * 1024,
    parameters: '3B',
    quantization: 'Q4_K_M',
    vramRequired: 3,
    ramRequired: 6,
    cpuMinCores: 4,
    capabilities: ['reasoning', 'conversation', 'creative', 'multilingual'],
    speed: 'fast',
    quality: 'good',
    description: 'Latest Llama with great balance of speed and quality',
    bestFor: ['General assistant', 'Creative writing', 'Analysis'],
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    provider: 'ollama',
    size: '4.1GB',
    sizeBytes: 4.1 * 1024 * 1024 * 1024,
    parameters: '7B',
    quantization: 'Q4_K_M',
    vramRequired: 5,
    ramRequired: 8,
    cpuMinCores: 4,
    capabilities: ['reasoning', 'coding', 'conversation', 'creative'],
    speed: 'medium',
    quality: 'excellent',
    description: 'Outstanding performance in reasoning and code',
    bestFor: ['Complex reasoning', 'Code generation', 'Analysis'],
  },
  {
    id: 'gemma-7b',
    name: 'Google Gemma 7B',
    provider: 'ollama',
    size: '5.0GB',
    sizeBytes: 5.0 * 1024 * 1024 * 1024,
    parameters: '7B',
    quantization: 'Q4_K_M',
    vramRequired: 6,
    ramRequired: 10,
    cpuMinCores: 4,
    capabilities: ['reasoning', 'coding', 'creative', 'multilingual'],
    speed: 'medium',
    quality: 'excellent',
    description: 'Google\'s powerful open model with safety guardrails',
    bestFor: ['Code', 'Math', 'Multilingual tasks'],
  },
  {
    id: 'qwen2-7b',
    name: 'Qwen2 7B',
    provider: 'ollama',
    size: '4.4GB',
    sizeBytes: 4.4 * 1024 * 1024 * 1024,
    parameters: '7B',
    quantization: 'Q4_K_M',
    vramRequired: 5,
    ramRequired: 10,
    cpuMinCores: 4,
    capabilities: ['reasoning', 'coding', 'multilingual', 'function-calling'],
    speed: 'medium',
    quality: 'excellent',
    description: 'Best-in-class Arabic and Chinese support with function calling',
    bestFor: ['Arabic', 'Coding', 'Tool use'],
  },

  // === POWERFUL TIER (16-32GB RAM, 8-12GB GPU) ===
  {
    id: 'llama3.1-8b',
    name: 'Meta Llama 3.1 8B',
    provider: 'ollama',
    size: '4.7GB',
    sizeBytes: 4.7 * 1024 * 1024 * 1024,
    parameters: '8B',
    quantization: 'Q4_K_M',
    vramRequired: 6,
    ramRequired: 10,
    cpuMinCores: 4,
    capabilities: ['reasoning', 'coding', 'conversation', 'creative', 'function-calling'],
    speed: 'medium',
    quality: 'excellent',
    description: 'Flagship 8B with tool use and great reasoning',
    bestFor: ['Complex tasks', 'Agents', 'Function calling'],
  },
  {
    id: 'codellama-13b',
    name: 'Code Llama 13B',
    provider: 'ollama',
    size: '7.4GB',
    sizeBytes: 7.4 * 1024 * 1024 * 1024,
    parameters: '13B',
    quantization: 'Q4_K_M',
    vramRequired: 10,
    ramRequired: 16,
    cpuMinCores: 6,
    capabilities: ['coding', 'reasoning'],
    speed: 'medium',
    quality: 'excellent',
    description: 'Specialized for code generation and understanding',
    bestFor: ['Programming', 'Code review', 'Debugging'],
  },
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B MoE',
    provider: 'ollama',
    size: '26GB',
    sizeBytes: 26 * 1024 * 1024 * 1024,
    parameters: '47B',
    quantization: 'Q4_K_M',
    vramRequired: 24,
    ramRequired: 32,
    cpuMinCores: 8,
    capabilities: ['reasoning', 'coding', 'creative', 'analysis', 'multilingual'],
    speed: 'medium',
    quality: 'excellent',
    description: 'Mixture of Experts - massive capability, efficient inference',
    bestFor: ['Complex reasoning', 'Multi-domain expertise', 'High quality'],
  },

  // === ULTRA TIER (32GB+ RAM, 16GB+ GPU) ===
  {
    id: 'llama3.1-70b',
    name: 'Meta Llama 3.1 70B',
    provider: 'ollama',
    size: '40GB',
    sizeBytes: 40 * 1024 * 1024 * 1024,
    parameters: '70B',
    quantization: 'Q4_K_M',
    vramRequired: 40,
    ramRequired: 48,
    cpuMinCores: 12,
    capabilities: ['reasoning', 'coding', 'creative', 'analysis', 'multilingual', 'function-calling'],
    speed: 'slow',
    quality: 'excellent',
    description: 'Near GPT-4 level capability, runs locally',
    bestFor: ['Maximum quality', 'Complex analysis', 'Professional work'],
  },
  {
    id: 'qwen2-72b',
    name: 'Qwen2 72B',
    provider: 'ollama',
    size: '41GB',
    sizeBytes: 41 * 1024 * 1024 * 1024,
    parameters: '72B',
    quantization: 'Q4_K_M',
    vramRequired: 42,
    ramRequired: 48,
    cpuMinCores: 12,
    capabilities: ['reasoning', 'coding', 'creative', 'multilingual', 'function-calling'],
    speed: 'slow',
    quality: 'excellent',
    description: 'Best multilingual large model with Arabic excellence',
    bestFor: ['Arabic', 'Professional translation', 'Complex analysis'],
  },
];

// Agent to Model mapping - which models work best for each PAT agent
export const AGENT_MODEL_REQUIREMENTS: Record<string, {
  requiredCapabilities: ModelCapability[];
  preferredCapabilities: ModelCapability[];
  minQuality: 'basic' | 'good' | 'excellent';
}> = {
  MasterReasoner: {
    requiredCapabilities: ['reasoning'],
    preferredCapabilities: ['analysis', 'function-calling'],
    minQuality: 'good',
  },
  MemoryArchitect: {
    requiredCapabilities: ['conversation'],
    preferredCapabilities: ['reasoning'],
    minQuality: 'basic',
  },
  CreativeSynthesizer: {
    requiredCapabilities: ['creative'],
    preferredCapabilities: ['multilingual'],
    minQuality: 'good',
  },
  DataAnalyzer: {
    requiredCapabilities: ['reasoning', 'analysis'],
    preferredCapabilities: ['coding'],
    minQuality: 'good',
  },
  Communicator: {
    requiredCapabilities: ['conversation'],
    preferredCapabilities: ['multilingual', 'creative'],
    minQuality: 'basic',
  },
  ExecutionPlanner: {
    requiredCapabilities: ['reasoning'],
    preferredCapabilities: ['function-calling'],
    minQuality: 'good',
  },
  EthicsGuardian: {
    requiredCapabilities: ['reasoning'],
    preferredCapabilities: ['conversation'],
    minQuality: 'basic',
  },
};

// Determine hardware tier from profile
export function determineHardwareTier(hardware: HardwareProfile): HardwareTier {
  const { ram, vram, hasGpu, cpuCores } = hardware;

  if (ram >= 32 && (vram >= 16 || ram >= 48)) {
    return 'ultra';
  }
  if (ram >= 16 && (vram >= 8 || ram >= 24)) {
    return 'powerful';
  }
  if (ram >= 8 && (vram >= 4 || ram >= 12)) {
    return 'standard';
  }
  if (ram >= 4) {
    return 'basic';
  }
  return 'minimal';
}

// Get recommended models for a hardware tier
export function getRecommendedModels(
  hardware: HardwareProfile,
  preferArabic: boolean = false
): {
  primary: AIModel;
  alternatives: AIModel[];
  specialized: Record<string, AIModel>;
} {
  const tier = determineHardwareTier(hardware);
  
  // Filter models that can run on this hardware
  const compatibleModels = MODEL_REGISTRY.filter(model => {
    if (hardware.hasGpu && model.vramRequired > 0) {
      return model.vramRequired <= hardware.vram;
    }
    return model.ramRequired <= hardware.ram;
  });

  // Sort by quality and capability match
  const sortedModels = [...compatibleModels].sort((a, b) => {
    const qualityOrder = { excellent: 3, good: 2, basic: 1 };
    const qualityDiff = qualityOrder[b.quality] - qualityOrder[a.quality];
    if (qualityDiff !== 0) return qualityDiff;
    
    // Prefer models with more capabilities
    return b.capabilities.length - a.capabilities.length;
  });

  // Find best model for Arabic if preferred
  let primary: AIModel;
  if (preferArabic) {
    const arabicModels = sortedModels.filter(m => 
      m.capabilities.includes('multilingual') || 
      m.id.includes('qwen') || 
      m.bestFor.some(b => b.toLowerCase().includes('arabic'))
    );
    primary = arabicModels[0] || sortedModels[0] || MODEL_REGISTRY[0];
  } else {
    primary = sortedModels[0] || MODEL_REGISTRY[0];
  }

  // Get alternatives (different from primary, still high quality)
  const alternatives = primary ? sortedModels
    .filter(m => m.id !== primary.id)
    .slice(0, 3) : [];

  // Get specialized models for each agent type
  const specialized: Record<string, AIModel> = {};
  
  // Find best model for coding
  const codingModel = sortedModels.find(m => m.capabilities.includes('coding'));
  if (codingModel) specialized.coding = codingModel;

  // Find best for creative
  const creativeModel = sortedModels.find(m => m.capabilities.includes('creative'));
  if (creativeModel) specialized.creative = creativeModel;

  // Find best for reasoning
  const reasoningModel = sortedModels.find(m => m.capabilities.includes('reasoning'));
  if (reasoningModel) specialized.reasoning = reasoningModel;

  return { primary, alternatives, specialized };
}

// Generate model configuration for installation
export function generateModelConfig(
  hardware: HardwareProfile,
  selectedModels: string[],
  locale: string = 'en'
): {
  models: AIModel[];
  totalSize: string;
  estimatedDownloadTime: string;
  installCommand: string;
  agentAssignments: Record<string, string>;
} {
  const models = MODEL_REGISTRY.filter(m => selectedModels.includes(m.id));
  
  const totalBytes = models.reduce((sum, m) => sum + m.sizeBytes, 0);
  const totalGB = totalBytes / (1024 * 1024 * 1024);
  
  // Estimate download time (assume 10 Mbps average)
  const downloadSeconds = totalBytes / (10 * 1024 * 1024 / 8);
  const downloadMinutes = Math.ceil(downloadSeconds / 60);
  
  // Generate ollama pull commands
  const installCommand = models
    .map(m => `ollama pull ${m.id}`)
    .join(' && ');

  // Assign models to agents based on capabilities
  const agentAssignments: Record<string, string> = {};
  const primaryModel = models[0];
  
  // Only assign if we have models
  if (primaryModel) {
    Object.entries(AGENT_MODEL_REQUIREMENTS).forEach(([agent, requirements]) => {
      // Find best matching model for this agent
      const matchingModel = models.find(m => 
        requirements.requiredCapabilities.every(cap => m.capabilities.includes(cap))
      ) || primaryModel;
      
      agentAssignments[agent] = matchingModel.id;
    });
  }

  return {
    models,
    totalSize: `${totalGB.toFixed(1)} GB`,
    estimatedDownloadTime: downloadMinutes < 60 
      ? `~${downloadMinutes} minutes`
      : `~${Math.ceil(downloadMinutes / 60)} hours`,
    installCommand,
    agentAssignments,
  };
}

// Get tier-specific recommendations
export const TIER_RECOMMENDATIONS: Record<HardwareTier, {
  description: string;
  primaryRecommendation: string;
  features: string[];
}> = {
  minimal: {
    description: 'Limited resources - basic AI capabilities',
    primaryRecommendation: 'phi-2',
    features: ['Basic chat', 'Simple Q&A', 'Text completion'],
  },
  basic: {
    description: 'Entry-level - good for personal use',
    primaryRecommendation: 'qwen2-1.5b',
    features: ['Multilingual chat', 'Basic reasoning', 'Creative writing'],
  },
  standard: {
    description: 'Well-balanced - suitable for most users',
    primaryRecommendation: 'qwen2-7b',
    features: ['Full PAT agents', 'Code assistance', 'Arabic support', 'Analysis'],
  },
  powerful: {
    description: 'High-performance - professional capabilities',
    primaryRecommendation: 'llama3.1-8b',
    features: ['Advanced agents', 'Function calling', 'Complex reasoning', 'Multi-tasking'],
  },
  ultra: {
    description: 'Maximum power - enterprise-grade AI',
    primaryRecommendation: 'qwen2-72b',
    features: ['Near GPT-4 quality', 'All capabilities', 'Complex analysis', 'Best Arabic'],
  },
};
