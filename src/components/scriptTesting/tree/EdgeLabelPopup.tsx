import { useEffect, useRef, useState } from 'react'

interface Props {
  position: { x: number; y: number }
  initialValue?: string
  onConfirm: (label: string) => void
  onCancel: () => void
}

export default function EdgeLabelPopup({ position, initialValue, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState(initialValue ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onConfirm(value.trim() || 'Response')
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 300,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: '220px',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
        Label this connection
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Response label…"
        style={{
          padding: '7px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        Enter to confirm · Esc to cancel
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onConfirm(value.trim() || 'Response')}
          style={{ flex: 1 }}
        >
          Confirm
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
