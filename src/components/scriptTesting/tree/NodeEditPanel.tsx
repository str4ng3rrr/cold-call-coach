import { useState } from 'react'
import type { TreeNode, TreeEdge } from '../../../types/scriptTesting'
import { useCustomSemanticIds } from '../../../hooks/useCustomSemanticIds'

interface Props {
  node: TreeNode
  outgoingEdges: TreeEdge[]
  allNodes: TreeNode[]
  onUpdateNode: (updates: Partial<Omit<TreeNode, 'id'>>) => void
  onDeleteNode: () => void
  onUpdateEdge: (edgeId: string, updates: Partial<Omit<TreeEdge, 'id'>>) => void
  onDeleteEdge: (edgeId: string) => void
  onStartConnect: () => void
  onClose: () => void
}

const NODE_TYPES: TreeNode['type'][] = ['start', 'step', 'terminal', 'booked']

const BUILTIN_SEMANTIC_OPTIONS: { value: string; label: string }[] = [
  { value: 'opener', label: 'Opener' },
  { value: 'gatekeeper', label: 'Gatekeeper / Receptionist' },
  { value: 'owner', label: 'Owner / Decision Maker' },
  { value: 'explainer', label: 'Explainer / Pitch' },
  { value: 'close', label: 'Close / Appointment' },
  { value: 'not-in-office', label: 'Not in Office' },
  { value: 'take-a-message', label: 'Take a Message' },
]

const TYPE_LABELS: Record<TreeNode['type'], string> = {
  start: 'Start',
  step: 'Step',
  terminal: 'End',
  booked: 'Booked',
}

const TYPE_COLORS: Record<TreeNode['type'], string> = {
  start: 'var(--accent)',
  step: 'var(--text-muted)',
  terminal: 'var(--danger)',
  booked: 'var(--success)',
}

export default function NodeEditPanel({
  node,
  outgoingEdges,
  allNodes,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
  onStartConnect,
  onClose,
}: Props) {
  const nodeMap = Object.fromEntries(allNodes.map(n => [n.id, n]))
  const { customIds, addId } = useCustomSemanticIds()
  const [showCreateId, setShowCreateId] = useState(false)
  const [newIdLabel, setNewIdLabel] = useState('')

  return (
    <div style={{
      width: '300px',
      flexShrink: 0,
      height: '100%',
      overflowY: 'auto',
      borderLeft: '1px solid var(--border)',
      backgroundColor: 'var(--bg-card)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Panel header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Edit Node
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          style={{ padding: '4px 6px', fontSize: '14px' }}
          title="Close"
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Type selector */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Type
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {NODE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => onUpdateNode({ type: t })}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${node.type === t ? TYPE_COLORS[t] : 'var(--border)'}`,
                  backgroundColor: node.type === t ? TYPE_COLORS[t] : 'transparent',
                  color: node.type === t ? '#fff' : TYPE_COLORS[t],
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.1s',
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Semantic ID */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            ID
          </label>
          <select
            value={node.semanticId ?? ''}
            onChange={e => {
              const val = e.target.value
              if (val === '__create__') {
                setShowCreateId(true)
                return
              }
              onUpdateNode({ semanticId: val || undefined })
            }}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: node.semanticId ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <option value="">None</option>
            <optgroup label="Built-in">
              {BUILTIN_SEMANTIC_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </optgroup>
            {customIds.length > 0 && (
              <optgroup label="Custom">
                {customIds.map(cid => (
                  <option key={cid.key} value={cid.key}>{cid.label}</option>
                ))}
              </optgroup>
            )}
            <option value="__create__">+ Create new ID...</option>
          </select>
          {showCreateId && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                value={newIdLabel}
                onChange={e => setNewIdLabel(e.target.value)}
                placeholder="New ID label..."
                autoFocus
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newIdLabel.trim()) {
                    const key = addId(newIdLabel.trim())
                    onUpdateNode({ semanticId: key })
                    setNewIdLabel('')
                    setShowCreateId(false)
                  } else if (e.key === 'Escape') {
                    setNewIdLabel('')
                    setShowCreateId(false)
                  }
                }}
              />
              <button
                className="btn btn-primary btn-xs"
                onClick={() => {
                  if (!newIdLabel.trim()) return
                  const key = addId(newIdLabel.trim())
                  onUpdateNode({ semanticId: key })
                  setNewIdLabel('')
                  setShowCreateId(false)
                }}
              >
                Save
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setNewIdLabel('')
                  setShowCreateId(false)
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Label */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Label
          </label>
          <input
            type="text"
            value={node.label}
            onChange={e => onUpdateNode({ label: e.target.value })}
            placeholder="Short name, e.g. Opener"
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Content */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Script Content
          </label>
          <textarea
            value={node.content}
            onChange={e => onUpdateNode({ content: e.target.value })}
            placeholder="Full script text shown during recording…"
            rows={4}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Outgoing edges */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Outgoing Connections ({outgoingEdges.length})
          </div>
          {outgoingEdges.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
              No outgoing connections yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {outgoingEdges.map(edge => {
                const targetNode = nodeMap[edge.toNodeId]
                return (
                  <div
                    key={edge.id}
                    style={{
                      padding: '8px 10px',
                      backgroundColor: 'var(--sidebar-bg)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      → <strong style={{ color: 'var(--text-primary)' }}>{targetNode?.label ?? 'Unknown'}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={edge.responseLabel}
                        onChange={e => onUpdateEdge(edge.id, { responseLabel: e.target.value })}
                        placeholder="Response label…"
                        style={{
                          flex: 1,
                          padding: '5px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '12px',
                          outline: 'none',
                        }}
                        onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                      />
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => onDeleteEdge(edge.id)}
                        title="Delete connection"
                        style={{ color: 'var(--danger)', padding: '4px 6px', flexShrink: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onStartConnect}
            style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}
          >
            + Add connection
          </button>
        </div>

        {/* Delete node */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (confirm(`Delete node "${node.label}"? All its connections will also be removed.`)) {
                onDeleteNode()
              }
            }}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Delete Node
          </button>
        </div>
      </div>
    </div>
  )
}
