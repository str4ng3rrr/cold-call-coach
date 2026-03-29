interface BarDatum {
  label: string
  value: number
}

interface MiniBarChartProps {
  data: BarDatum[]
  color?: string
  height?: number
  title?: string
}

export default function MiniBarChart({ data, color = 'var(--accent)', height = 60, title }: MiniBarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <div>
      {title && (
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: `${height}px` }}>
        {data.map((d) => {
          const barHeight = max > 0 ? Math.round((d.value / max) * height) : 0
          return (
            <div
              key={d.label}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%', justifyContent: 'flex-end' }}
              title={`${d.label}: ${d.value}`}
            >
              <div style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                fontWeight: 600,
                minHeight: '14px',
                lineHeight: '14px',
              }}>
                {d.value > 0 ? d.value : ''}
              </div>
              <div style={{
                width: '100%',
                height: `${barHeight}px`,
                backgroundColor: color,
                borderRadius: '3px 3px 0 0',
                minHeight: d.value > 0 ? '3px' : '0',
                transition: 'height 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                opacity: 0.85,
              }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        {data.map(d => (
          <div key={d.label} style={{ flex: 1, textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}
