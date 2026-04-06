'use client'

interface SplineSceneProps {
  scene: string
  className?: string
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <div className={`w-full h-full flex items-center justify-center ${className ?? ''}`}>
      <div className="relative w-48 h-48">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 animate-pulse" />
        <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-primary/20 to-transparent animate-spin" style={{ animationDuration: '8s' }} />
        <div className="absolute inset-8 rounded-full bg-gradient-to-bl from-primary/40 to-primary/10 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </div>
  )
}
