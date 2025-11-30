"use client"

import { motion } from "framer-motion"

export function SystemDiagram() {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-[#fbbf24]/20 bg-slate-950/50 p-8 backdrop-blur-sm">
      <h3 className="mb-6 font-serif text-xl text-[#fbbf24]">System Topology v2.0</h3>

      <div className="relative flex justify-center py-8">
        <svg
          viewBox="0 0 800 600"
          className="w-full h-auto max-w-[800px]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Defs for markers and gradients */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
            <linearGradient id="gold-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="blue-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* User Node */}
          <g transform="translate(400, 40)">
            <motion.circle
              cx="0"
              cy="0"
              r="30"
              fill="#fbbf24"
              fillOpacity="0.1"
              stroke="#fbbf24"
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            />
            <text x="0" y="5" textAnchor="middle" fill="#fbbf24" fontSize="12" fontFamily="Inter">
              User / Operator
            </text>
          </g>

          {/* Connection: User -> UI */}
          <motion.path
            d="M 400 70 L 400 120"
            stroke="#94a3b8"
            strokeWidth="1"
            markerEnd="url(#arrowhead)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          />

          {/* L7: Client Side Subgraph */}
          <g transform="translate(150, 120)">
            <motion.rect
              x="0"
              y="0"
              width="500"
              height="120"
              rx="10"
              fill="url(#blue-gradient)"
              stroke="#0ea5e9"
              strokeWidth="1"
              strokeDasharray="4 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            <text x="20" y="30" fill="#0ea5e9" fontSize="14" fontWeight="bold">
              L7: The Public Face (Next.js)
            </text>

            {/* UI Nodes */}
            <g transform="translate(250, 70)">
              <rect x="-60" y="-20" width="120" height="40" rx="5" fill="#1e293b" stroke="#0ea5e9" />
              <text x="0" y="5" textAnchor="middle" fill="#e2e8f0" fontSize="12">
                Glass Interface
              </text>
            </g>

            <g transform="translate(100, 70)">
              <rect x="-60" y="-20" width="120" height="40" rx="5" fill="#1e293b" stroke="#0ea5e9" />
              <text x="0" y="5" textAnchor="middle" fill="#e2e8f0" fontSize="12">
                Onboarding
              </text>
            </g>

            <g transform="translate(400, 70)">
              <rect x="-60" y="-20" width="120" height="40" rx="5" fill="#1e293b" stroke="#0ea5e9" />
              <text x="0" y="5" textAnchor="middle" fill="#e2e8f0" fontSize="12">
                3D Citadel
              </text>
            </g>

            {/* Internal UI Links */}
            <path d="M 190 70 L 160 70" stroke="#0ea5e9" strokeWidth="1" markerEnd="url(#arrowhead)" />
            <path d="M 310 70 L 340 70" stroke="#0ea5e9" strokeWidth="1" markerEnd="url(#arrowhead)" />
          </g>

          {/* Connection: UI -> Gateway */}
          <motion.path
            d="M 400 240 L 400 280"
            stroke="#94a3b8"
            strokeWidth="1"
            markerEnd="url(#arrowhead)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          />

          {/* Gateway Node */}
          <g transform="translate(400, 300)">
            <rect x="-60" y="-20" width="120" height="40" rx="5" fill="#1e293b" stroke="#94a3b8" />
            <text x="0" y="5" textAnchor="middle" fill="#e2e8f0" fontSize="12">
              API Gateway
            </text>
          </g>

          {/* Connection: Gateway -> Genesis */}
          <motion.path
            d="M 400 320 L 400 360"
            stroke="#94a3b8"
            strokeWidth="1"
            markerEnd="url(#arrowhead)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
          />

          {/* Genesis Node Subgraph */}
          <g transform="translate(100, 360)">
            <motion.rect
              x="0"
              y="0"
              width="600"
              height="200"
              rx="10"
              fill="url(#gold-gradient)"
              stroke="#fbbf24"
              strokeWidth="1"
              strokeDasharray="4 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            />
            <text x="20" y="30" fill="#fbbf24" fontSize="14" fontWeight="bold">
              BIZRA Genesis Node (Rust)
            </text>

            {/* L1 State */}
            <g transform="translate(300, 60)">
              <rect x="-70" y="-20" width="140" height="40" rx="5" fill="#2e1065" stroke="#fbbf24" />
              <text x="0" y="5" textAnchor="middle" fill="#fbbf24" fontSize="12">
                L1: Genesis State
              </text>
            </g>

            {/* L0 Engine */}
            <g transform="translate(150, 130)">
              <rect x="-70" y="-20" width="140" height="40" rx="5" fill="#2e1065" stroke="#fbbf24" />
              <text x="0" y="5" textAnchor="middle" fill="#fbbf24" fontSize="12">
                L0: Sacred Geometry
              </text>
            </g>

            {/* L2 Ledger */}
            <g transform="translate(450, 130)">
              <rect x="-70" y="-20" width="140" height="40" rx="5" fill="#2e1065" stroke="#fbbf24" />
              <text x="0" y="5" textAnchor="middle" fill="#fbbf24" fontSize="12">
                L2: Citadel Ledger
              </text>
            </g>

            {/* L3 Aegis */}
            <g transform="translate(300, 160)">
              <rect x="-60" y="-20" width="120" height="40" rx="5" fill="#2e1065" stroke="#fbbf24" />
              <text x="0" y="5" textAnchor="middle" fill="#fbbf24" fontSize="12">
                L3: Aegis
              </text>
            </g>

            {/* Links inside Genesis */}
            <path d="M 300 80 L 150 110" stroke="#fbbf24" strokeWidth="1" markerEnd="url(#arrowhead)" />
            <path d="M 300 80 L 450 110" stroke="#fbbf24" strokeWidth="1" markerEnd="url(#arrowhead)" />
            <path d="M 300 140 L 300 120" stroke="#fbbf24" strokeWidth="1" markerEnd="url(#arrowhead)" />
          </g>

          {/* MoE Cluster Subgraph (Side) */}
          <g transform="translate(620, 360)">
            {/* Simple representation for MoE */}
            <motion.rect
              x="100"
              y="0"
              width="140"
              height="200"
              rx="10"
              fill="#1e293b"
              stroke="#94a3b8"
              strokeDasharray="2 2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            />
            <text x="170" y="30" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">
              L5-L6: MoE Swarm
            </text>

            <g transform="translate(170, 70)">
              <rect x="-50" y="-15" width="100" height="30" rx="5" fill="#0f172a" stroke="#94a3b8" />
              <text x="0" y="5" textAnchor="middle" fill="#94a3b8" fontSize="10">
                L5 Router
              </text>
            </g>

            <g transform="translate(170, 130)">
              <rect x="-50" y="-15" width="100" height="30" rx="5" fill="#0f172a" stroke="#94a3b8" />
              <text x="0" y="5" textAnchor="middle" fill="#94a3b8" fontSize="10">
                L6 Inference
              </text>
            </g>

            {/* Links MoE */}
            <path d="M 170 85 L 170 115" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#arrowhead)" />
          </g>

          {/* Cross-module links */}
          <motion.path
            d="M 420 400 L 720 400 L 720 415"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1"
            strokeDasharray="2 2"
            markerEnd="url(#arrowhead)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          />
        </svg>
      </div>
    </div>
  )
}
