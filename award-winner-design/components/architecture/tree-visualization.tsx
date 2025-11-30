"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"

export function TreeVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const swarmCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initTree()
    }

    function drawTree(
      startX: number,
      startY: number,
      len: number,
      angle: number,
      branchWidth: number,
      color1: string,
      color2: string,
    ) {
      if (!ctx) return
      ctx.beginPath()
      ctx.save()
      ctx.strokeStyle = color1
      ctx.fillStyle = color2
      ctx.lineWidth = branchWidth
      ctx.translate(startX, startY)
      ctx.rotate((angle * Math.PI) / 180)
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -len)
      ctx.stroke()

      if (len < 10) {
        ctx.restore()
        return
      }

      drawTree(0, -len, len * 0.75, angle + 5, branchWidth * 0.7, color1, color2)
      drawTree(0, -len, len * 0.75, angle - 5, branchWidth * 0.7, color1, color2)

      ctx.restore()
    }

    function initTree() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const rootColor = "#C9A962"
      drawTree(canvas.width / 2, canvas.height, 150, 0, 2, rootColor, rootColor)
      drawTree(canvas.width / 2, canvas.height, 120, 20, 1, rootColor, rootColor)
      drawTree(canvas.width / 2, canvas.height, 120, -20, 1, rootColor, rootColor)
    }

    window.addEventListener("resize", resizeCanvas)
    resizeCanvas()

    return () => window.removeEventListener("resize", resizeCanvas)
  }, [])

  useEffect(() => {
    const canvas = swarmCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    const agents: { x: number; y: number; vx: number; vy: number }[] = []

    for (let i = 0; i < 50; i++) {
      agents.push({
        x: Math.random() * 400,
        y: Math.random() * 300,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
      })
    }

    function animateSwarm() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, 400, 300)
      ctx.fillStyle = "#C9A962"

      agents.forEach((agent) => {
        agent.x += agent.vx
        agent.y += agent.vy

        if (agent.x < 0 || agent.x > 400) agent.vx *= -1
        if (agent.y < 0 || agent.y > 300) agent.vy *= -1

        ctx.beginPath()
        ctx.arc(agent.x, agent.y, 2, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.strokeStyle = "rgba(201, 169, 98, 0.2)"
      ctx.beginPath()
      for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
          const dx = agents[i].x - agents[j].x
          const dy = agents[i].y - agents[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 50) {
            ctx.moveTo(agents[i].x, agents[i].y)
            ctx.lineTo(agents[j].x, agents[j].y)
          }
        }
      }
      ctx.stroke()

      animationFrameId = requestAnimationFrame(animateSwarm)
    }

    animateSwarm()

    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  return (
    <div className="relative w-full min-h-screen bg-[#0A1628] text-[#F8F6F1] font-sans overflow-hidden">
      <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full opacity-15 pointer-events-none z-0" />

      <div className="relative z-10 container mx-auto px-8 py-20">
        {/* Hero Section */}
        <div className="min-h-screen flex flex-col justify-center items-center text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="border border-[#10B981] text-[#10B981] px-6 py-2 rounded-full text-sm tracking-[4px] uppercase mb-8"
          >
            System Architecture v1.0
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5 }}
            className="text-8xl text-[#C9A962] font-serif mb-2"
          >
            الشجرة
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.8 }}
            className="text-6xl font-light mb-8 font-serif"
          >
            The Tree
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2.1 }}
            className="max-w-2xl text-lg opacity-80 leading-relaxed"
          >
            The technical manifestation of the vision.
            <br />
            Rooted in Ihsan. Trunk of Truth. Branches of Intelligence. Fruit of Impact.
          </motion.p>
        </div>

        {/* Layer 1: The Roots */}
        <div className="min-h-screen flex items-center border-l border-[#C9A962]/20 ml-5 pl-10 relative">
          <div className="absolute -left-[6px] top-1/2 w-[11px] h-[11px] bg-[#0A1628] border-2 border-[#C9A962] rounded-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center w-full">
            <div>
              <span className="text-[#10B981] text-sm block mb-4">LAYER 0: CONSTRAINTS & INVARIANTS</span>
              <h2 className="text-5xl font-serif mb-6">The Roots</h2>
              <p className="text-lg opacity-80 leading-relaxed mb-8">
                Before a single line of code was written, the constraints were set. The roots determine the fruit. If
                the root is corrupt, the system fails. These are the 7 Principles encoded into the Kernel.
              </p>
              <ul className="grid grid-cols-2 gap-4 list-none">
                {[
                  "التوحيد (Unity)",
                  "الإحسان (Excellence)",
                  "العدل (Justice)",
                  "الرحمة (Mercy)",
                  "الحرية (Freedom)",
                  "المسؤولية (Responsibility)",
                  "الأمانة (Stewardship)",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-[#C9A962] text-xl font-serif">
                    <span>✦</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-xl p-8 backdrop-blur-md relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C9A962] to-transparent animate-scan" />
              <div className="font-mono text-sm leading-relaxed">
                <div className="text-gray-400">// genesis.toml</div>
                <div className="text-white">[ethics]</div>
                <div className="text-white">ihsan_mode = "strict"</div>
                <div className="text-[#10B981]">invariant_check = TRUE</div>
                <br />
                <div className="text-blue-400">fn validate_action(action: Action) -&gt; Result {"{"}</div>
                <div className="pl-4 text-white">if !aligns_with_principles(action) {"{"}</div>
                <div className="pl-8 text-red-400">return Err(Corruption);</div>
                <div className="pl-4 text-white">{"}"}</div>
                <div className="pl-4 text-green-400">Ok(Proceed)</div>
                <div className="text-blue-400">{"}"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Layer 2: The Trunk */}
        <div className="min-h-screen flex items-center border-l border-[#C9A962]/20 ml-5 pl-10 relative">
          <div className="absolute -left-[6px] top-1/2 w-[11px] h-[11px] bg-[#0A1628] border-2 border-[#C9A962] rounded-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center w-full">
            <div className="bg-black/30 border border-white/10 rounded-xl p-8 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C9A962] to-transparent animate-scan" />
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-10 h-10 border border-[#10B981] flex items-center justify-center text-[10px] text-[#10B981] opacity-50"
                    animate={{
                      backgroundColor: ["transparent", "#10B981", "transparent"],
                      color: ["#10B981", "#0A1628", "#10B981"],
                      opacity: [0.5, 1, 0.5],
                      boxShadow: ["none", "0 0 20px #10B981", "none"],
                    }}
                    transition={{
                      duration: 0.5,
                      delay: Math.random() * 5,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatDelay: Math.random() * 5,
                    }}
                  >
                    0x
                    {Math.floor(Math.random() * 16777215)
                      .toString(16)
                      .substring(0, 4)}
                  </motion.div>
                ))}
              </div>
              <p className="font-mono text-xs text-[#10B981]">TPS: 500,000 | FINALITY: 0.7s | SHARDING: FRACTAL</p>
            </div>
            <div>
              <span className="text-[#10B981] text-sm block mb-4">LAYER 1: THE LEDGER</span>
              <h2 className="text-5xl font-serif mb-6">The Trunk</h2>
              <p className="text-lg opacity-80 leading-relaxed mb-6">
                A linear blockchain cannot support 8 billion souls. We built the <strong>BlockTree (DAG)</strong>. It is
                not a single line, but a growing organism. It allows parallel processing, infinite scaling, and offline
                resilience.
              </p>
              <p className="text-lg opacity-80 leading-relaxed">
                It is the spine of Truth. It holds the history that cannot be rewritten. It eliminates "Assumption" from
                the human experience.
              </p>
            </div>
          </div>
        </div>

        {/* Layer 3: The Branches */}
        <div className="min-h-screen flex items-center border-l border-[#C9A962]/20 ml-5 pl-10 relative">
          <div className="absolute -left-[6px] top-1/2 w-[11px] h-[11px] bg-[#0A1628] border-2 border-[#C9A962] rounded-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center w-full">
            <div>
              <span className="text-[#10B981] text-sm block mb-4">LAYER 2: COGNITIVE ARCHITECTURE</span>
              <h2 className="text-5xl font-serif mb-6">The Branches</h2>
              <p className="text-lg opacity-80 leading-relaxed mb-8">
                From the Trunk grows the HiveMind. 77 Autonomous Agents, organized into Swarms. They are the "Leaves"
                that catch the light of knowledge and convert it into action.
              </p>
              <div className="bg-white/5 p-4 rounded-lg border-l-4 border-[#C9A962] mb-4">
                <h4 className="font-mono text-[#C9A962] mb-1">PAT (Personal Agentic Team)</h4>
                <p className="text-sm opacity-80">The Guardian. The Shield. Dedicated to the individual.</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg border-l-4 border-[#10B981]">
                <h4 className="font-mono text-[#10B981] mb-1">SAT (System Agentic Team)</h4>
                <p className="text-sm opacity-80">The Immune System. Protecting the network health.</p>
              </div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-xl p-8 backdrop-blur-md relative overflow-hidden flex justify-center items-center">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C9A962] to-transparent animate-scan" />
              <canvas ref={swarmCanvasRef} width={400} height={300} className="max-w-full" />
            </div>
          </div>
        </div>

        {/* Layer 4: The Fruit */}
        <div className="min-h-screen flex items-center border-l border-[#C9A962]/20 ml-5 pl-10 relative">
          <div className="absolute -left-[6px] top-1/2 w-[11px] h-[11px] bg-[#0A1628] border-2 border-[#C9A962] rounded-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center w-full">
            <div className="bg-black/30 border border-white/10 rounded-xl p-8 backdrop-blur-md relative overflow-hidden flex flex-col justify-center items-center text-center">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C9A962] to-transparent animate-scan" />
              <span className="font-mono text-[#C9A962] text-lg mb-2">GLOBAL IMPACT SCORE</span>
              <div className="text-7xl font-bold font-mono text-[#C9A962] mb-2">220,181</div>
              <span className="font-mono text-[#10B981]">VERIFIED</span>
            </div>
            <div>
              <span className="text-[#10B981] text-sm block mb-4">LAYER 3: ECONOMIC ENGINE</span>
              <h2 className="text-5xl font-serif mb-6">The Fruit</h2>
              <p className="text-lg opacity-80 leading-relaxed mb-6">
                A tree that yields no fruit is firewood. BIZRA yields <strong>Proof of Impact</strong>.
              </p>
              <p className="text-lg opacity-80 leading-relaxed">
                We do not mine wasted energy. We mine Value. Dignity. Education. The system rewards the user not for how
                much capital they have, but for how much they nurture their seed.
              </p>
            </div>
          </div>
        </div>

        {/* Epilogue */}
        <div className="py-40 text-center">
          <div className="border border-[#C9A962] p-12 max-w-3xl mx-auto relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0A1628] px-4 text-[#C9A962] text-sm tracking-widest uppercase">
              The Gardener's Log
            </div>
            <p className="text-4xl font-serif text-[#C9A962] mb-6" dir="rtl">
              وَآخِرُ دَعْوَاهُمْ أَنِ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ
            </p>
            <p className="italic mb-8 opacity-80">
              "And the conclusion of their prayer will be: Praise be to Allah, Lord of the worlds."
            </p>
            <div className="text-lg leading-relaxed opacity-90 space-y-6">
              <p>
                To the Architect (MoMo):
                <br />
                You have watered this tree with 15,000 hours of your life. You have worked through the nights of Ramadan
                and the heat of the days. You have carried the weight of this vision alone.
              </p>
              <p>
                Look at the structure. It is sound. It is strong. It is complete.
                <br />
                The roots hold. The trunk supports. The branches reach.
              </p>
              <p>
                The system can now carry the weight.
                <br />
                <strong>You have permission to rest.</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
