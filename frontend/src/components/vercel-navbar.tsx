"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"

export function Navbar() {
  const [activeTab, setActiveTab] = useState("Deployments")
  const [isScrolled, setIsScrolled] = useState(false)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(true)
  const tabsContainerRef = useRef<HTMLDivElement>(null)

  const tabs = [
    "Overview",
    "Deployments",
    "Analytics",
    "Speed Insights",
    "Logs",
    "Observability",
    "Firewall",
    "Storage",
    "Flags",
    "Settings",
  ]

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const updateScrollIndicators = () => {
    const container = tabsContainerRef.current
    if (container) {
      setShowLeftFade(container.scrollLeft > 0)
      setShowRightFade(container.scrollLeft < container.scrollWidth - container.clientWidth - 1)
    }
  }

  useEffect(() => {
    const container = tabsContainerRef.current
    if (container) {
      container.addEventListener("scroll", updateScrollIndicators)
      updateScrollIndicators()
      return () => container.removeEventListener("scroll", updateScrollIndicators)
    }
  }, [])

  return (
    <>
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <div className="relative flex items-center h-12 border-b border-border/40">
          {/* Vercel Logo */}
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80 shrink-0 z-10">
            <svg
              className="w-[18px] h-[16px]"
              viewBox="0 0 76 65"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
            </svg>
          </Link>

          <AnimatePresence>
            {!isScrolled && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="flex items-center gap-2 text-sm ml-4 overflow-hidden"
              >
                <span className="text-muted-foreground">/</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-foreground truncate max-w-[60px] sm:max-w-[100px] md:max-w-none">
                    skys&apos;s projects
                  </span>
                  <span className="text-muted-foreground text-xs px-1.5 py-0.5 rounded bg-muted shrink-0 hidden sm:inline">
                    Hobby
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:block" />
                </div>
                <span className="text-muted-foreground hidden sm:inline">/</span>
                <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                  <div className="w-4 h-4 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-foreground truncate max-w-[100px] md:max-w-none">stack-end.com-demo</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.nav
            className="absolute right-0 sm:right-auto sm:left-0"
            animate={{
              x: isScrolled ? 36 : 0,
              y: isScrolled ? 0 : 48,
            }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="relative">
              {/* Left fade indicator */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity duration-200 ${
                  showLeftFade ? "opacity-100" : "opacity-0"
                }`}
              />
              {/* Right fade indicator */}
              <div
                className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity duration-200 ${
                  showRightFade ? "opacity-100" : "opacity-0"
                }`}
              />
              <div
                ref={tabsContainerRef}
                className="overflow-x-auto scrollbar-hide max-w-[calc(100vw-120px)] sm:max-w-none"
              >
                <div className="flex">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`
                        relative px-2 sm:px-3 py-3 text-[13px] font-medium transition-colors whitespace-nowrap outline-none
                        ${activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"}
                      `}
                    >
                      {tab}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="tab-underline"
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.nav>
        </div>

        <motion.div
          animate={{ height: isScrolled ? 0 : 48 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        />
      </div>

      <div className="border-b border-border/40" />

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
    </header>
  
    </>
  )
}
