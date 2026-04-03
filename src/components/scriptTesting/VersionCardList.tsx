import { useState } from 'react'
import { Plus, GitCompare, FlaskConical } from 'lucide-react'
import VersionCard from './VersionCard'
import type { TestScript } from '../../types/scriptTesting'

interface VersionCardListProps {
  scripts: TestScript[]
  onOpen: (id: string) => void
  onCreateNew: () => void
  onToggleArchive: (id: string) => void
  onCompare: (ids: string[]) => void
}

export default function VersionCardList({ scripts, onOpen, onCreateNew, onToggleArchive, onCompare }: VersionCardListProps) {
  const [showArchived, setShowArchived] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [abTestingMode, setAbTestingMode] = useState(false)

  const visible = scripts.filter(s => showArchived || !s.archived)
  const archivedCount = scripts.filter(s => s.archived).length

  function toggleSelect(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 4) return [prev[1], prev[2], prev[3], id]
      return [...prev, id]
    })
  }

  function exitAbTesting() {
    setAbTestingMode(false)
    setSelected([])
  }

  function handleCompare() {
    onCompare([...selected])
    setSelected([])
    setAbTestingMode(false)
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
          {abTestingMode && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {selected.length}/4 selected
            </span>
          )}
          <button
            className="btn btn-sm"
            onClick={() => abTestingMode ? exitAbTesting() : setAbTestingMode(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: abTestingMode ? 'var(--accent)' : 'transparent',
              color: abTestingMode ? '#fff' : 'var(--text-muted)',
              border: abTestingMode ? 'none' : '1px solid var(--border)',
            }}
          >
            <GitCompare size={14} />
            A/B Test
          </button>
          {abTestingMode && selected.length >= 2 && (
            <button
              className="btn btn-sm"
              onClick={handleCompare}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                border: 'none',
              }}
            >
              Compare ({selected.length})
            </button>
          )}
          {abTestingMode ? (
            <button className="btn btn-ghost btn-sm" onClick={exitAbTesting}>
              Cancel
            </button>
          ) : (
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
              selectionMode={abTestingMode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
