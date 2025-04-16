'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface SplineSceneProps {
  scene: string
  className?: string
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const [loading, setLoading] = useState(true)
  const [SplineViewer, setSplineViewer] = useState<any>(null)

  useEffect(() => {
    // Dynamically import Spline to avoid SSR issues
    import('@splinetool/react-spline').then((module) => {
      setSplineViewer(() => module.default)
      // Add a small delay to allow the scene to initialize
      setTimeout(() => setLoading(false), 1000)
    }).catch(err => {
      console.error('Failed to load Spline:', err)
      setLoading(false)
    })
  }, [])

  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
        </div>
      )}
      
      {SplineViewer && (
        <SplineViewer
          scene={scene}
          onLoad={() => setTimeout(() => setLoading(false), 500)}
          className="w-full h-full"
        />
      )}
    </div>
  )
} 