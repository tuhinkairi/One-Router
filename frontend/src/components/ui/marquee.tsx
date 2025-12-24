import * as React from "react"
import { cn } from "@/lib/utils"

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  pauseOnHover?: boolean
  direction?: "left" | "right"
  speed?: number
}

export function Marquee({
  children,
  pauseOnHover = false,
  direction = "left",
  speed = 30,
  className,
  ...props
}: MarqueeProps) {
  return (
    <div 
      className={cn(
        "w-full overflow-hidden sm:mt-24 mt-10 z-10",
        className
      )} 
      {...props}
    >
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        @keyframes marquee-reverse {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        
        .marquee-animate {
          animation: marquee ${speed}s linear infinite;
        }
        
        .marquee-animate.reverse {
          animation: marquee-reverse ${speed}s linear infinite;
        }
        
        .marquee-animate.pause:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="relative flex max-w-[90vw] overflow-hidden py-5">
        <div 
          className={cn(
            "flex w-max",
            `marquee-animate ${direction === "right" ? "reverse" : ""} ${pauseOnHover ? "pause" : ""}`
          )}
        >
          {children}
          {children}
        </div>
      </div>
    </div>
  )
}
