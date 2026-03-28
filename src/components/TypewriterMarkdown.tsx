import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

interface Props {
  text: string
  speed?: number
  onComplete?: () => void
  className?: string
}

export default function TypewriterMarkdown({ text, speed = 10, onComplete, className }: Props) {
  const [displayLength, setDisplayLength] = useState(0)
  const [done, setDone] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const textRef = useRef(text)

  // If the text prop changes to something new, reset
  useEffect(() => {
    if (text !== textRef.current) {
      textRef.current = text
      setDisplayLength(0)
      setDone(false)
    }
  }, [text])

  useEffect(() => {
    if (done) return

    intervalRef.current = setInterval(() => {
      setDisplayLength(prev => {
        const next = prev + 1
        if (next >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setDone(true)
          onComplete?.()
          return text.length
        }
        // Speed through whitespace/punctuation for natural feel
        return next
      })
    }, speed)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [text, speed, done, onComplete])

  const displayed = text.slice(0, displayLength)

  return (
    <div className={className} style={{ position: 'relative' }}>
      <ReactMarkdown>{displayed}</ReactMarkdown>
      {!done && <span className="typewriter-cursor" />}
    </div>
  )
}
