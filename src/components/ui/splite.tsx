'use client'
import { Suspense, lazy, Component, ReactNode } from 'react'

// Retry dynamic import once, then hard-reload to bust stale chunk cache
const Spline = lazy<any>(() =>
  import('@splinetool/react-spline').catch((err: unknown) => {
    console.warn('[Spline] dynamic import failed, retrying…', err)
    return import('@splinetool/react-spline').catch((err2) => {
      console.error('[Spline] retry failed, reloading to clear stale chunks', err2)
      if (typeof window !== 'undefined' && !sessionStorage.getItem('spline-reloaded')) {
        sessionStorage.setItem('spline-reloaded', '1')
        window.location.reload()
      }
      // Return a stub component so React doesn't crash
      return { default: () => null }
    })
  })
)

class SplineErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    console.error('[SplineErrorBoundary]', error)
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

interface SplineSceneProps {
  scene: string
  className?: string
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <SplineErrorBoundary>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <span className="loader"></span>
          </div>
        }
      >
        <Spline scene={scene} className={className} />
      </Suspense>
    </SplineErrorBoundary>
  )
}
