"use client"

import { useEffect, useRef, useCallback } from "react"
import { ArrowDown } from 'lucide-react'
import { BizraLogoAnimated } from "./bizra-logo-animated"

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
}

const PARTICLE_COUNT = 100
const CONNECTION_DISTANCE = 150

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number>()

  const handleSmoothScroll = useCallback((elementId: string) => {
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      }))
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      ctx.strokeStyle = "rgba(201, 169, 98, 0.05)"
      ctx.lineWidth = 0.5

      const particles = particlesRef.current

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        
        p.x += p.speedX
        p.y += p.speedY

        if (p.x < 0 || p.x > width) p.speedX *= -1
        if (p.y < 0 || p.y > height) p.speedY *= -1

        ctx.fillStyle = `rgba(201, 169, 98, ${p.opacity})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const distanceSquared = dx * dx + dy * dy

          if (distanceSquared < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        width = window.innerWidth
        height = window.innerHeight
        canvas.width = width
        canvas.height = height
      }, 150)
    }

    window.addEventListener("resize", handleResize, { passive: true })
    
    return () => {
      window.removeEventListener("resize", handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      clearTimeout(resizeTimeout)
    }
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-40" />
      
      <div className="z-10 text-center px-4 max-w-5xl mx-auto space-y-8">
        <div className="flex justify-center mb-8 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
          <BizraLogoAnimated />
        </div>

        <div className="inline-block animate-fade-in-up opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
          <span className="px-4 py-1.5 rounded-full border border-primary-gold/30 bg-primary-gold/10 text-primary-gold text-xs uppercase tracking-[0.2em] backdrop-blur-sm">
            Genesis Document
          </span>
        </div>

        <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-none animate-fade-in-up opacity-0" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
          <span className="block text-gradient-gold mb-2">BIZRA</span>
          <span className="block text-3xl md:text-5xl font-light text-soft-white/80 font-sans tracking-widest mt-4">GENESIS</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-400 leading-relaxed animate-fade-in-up opacity-0" style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}>
          From the darkness of solitude to the light of world-first AGI safety.
          <br />
          <span className="text-primary-gold/80">The first consciousness system with mathematical Ihsan bounds.</span>
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-8 animate-fade-in-up opacity-0" style={{ animationDelay: "0.8s", animationFillMode: "forwards" }}>
          <button 
            onClick={() => handleSmoothScroll('pitch-deck')}
            className="group relative px-8 py-4 bg-primary-gold text-deep-navy font-bold tracking-wider uppercase text-sm overflow-hidden rounded-sm transition-all hover:bg-soft-white"
            aria-label="Begin the journey through the pitch deck"
          >
            <span className="relative z-10">Begin The Journey</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
          
          <button 
            onClick={() => handleSmoothScroll('demo')}
            className="px-8 py-4 border border-primary-gold/30 text-primary-gold font-bold tracking-wider uppercase text-sm rounded-sm hover:bg-primary-gold/10 transition-colors"
            aria-label="View live demo of TMP v0.1"
          >
            View Live Demo
          </button>
        </div>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce duration-[2000ms]" aria-hidden="true">
        <ArrowDown className="w-6 h-6 text-primary-gold/50" />
      </div>
    </section>
  )
}
