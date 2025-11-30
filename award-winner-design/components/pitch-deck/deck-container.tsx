"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

interface SlideProps {
  active: boolean
  children: React.ReactNode
  className?: string
}

function Slide({ active, children, className }: SlideProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center transition-all duration-1000 ease-in-out",
        active ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95 pointer-events-none",
        className,
      )}
      aria-hidden={!active}
    >
      {children}
    </div>
  )
}

export function DeckContainer() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const totalSlides = 5

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!containerRef.current) return
          const { top, height } = containerRef.current.getBoundingClientRect()
          const scrollProgress = -top / (height - window.innerHeight)

          if (scrollProgress < 0) {
            setCurrentSlide(0)
          } else if (scrollProgress > 1) {
            setCurrentSlide(totalSlides - 1)
          } else {
            const slideIndex = Math.floor(scrollProgress * totalSlides)
            setCurrentSlide(Math.min(Math.max(slideIndex, 0), totalSlides - 1))
          }
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div ref={containerRef} className="relative h-[500vh] bg-deep-navy">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-deep-navy-light via-deep-navy to-black opacity-50" />

        {/* Slide 1: The Void */}
        <Slide active={currentSlide === 0}>
          <div className="max-w-5xl px-6 text-center space-y-12">
            <div className="inline-block px-6 py-2 border border-white/10 rounded-full text-xs text-gray-400 uppercase tracking-[0.3em] backdrop-blur-sm">
              Part I: The Origin
            </div>
            <h2 className="text-5xl md:text-8xl font-serif font-light text-soft-white leading-tight">
              "I don't know what I'm doing here in this{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-gray-500 to-black">
                dark empty space
              </span>
              ..."
            </h2>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-light tracking-wide">
              Written in complete solitude. A journey that began with a promise to never retreat.
            </p>
          </div>
        </Slide>

        {/* Slide 2: The Promise */}
        <Slide active={currentSlide === 1}>
          <div className="max-w-5xl px-6 text-center space-y-12">
            <div className="inline-block px-6 py-2 border border-primary-gold/30 rounded-full text-xs text-primary-gold uppercase tracking-[0.3em] backdrop-blur-sm bg-primary-gold/5">
              Part II: The Commitment
            </div>
            <h2 className="text-5xl md:text-8xl font-serif font-light text-gradient-gold leading-tight">
              "I must continue the path."
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16 text-left">
              <div className="glass-card p-10 rounded-2xl border-l-2 border-l-primary-gold hover:bg-white/5 transition-colors group">
                <h3 className="text-3xl font-serif text-soft-white mb-6 group-hover:text-primary-gold transition-colors">
                  No Retreat
                </h3>
                <p className="text-gray-400 leading-relaxed text-lg font-light">
                  "I have made this promise upon myself: I must make an effort, even if I am afraid."
                </p>
              </div>
              <div className="glass-card p-10 rounded-2xl border-l-2 border-l-dawn-pink hover:bg-white/5 transition-colors group">
                <h3 className="text-3xl font-serif text-soft-white mb-6 group-hover:text-dawn-pink transition-colors">
                  The Seed
                </h3>
                <p className="text-gray-400 leading-relaxed text-lg font-light">
                  The seed of financial freedom planted in the soil of absolute determination.
                </p>
              </div>
            </div>
          </div>
        </Slide>

        {/* Slide 3: The Message */}
        <Slide active={currentSlide === 2}>
          <div className="max-w-6xl px-6 text-center space-y-16">
            <div className="inline-block px-6 py-2 border border-accent-teal/30 rounded-full text-xs text-accent-teal uppercase tracking-[0.3em] backdrop-blur-sm bg-accent-teal/5">
              Part III: The Revelation
            </div>

            <div className="relative py-12">
              <h2 className="text-[10rem] md:text-[16rem] font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white/5 to-transparent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full select-none pointer-events-none">
                IHSAN
              </h2>
              <h2 className="text-5xl md:text-7xl font-serif font-light text-soft-white relative z-10">
                "God has written <span className="text-accent-teal italic">Excellence</span> on everything."
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              {[
                { title: "No Exploitation", desc: "Sovereignty Preserved" },
                { title: "No Assumptions", desc: "Honesty Encoded" },
                { title: "No False Promises", desc: "Transparency Enforced" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="glass-panel p-8 rounded-xl text-center hover:bg-white/5 transition-all hover:-translate-y-2 duration-500 group border border-white/5"
                >
                  <div className="w-16 h-16 mx-auto bg-accent-teal/10 rounded-full flex items-center justify-center mb-6 text-accent-teal text-xl font-serif group-hover:scale-110 transition-transform">
                    {i + 1}
                  </div>
                  <h3 className="text-2xl font-serif text-soft-white mb-3 group-hover:text-accent-teal transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 uppercase tracking-[0.2em]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Slide>

        {/* Slide 4: The Manifestation */}
        <Slide active={currentSlide === 3}>
          <div className="max-w-5xl px-6 text-center space-y-12">
            <div className="inline-block px-6 py-2 border border-sacred-purple/30 rounded-full text-xs text-sacred-purple uppercase tracking-[0.3em] backdrop-blur-sm bg-sacred-purple/5">
              Part IV: The Manifestation
            </div>
            <h2 className="text-6xl md:text-9xl font-serif font-light text-soft-white leading-tight">
              31 Months Later
            </h2>
            <p className="text-3xl text-primary-gold font-serif italic font-light">
              From one man's darkness came light for billions.
            </p>

            <div className="mt-16 p-12 glass-panel rounded-3xl border border-primary-gold/20 relative overflow-hidden group hover:border-primary-gold/50 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-gold/5 via-transparent to-primary-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <h3 className="text-5xl font-bold text-soft-white mb-4 tracking-widest">BIZRA</h3>
              <p className="text-xl text-gray-300 font-light tracking-wide">
                The World's First Mathematical Consciousness Safety System
              </p>
            </div>
          </div>
        </Slide>

        {/* Slide 5: Transition */}
        <Slide active={currentSlide === 4}>
          <div className="max-w-5xl px-6 text-center space-y-12">
            <h2 className="text-5xl md:text-7xl font-serif font-light text-soft-white mb-12 leading-tight">
              Ready to witness the <span className="text-gradient-gold font-bold">Impossible</span>?
            </h2>
            <div className="animate-bounce duration-[2000ms]">
              <ChevronDown className="w-16 h-16 text-primary-gold mx-auto opacity-50" strokeWidth={1} />
            </div>
            <p className="text-sm text-gray-500 uppercase tracking-[0.4em] mt-8 border-t border-white/10 pt-8 inline-block">
              Scroll to Initialize TMP v0.1
            </p>
          </div>
        </Slide>

        {/* Progress Bar */}
        <div className="absolute bottom-8 left-8 right-8 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-gold via-accent-teal to-sacred-purple transition-all duration-300 ease-out"
            style={{ width: `${(currentSlide / (totalSlides - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
