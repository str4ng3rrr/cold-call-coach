import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <div key={location.pathname} className="page-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {children}
    </div>
  )
}
