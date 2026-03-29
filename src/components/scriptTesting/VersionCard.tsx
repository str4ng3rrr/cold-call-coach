import { Archive, ArchiveRestore, CheckSquare, Square } from 'lucide-react'
import type { TestScript } from '../../types/scriptTesting'
import { BOOKED_OUTCOMES } from '../../types/scriptTesting'

interface VersionCardProps {
  script: TestScript
  selected: boolean
  onSelect: () => void
  onOpen: () => void
  onToggleArchive: () => void
  selectionMode: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function VersionCard({ script, selected, onSelect, onOpen, onToggleArchive, selectionMode }: VersionCardProps) {
  const total = script.calls.length
  const booked = script.calls.filter(c => BOOKED_OUTCOMES.includes(c.outcome)).length
  const bookRate = total > 0 ? Math.round((booked / total) * 100) : 0

  return (
    <div
      className="card-enter"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        opacity: script.archived ? 0.6 : 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
      onClick={selectionMode ? onSelect : onOpen}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-border)'
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
      }}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
          {selected
            ? <CheckSquare size={18} color="var(--accent)" />
            : <Square size={18} color="var(--text-muted)" />
          }
        </div>
      )}

      {/* Title + archive badge */}
      <div style={{ paddingRight: selectionMode ? '28px' : '0' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          {script.name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Created {formatDate(script.createdAt)}
        </div>
        {script.archived && (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            backgroundColor: 'var(--sidebar-bg)',
            padding: '1px 6px',
            borderRadius: '100px',
            border: '1px solid var(--border)',
            marginTop: '4px',
            display: 'inline-block',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Archived
          </span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>calls</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: booked > 0 ? 'var(--accent)' : 'var(--text-muted)', lineHeight: 1 }}>{booked}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>booked</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: bookRate >= 10 ? 'var(--accent)' : 'var(--text-muted)', lineHeight: 1 }}>{bookRate}%</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>book rate</div>
        </div>
      </div>

      {/* Script preview */}
      {script.scriptContent && (
        <div style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: 1.4,
        }}>
          {script.scriptContent}
        </div>
      )}

      {/* Actions (non-selection mode) */}
      {!selectionMode && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={e => { e.stopPropagation(); onOpen() }}
            style={{ flex: 1 }}
          >
            Open
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={e => { e.stopPropagation(); onToggleArchive() }}
            title={script.archived ? 'Unarchive' : 'Archive'}
          >
            {script.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </button>
        </div>
      )}
    </div>
  )
}
