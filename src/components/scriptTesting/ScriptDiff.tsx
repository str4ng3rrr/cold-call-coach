// LCS-based line-by-line diff (no external deps)

interface DiffLine {
  type: 'same' | 'add' | 'remove'
  text: string
  lineA?: number
  lineB?: number
}

function lcs(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp
}

function computeDiff(a: string[], b: string[]): DiffLine[] {
  const dp = lcs(a, b)
  let i = a.length
  let j = b.length
  const ops: DiffLine[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ type: 'same', text: a[i - 1], lineA: i, lineB: j })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'add', text: b[j - 1], lineB: j })
      j--
    } else {
      ops.push({ type: 'remove', text: a[i - 1], lineA: i })
      i--
    }
  }

  return ops.reverse()
}

interface ScriptDiffProps {
  textA: string
  nameA: string
  textB: string
  nameB: string
}

export default function ScriptDiff({ textA, nameA, textB, nameB }: ScriptDiffProps) {
  const linesA = textA.split('\n')
  const linesB = textB.split('\n')
  const diff = computeDiff(linesA, linesB)

  const hasChanges = diff.some(d => d.type !== 'same')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          padding: '8px 16px',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--danger)',
          backgroundColor: '#fdf0ee',
          borderRight: '1px solid var(--border)',
        }}>
          {nameA}
        </div>
        <div style={{
          padding: '8px 16px',
          fontSize: '12px',
          fontWeight: 700,
          color: '#1a6b3e',
          backgroundColor: '#e8f5f0',
        }}>
          {nameB}
        </div>
      </div>

      {!hasChanges && (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
          backgroundColor: 'var(--bg-card)',
        }}>
          Scripts are identical
        </div>
      )}

      {hasChanges && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '13px', fontFamily: 'monospace' }}>
          {/* Left (A) column */}
          <div style={{ borderRight: '1px solid var(--border)', overflow: 'auto' }}>
            {diff.map((line, i) => {
              if (line.type === 'add') {
                // Line only in B — show empty on A side
                return (
                  <div key={i} style={{
                    padding: '1px 12px',
                    backgroundColor: '#f8f8f8',
                    color: 'transparent',
                    userSelect: 'none',
                    borderBottom: '1px solid #f0f0f0',
                    minHeight: '22px',
                  }}>
                    &nbsp;
                  </div>
                )
              }
              return (
                <div key={i} style={{
                  padding: '1px 12px',
                  backgroundColor: line.type === 'remove' ? '#fdf0ee' : 'var(--bg-card)',
                  color: line.type === 'remove' ? 'var(--danger)' : 'var(--text-primary)',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  minHeight: '22px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {line.type === 'remove' && (
                    <span style={{ color: 'var(--danger)', opacity: 0.6, fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>-</span>
                  )}
                  <span>{line.text || '\u00A0'}</span>
                </div>
              )
            })}
          </div>

          {/* Right (B) column */}
          <div style={{ overflow: 'auto' }}>
            {diff.map((line, i) => {
              if (line.type === 'remove') {
                // Line only in A — show empty on B side
                return (
                  <div key={i} style={{
                    padding: '1px 12px',
                    backgroundColor: '#f8f8f8',
                    color: 'transparent',
                    userSelect: 'none',
                    borderBottom: '1px solid #f0f0f0',
                    minHeight: '22px',
                  }}>
                    &nbsp;
                  </div>
                )
              }
              return (
                <div key={i} style={{
                  padding: '1px 12px',
                  backgroundColor: line.type === 'add' ? '#e8f5f0' : 'var(--bg-card)',
                  color: line.type === 'add' ? '#1a6b3e' : 'var(--text-primary)',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  minHeight: '22px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {line.type === 'add' && (
                    <span style={{ color: '#1a6b3e', opacity: 0.6, fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>+</span>
                  )}
                  <span>{line.text || '\u00A0'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
