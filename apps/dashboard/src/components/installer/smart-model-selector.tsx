'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  HardDrive, 
  Zap, 
  Check, 
  Download, 
  AlertCircle,
  ChevronRight,
  Star,
  Globe,
  Code,
  Brain,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { 
  MODEL_REGISTRY, 
  type AIModel, 
  type HardwareProfile,
  type HardwareTier,
  getRecommendedModels,
  generateModelConfig,
  TIER_RECOMMENDATIONS,
  determineHardwareTier,
  type ModelCapability
} from '@/lib/model-registry';
import { useI18n } from '@/lib/i18n';

interface ModelSelectorProps {
  hardware: HardwareProfile;
  onModelsSelected: (modelIds: string[], config: ReturnType<typeof generateModelConfig>) => void;
}

const CAPABILITY_ICONS: Record<ModelCapability, React.ReactNode> = {
  reasoning: <Brain className="w-3 h-3" />,
  creative: <Sparkles className="w-3 h-3" />,
  coding: <Code className="w-3 h-3" />,
  analysis: <Zap className="w-3 h-3" />,
  conversation: <MessageSquare className="w-3 h-3" />,
  multilingual: <Globe className="w-3 h-3" />,
  vision: <Star className="w-3 h-3" />,
  'function-calling': <Cpu className="w-3 h-3" />,
};

const CAPABILITY_LABELS: Record<ModelCapability, string> = {
  reasoning: 'Reasoning',
  creative: 'Creative',
  coding: 'Coding',
  analysis: 'Analysis',
  conversation: 'Chat',
  multilingual: 'Multilingual',
  vision: 'Vision',
  'function-calling': 'Tools',
};

export function SmartModelSelector({ hardware, onModelsSelected }: ModelSelectorProps) {
  const { locale, t, isRTL } = useI18n();
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [showAllModels, setShowAllModels] = useState(false);

  const tier = useMemo(() => determineHardwareTier(hardware), [hardware]);
  const recommendations = useMemo(() => 
    getRecommendedModels(hardware, locale === 'ar'), 
    [hardware, locale]
  );

  // Auto-select primary model on first render
  React.useEffect(() => {
    if (selectedModels.size === 0 && recommendations.primary) {
      setSelectedModels(new Set([recommendations.primary.id]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations.primary]);

  const toggleModel = (modelId: string) => {
    const newSelected = new Set(selectedModels);
    if (newSelected.has(modelId)) {
      // Don't allow deselecting the last model
      if (newSelected.size > 1) {
        newSelected.delete(modelId);
      }
    } else {
      newSelected.add(modelId);
    }
    setSelectedModels(newSelected);
  };

  const handleConfirm = () => {
    const config = generateModelConfig(hardware, Array.from(selectedModels), locale);
    onModelsSelected(Array.from(selectedModels), config);
  };

  const tierInfo = TIER_RECOMMENDATIONS[tier];
  const config = useMemo(() => 
    generateModelConfig(hardware, Array.from(selectedModels), locale),
    [hardware, selectedModels, locale]
  );

  // Compatible models based on hardware
  const compatibleModels = useMemo(() => 
    MODEL_REGISTRY.filter(model => {
      if (hardware.hasGpu && model.vramRequired > 0) {
        return model.vramRequired <= hardware.vram;
      }
      return model.ramRequired <= hardware.ram;
    }),
    [hardware]
  );

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Hardware Tier Display */}
      <div className="bg-gradient-to-r from-[#D4AF37]/20 to-transparent border border-[#D4AF37]/30 rounded-2xl p-6">
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center">
            <Cpu className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div className="flex-1">
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <h3 className="text-xl font-semibold text-white capitalize">{tier} Tier</h3>
              <span className="px-2 py-0.5 bg-[#D4AF37]/20 text-[#D4AF37] text-xs rounded-full">
                {hardware.ram}GB RAM {hardware.hasGpu && `• ${hardware.vram}GB VRAM`}
              </span>
            </div>
            <p className="text-white/60 text-sm mt-1">{tierInfo.description}</p>
          </div>
        </div>
        
        {/* Features for this tier */}
        <div className={`flex flex-wrap gap-2 mt-4 ${isRTL ? 'justify-end' : ''}`}>
          {tierInfo.features.map((feature, i) => (
            <span 
              key={i}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-white/70"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Recommended Model */}
      {recommendations.primary && (
        <div>
          <h4 className={`text-sm uppercase tracking-wider text-[#D4AF37] mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Star className="w-4 h-4" />
            Recommended for You
          </h4>
          <ModelCard 
            model={recommendations.primary}
            isSelected={selectedModels.has(recommendations.primary.id)}
            onToggle={() => toggleModel(recommendations.primary.id)}
            isRecommended
            isRTL={isRTL}
          />
        </div>
      )}

      {/* Alternative Models */}
      {recommendations.alternatives.length > 0 && (
        <div>
          <h4 className={`text-sm uppercase tracking-wider text-white/60 mb-3 ${isRTL ? 'text-right' : ''}`}>
            Alternative Options
          </h4>
          <div className="grid gap-3">
            {recommendations.alternatives.slice(0, showAllModels ? undefined : 2).map(model => (
              <ModelCard
                key={model.id}
                model={model}
                isSelected={selectedModels.has(model.id)}
                onToggle={() => toggleModel(model.id)}
                isRTL={isRTL}
              />
            ))}
          </div>
          
          {!showAllModels && recommendations.alternatives.length > 2 && (
            <button
              onClick={() => setShowAllModels(true)}
              className={`mt-3 text-sm text-[#D4AF37] hover:underline flex items-center gap-1 ${isRTL ? 'flex-row-reverse ml-auto' : ''}`}
            >
              Show {recommendations.alternatives.length - 2} more options
              <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}

      {/* Selection Summary */}
      <div className="bg-black/40 border border-white/10 rounded-xl p-5">
        <h4 className={`text-white font-medium mb-4 ${isRTL ? 'text-right' : ''}`}>
          Installation Summary
        </h4>
        
        <div className="space-y-3">
          <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-white/60">Models selected</span>
            <span className="text-white font-medium">{selectedModels.size}</span>
          </div>
          <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-white/60">Total download size</span>
            <span className="text-white font-medium">{config.totalSize}</span>
          </div>
          <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-white/60">Estimated time</span>
            <span className="text-white font-medium">{config.estimatedDownloadTime}</span>
          </div>
        </div>

        {/* Storage warning */}
        {parseFloat(config.totalSize) > hardware.availableStorage * 0.8 && (
          <div className={`mt-4 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-amber-500 text-sm">
              Selected models will use most of your available storage. Consider freeing up space or selecting fewer models.
            </p>
          </div>
        )}

        {/* Agent Assignments Preview */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className={`text-xs text-white/40 mb-2 ${isRTL ? 'text-right' : ''}`}>
            Your PAT agents will use these models:
          </p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(config.agentAssignments).slice(0, 4).map(([agent, modelId]) => (
              <span key={agent} className="text-xs px-2 py-1 bg-white/5 rounded text-white/60">
                {agent.replace(/([A-Z])/g, ' $1').trim()} → {modelId}
              </span>
            ))}
            {Object.keys(config.agentAssignments).length > 4 && (
              <span className="text-xs px-2 py-1 bg-white/5 rounded text-white/40">
                +{Object.keys(config.agentAssignments).length - 4} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleConfirm}
        disabled={selectedModels.size === 0}
        className={`
          w-full py-4 rounded-xl font-semibold text-lg
          flex items-center justify-center gap-3
          transition-all duration-300
          ${selectedModels.size > 0
            ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8963E] text-black hover:shadow-lg hover:shadow-[#D4AF37]/30'
            : 'bg-white/10 text-white/40 cursor-not-allowed'
          }
        `}
      >
        <Download className="w-5 h-5" />
        Install {selectedModels.size} Model{selectedModels.size !== 1 ? 's' : ''} ({config.totalSize})
      </motion.button>
    </div>
  );
}

interface ModelCardProps {
  model: AIModel;
  isSelected: boolean;
  onToggle: () => void;
  isRecommended?: boolean;
  isRTL?: boolean;
}

function ModelCard({ model, isSelected, onToggle, isRecommended, isRTL }: ModelCardProps) {
  return (
    <motion.button
      onClick={onToggle}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`
        w-full text-left p-4 rounded-xl border transition-all duration-300
        ${isSelected
          ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
          : 'bg-black/30 border-white/10 hover:border-white/20'
        }
        ${isRecommended ? 'ring-2 ring-[#D4AF37]/30' : ''}
      `}
    >
      <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Selection indicator */}
        <div className={`
          w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
          transition-all duration-200
          ${isSelected
            ? 'bg-[#D4AF37] border-[#D4AF37]'
            : 'border-white/30'
          }
        `}>
          {isSelected && <Check className="w-4 h-4 text-black" />}
        </div>

        {/* Model info */}
        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
          <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <h3 className="text-white font-semibold">{model.name}</h3>
            {isRecommended && (
              <span className="px-2 py-0.5 bg-[#D4AF37]/20 text-[#D4AF37] text-xs rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />
                Best Match
              </span>
            )}
            <span className={`
              px-2 py-0.5 text-xs rounded-full
              ${model.quality === 'excellent' ? 'bg-green-500/20 text-green-400' :
                model.quality === 'good' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'}
            `}>
              {model.quality}
            </span>
          </div>
          
          <p className="text-white/60 text-sm mt-1 line-clamp-1">{model.description}</p>
          
          {/* Capabilities */}
          <div className={`flex flex-wrap gap-1.5 mt-3 ${isRTL ? 'justify-end' : ''}`}>
            {model.capabilities.map(cap => (
              <span 
                key={cap}
                className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded text-xs text-white/60"
              >
                {CAPABILITY_ICONS[cap]}
                {CAPABILITY_LABELS[cap]}
              </span>
            ))}
          </div>
          
          {/* Size and requirements */}
          <div className={`flex items-center gap-4 mt-3 text-xs text-white/40 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              {model.size}
            </span>
            <span>{model.parameters} parameters</span>
            {model.vramRequired > 0 && (
              <span>GPU: {model.vramRequired}GB VRAM</span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export default SmartModelSelector;
