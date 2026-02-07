'use client'

import { useEffect, useRef } from 'react'

interface ViewCounterProps {
  slug: string
}

export default function ViewCounter({ slug }: ViewCounterProps) {
  const hasIncremented = useRef(false)

  useEffect(() => {
    // Skip in test mode to prevent database connection exhaustion
    if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') return
    
    // Only increment once per page load
    if (hasIncremented.current) return
    hasIncremented.current = true

    const incrementView = async () => {
      try {
        // Add delay to stagger requests
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000))
        await fetch(`/api/stories/${slug}/view`, {
          method: 'POST',
        })
      } catch (error) {
        // Silently fail - view count is not critical
      }
    }

    incrementView()
  }, [slug])

  // This component doesn't render anything
  return null
}
