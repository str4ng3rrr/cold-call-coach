import { useState } from 'react'
import { useCustomSemanticIds } from '../../../hooks/useCustomSemanticIds'

const BUILTIN_IDS = [
  { key: 'opener', label: 'Opener' },
  { key: 'gatekeeper', label: 'Gatekeeper / Receptionist' },
  { key: 'owner', label: 'Owner / Decision Maker' },
  { key: 'explainer', label: 'Explainer / Pitch' },
  { key: 'close', label: 'Close / Appointment' },
  { key: 'not-in-office', label: 'Not in Office' },
  { key: 'take-a-message', label: 'Take a Message' },
]

interface Props {
  onClose: () => void
  onDeleteId: (key: string) => void
}

type RowState =
  | { type: 'idle' }
  | { type: 'editing'; label: string }
  | { type: 'deleting' }

export default function SemanticIdManager({ onClose, onDeleteId }: Props) {
  const { customIds, addId, updateId, deleteId } = useCustomSemanticIds()
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})
  const [showAddInput, setShowAddInput] = useState(false)
  const [addLabel, setAddLabel] = useState('')

  function getRowState(key: string): RowState {
    return rowStates[key] ?? { type: 'idle' }
  }

  function setRowState(key: string, state: RowState) {
    setRowStates(prev => ({ ...prev, [key]: state }))
  }

  function handleAdd() {
    if (!addLabel.trim()) return
    addId(addLabel.trim())
    setAddLabel('')
    setShowAddInput(false)
  }

  function handleUpdateSave(key: string) {
    const state = getRowState(key)
    if (state.type !== 'editing' || !state.label.trim()) return
    updateId(key, state.label.trim())
    setRowState(key, { type: 'idle' })
  }

  function handleDeleteConfirm(key: string) {
    onDeleteId(key)
    deleteId(key)
    setRowState(key, { type: 'idle' })
  }

  const sectionLabel = (text: string) => (
    <div style={{
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-muted)',
      marginBottom: '8px',
      paddingBottom: '4px',
      borderBottom: '1px solid var(--border)',
    }}>
      {text}
    </div>
  )

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '5px 8px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    outline: 'none',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '480px',
          maxHeight: '70vh',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Semantic ID Manager
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ fontSize: '16px', padding: '4px 8px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Built-in IDs */}
          <div>
            {sectionLabel('Built-in IDs')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {BUILTIN_IDS.map(id => (
                <div
                  key={id.key}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--sidebar-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{id.label}</span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', opacity: 0.6 }}>{id.key}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom IDs */}
          <div>
            {sectionLabel('Custom IDs')}
            {!showAddInput ? (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddInput(true)}
                style={{ marginBottom: customIds.length > 0 ? '10px' : '0' }}
              >
                + Add new ID
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={addLabel}
                  onChange={e => setAddLabel(e.target.value)}
                  placeholder="Label for new ID..."
                  autoFocus
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd()
                    else if (e.key === 'Escape') { setAddLabel(''); setShowAddInput(false) }
                  }}
                />
                <button className="btn btn-primary btn-sm" onClick={handleAdd}>Save</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setAddLabel(''); setShowAddInput(false) }}>Cancel</button>
              </div>
            )}

            {customIds.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                No custom IDs yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {customIds.map(cid => {
                  const state = getRowState(cid.key)
                  return (
                    <div
                      key={cid.key}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {state.type === 'idle' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>{cid.label}</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => setRowState(cid.key, { type: 'editing', label: cid.label })}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => setRowState(cid.key, { type: 'deleting' })}
                              style={{ color: 'var(--danger)' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                      {state.type === 'editing' && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={state.label}
                            onChange={e => setRowState(cid.key, { type: 'editing', label: e.target.value })}
                            autoFocus
                            style={inputStyle}
                            onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
                            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleUpdateSave(cid.key)
                              else if (e.key === 'Escape') setRowState(cid.key, { type: 'idle' })
                            }}
                          />
                          <button className="btn btn-primary btn-xs" onClick={() => handleUpdateSave(cid.key)}>Save</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setRowState(cid.key, { type: 'idle' })}>Cancel</button>
                        </div>
                      )}
                      {state.type === 'deleting' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', color: 'var(--danger)', flex: 1 }}>
                            Delete "{cid.label}"? This will remove it from all nodes.
                          </span>
                          <button
                            className="btn btn-danger btn-xs"
                            onClick={() => handleDeleteConfirm(cid.key)}
                          >
                            Confirm
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => setRowState(cid.key, { type: 'idle' })}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
