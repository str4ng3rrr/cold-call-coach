import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function KeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl+1-4 for quick navigation
      if (mod && e.key === '1') { e.preventDefault(); navigate('/lessons') }
      if (mod && e.key === '2') { e.preventDefault(); navigate('/playbook') }
      if (mod && e.key === '3') { e.preventDefault(); navigate('/script') }
      if (mod && e.key === '4') { e.preventDefault(); navigate('/coach') }
      if (mod && e.key === '5') { e.preventDefault(); navigate('/offer') }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return null
}
