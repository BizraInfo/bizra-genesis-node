"use client"

import { motion } from "framer-motion"

interface SacredGeometryBackgroundProps {
  intensity?: 'subtle' | 'medium' | 'vivid';
  animated?: boolean;
}

export function SacredGeometryBackground({ 
  intensity = 'subtle',
  animated = true 
}: SacredGeometryBackgroundProps) {
  const opacityMap = {
    subtle: 0.08,
    medium: 0.15,
    vivid: 0.25,
  };
  
  const baseOpacity = opacityMap[intensity];

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Radial gradient overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 30%, rgba(201, 169, 98, ${baseOpacity}), transparent 60%)`
        }}
      />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 grid-pattern"
        style={{ opacity: baseOpacity * 3 }}
      />
      
      {/* Central Flower of Life */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px]">
        {/* Rotating ring layers */}
        {[0, 1, 2].map((layer) => (
          <motion.div
            key={`layer-${layer}`}
            className="absolute inset-0"
            animate={animated ? { rotate: 360 } : {}}
            transition={{
              duration: 180 + layer * 60,
              repeat: Infinity,
              ease: "linear",
              direction: layer % 2 === 0 ? "normal" : "reverse"
            }}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={`circle-${layer}-${i}`}
                className="absolute top-1/2 left-1/2 rounded-full"
                style={{
                  width: `${250 + layer * 180}px`,
                  height: `${250 + layer * 180}px`,
                  border: `1px solid rgba(201, 169, 98, ${baseOpacity * 2})`,
                  transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateX(${120 + layer * 90}px)`,
                }}
              />
            ))}
          </motion.div>
        ))}
        
        {/* Static central rings */}
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={`ring-${i}`}
            className="absolute top-1/2 left-1/2 rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{
              width: `${i * 150}px`,
              height: `${i * 150}px`,
              border: `1px solid rgba(201, 169, 98, ${baseOpacity * (1.5 - i * 0.2)})`,
            }}
            animate={animated ? {
              scale: [1, 1.02, 1],
              opacity: [baseOpacity, baseOpacity * 1.5, baseOpacity],
            } : {}}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Floating particles */}
      {animated && (
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: 'rgba(201, 169, 98, 0.6)',
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
              }}
              animate={{
                y: [0, -100 - Math.random() * 100],
                opacity: [0, 0.6, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 8 + Math.random() * 8,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "linear",
              }}
            />
          ))}
        </div>
      )}

      {/* Corner accent glows */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px]"
        style={{ background: `rgba(42, 157, 143, ${baseOpacity * 0.5})` }}
      />
      <div 
        className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-[120px]"
        style={{ background: `rgba(201, 169, 98, ${baseOpacity * 0.5})` }}
      />
    </div>
  )
}

// Simplified grid background for dashboard pages
export function GridBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[150px]"
        style={{ background: 'rgba(201, 169, 98, 0.08)' }}
      />
    </div>
  )
}
