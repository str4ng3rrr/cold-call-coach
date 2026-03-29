interface FunnelBarProps {
  label: string
  count: number
  total: number
  color?: string
  showPercentage?: boolean
}

export default function FunnelBar({ label, count, total, color = 'var(--accent)', showPercentage = true }: FunnelBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {count}
          {showPercentage && total > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>
              ({pct}%)
            </span>
          )}
        </span>
      </div>
      <div style={{
        height: '8px',
        backgroundColor: 'var(--sidebar-bg)',
        borderRadius: '100px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: color,
          borderRadius: '100px',
          transition: 'width 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          minWidth: count > 0 ? '4px' : '0',
        }} />
      </div>
    </div>
  )
}
