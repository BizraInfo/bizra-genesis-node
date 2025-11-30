"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Home, BookOpen, Activity, Database } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { name: "Home", icon: Home, href: "/", section: "home" },
  { name: "The Story", icon: BookOpen, href: "#pitch-deck", section: "pitch-deck" },
  { name: "Live Demo", icon: Activity, href: "#demo", section: "demo" },
  { name: "Evidence", icon: Database, href: "#evidence", section: "evidence" },
] as const

export function NavDock() {
  const [isVisible, setIsVisible] = useState(false)
  const [activeSection, setActiveSection] = useState("home")

  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY
    setIsVisible(scrollPosition > 50)

    const sections = ["pitch-deck", "demo", "evidence"]
    const windowCenter = window.innerHeight / 2

    for (const section of sections) {
      const element = document.getElementById(section)
      if (element) {
        const rect = element.getBoundingClientRect()
        if (rect.top >= 0 && rect.top <= windowCenter) {
          setActiveSection(section)
          return
        }
      }
    }

    if (scrollPosition < 100) {
      setActiveSection("home")
    }
  }, [])

  useEffect(() => {
    let ticking = false
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", throttledScroll, { passive: true })
    return () => window.removeEventListener("scroll", throttledScroll)
  }, [handleScroll])

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    if (href === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  return (
    <nav
      className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1)",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none",
      )}
      aria-label="Main navigation"
    >
      <div className="glass-panel rounded-full px-8 py-4 flex items-center gap-10 border border-primary-gold/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl bg-deep-navy/60">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.section
          return (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 group transition-all duration-300 relative",
                isActive ? "text-primary-gold scale-110" : "text-gray-500 hover:text-soft-white hover:scale-105",
              )}
              onClick={(e) => handleNavClick(e, item.href)}
              aria-label={item.name}
              aria-current={isActive ? "page" : undefined}
            >
              <div
                className={cn(
                  "absolute -inset-4 bg-primary-gold/10 rounded-full blur-md transition-opacity duration-300",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50",
                )}
              />

              <item.icon className="w-5 h-5 relative z-10" strokeWidth={1.5} />

              <span
                className={cn(
                  "text-[9px] uppercase tracking-[0.2em] font-medium absolute -top-8 bg-deep-navy/90 px-3 py-1 rounded-sm border border-primary-gold/20 whitespace-nowrap transition-all duration-300 backdrop-blur-md",
                  isActive || "group-hover:opacity-100 opacity-0 translate-y-2 group-hover:translate-y-0",
                )}
              >
                {item.name}
              </span>

              {isActive && (
                <div className="absolute -bottom-2 w-1 h-1 bg-primary-gold rounded-full shadow-[0_0_10px_#C9A962]" />
              )}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
