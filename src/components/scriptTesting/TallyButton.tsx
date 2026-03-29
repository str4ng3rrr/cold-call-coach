import type { TallyOption } from '../../types/scriptTesting'

interface TallyButtonProps {
  option: TallyOption
  onClick: () => void
  keyHint?: string
  disabled?: boolean
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--accent)',
    color: '#fff',
    border: 'none',
  },
  secondary: {
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  },
  success: {
    backgroundColor: '#e8f5f0',
    color: '#1a4d3e',
    border: '1px solid #a3c4b8',
  },
  danger: {
    backgroundColor: 'var(--danger-light)',
    color: 'var(--danger)',
    border: '1px solid var(--danger-border)',
  },
  warning: {
    backgroundColor: '#fef3e2',
    color: '#92600a',
    border: '1px solid #e8c97a',
  },
}

export default function TallyButton({ option, onClick, keyHint, disabled }: TallyButtonProps) {
  const variant = option.variant ?? 'secondary'
  const base = variantStyles[variant] ?? variantStyles.secondary

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...base,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '16px 20px',
        borderRadius: 'var(--radius-md)',
        fontSize: '16px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        fontFamily: 'var(--font-body)',
        textAlign: 'left',
        minHeight: '56px',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          const el = e.currentTarget as HTMLButtonElement
          el.style.transform = 'translateY(-1px)'
          el.style.boxShadow = 'var(--shadow-md)'
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}
    >
      <span>{option.label}</span>
      {keyHint && (
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          opacity: 0.5,
          backgroundColor: 'rgba(0,0,0,0.08)',
          borderRadius: '4px',
          padding: '2px 6px',
          marginLeft: '8px',
          flexShrink: 0,
        }}>
          {keyHint}
        </span>
      )}
    </button>
  )
}
