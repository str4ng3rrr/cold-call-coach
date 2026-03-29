import { useState } from 'react'
import { Plus, GitCompare, FlaskConical } from 'lucide-react'
import VersionCard from './VersionCard'
import type { TestScript } from '../../types/scriptTesting'

interface VersionCardListProps {
  scripts: TestScript[]
  onOpen: (id: string) => void
  onCreateNew: () => void
  onToggleArchive: (id: string) => void
  onCompare: (idA: string, idB: string) => void
}

export default function VersionCardList({ scripts, onOpen, onCreateNew, onToggleArchive, onCompare }: VersionCardListProps) {
  const [showArchived, setShowArchived] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const selectionMode = selected.length > 0

  const visible = scripts.filter(s => showArchived || !s.archived)
  const archivedCount = scripts.filter(s => s.archived).length

  function toggleSelect(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [prev[1], id] // Keep last 2
      return [...prev, id]
    })
  }

  function handleCompare() {
    if (selected.length === 2) {
      onCompare(selected[0], selected[1])
      setSelected([])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'auto', padding: '20px' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Script Testing
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            A/B test your cold call scripts by tracking call outcomes
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selectionMode && (
            <>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {selected.length}/2 selected
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleCompare}
                disabled={selected.length < 2}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <GitCompare size={14} />
                Compare
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>
                Cancel
              </button>
            </>
          )}
          {!selectionMode && (
            <button
              className="btn btn-primary"
              onClick={onCreateNew}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              New Version
            </button>
          )}
        </div>
      </div>

      {/* Archived toggle */}
      {archivedCount > 0 && (
        <div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowArchived(v => !v)}
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archivedCount})
          </button>
        </div>
      )}

      {/* Compare hint */}
      {!selectionMode && visible.length >= 2 && (
        <div style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          padding: '8px 12px',
          backgroundColor: 'var(--accent-light)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--accent-border)',
        }}>
          Tip: Click on cards to select them, then compare two versions side-by-side.
        </div>
      )}

      {/* Empty state */}
      {visible.length === 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          gap: '16px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FlaskConical size={28} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              No test versions yet
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '320px' }}>
              Create a version to snapshot your current script and start tracking call outcomes.
            </div>
          </div>
          <button className="btn btn-primary" onClick={onCreateNew} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            Create First Version
          </button>
        </div>
      )}

      {/* Card grid */}
      {visible.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px',
        }}>
          {visible.map(script => (
            <VersionCard
              key={script.id}
              script={script}
              selected={selected.includes(script.id)}
              onSelect={() => toggleSelect(script.id)}
              onOpen={() => onOpen(script.id)}
              onToggleArchive={() => onToggleArchive(script.id)}
              selectionMode={selectionMode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
