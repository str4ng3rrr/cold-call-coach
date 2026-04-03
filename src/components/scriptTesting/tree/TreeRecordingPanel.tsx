import { useEffect, useRef } from 'react'
import { useTreeRecording } from '../../../hooks/useTreeRecording'
import type { ScriptTreeData, TreeCallRecord } from '../../../types/scriptTesting'
import RecordTreeView from './RecordTreeView'

interface Props {
  tree: ScriptTreeData
  onCallComplete: (call: Omit<TreeCallRecord, 'id'>) => void
}

export default function TreeRecordingPanel({ tree, onCallComplete }: Props) {
  const {
    state,
    currentNode,
    availableEdges,
    start,
    followEdge,
    back,
    setNotes,
    saveNotes,
    skipNotes,
    reset,
    forceExit,
    logNoConnection,
    isDone,
    completedCall,
  } = useTreeRecording(tree)

  const notesRef = useRef<HTMLTextAreaElement>(null)
  const doneHandled = useRef(false)

  // Trigger onCallComplete after done
  useEffect(() => {
    if (isDone && completedCall && !doneHandled.current) {
      doneHandled.current = true
      onCallComplete(completedCall)
      const timer = setTimeout(() => {
        reset()
        doneHandled.current = false
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isDone, completedCall, onCallComplete, reset])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isTextarea = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT'

      if (state.mode === 'idle' || isDone) {
        if (e.key === 'n' && !isTextarea) {
          e.preventDefault()
          start()
        }
        return
      }

      if (state.mode === 'notes') {
        if ((e.altKey && e.key === 'Enter') || (e.key === 'Enter' && e.altKey)) {
          e.preventDefault()
          saveNotes()
        }
        return
      }

      if (state.mode === 'recording') {
        if (e.key === 'Escape') {
          e.preventDefault()
          forceExit()
          return
        }
        if (e.key === 'Backspace' && !isTextarea) {
          e.preventDefault()
          back()
          return
        }
        if (e.key === 'f' || e.key === 'F') {
          if (!isTextarea && currentNode?.type === 'start') {
            e.preventDefault()
            logNoConnection()
            return
          }
        }
        const num = parseInt(e.key, 10)
        if (!isNaN(num) && num >= 1 && num <= 9) {
          const idx = num - 1
          if (availableEdges[idx]) {
            e.preventDefault()
            followEdge(availableEdges[idx].id)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.mode, availableEdges, followEdge, back, start, saveNotes, forceExit, logNoConnection, currentNode, isDone])

  // Build breadcrumb
  const nodeMap = Object.fromEntries(tree.nodes.map(n => [n.id, n]))
  const breadcrumb = state.pathNodeIds.map(id => nodeMap[id]?.label ?? id)

  const isBooked = currentNode?.type === 'booked'

  const availableEdgeIds = availableEdges.map(e => e.id)

  // Split-pane layout: tree view on left, controls on right
  const showTreeView = state.mode === 'recording' || state.mode === 'notes' || isDone

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Visual tree view — shown during recording, notes, and done states */}
      {showTreeView && (
        <div style={{
          flex: 3,
          minWidth: 0,
          borderRight: '1px solid var(--border)',
          position: 'relative',
        }}>
          <RecordTreeView
            tree={tree}
            currentNodeId={state.currentNodeId}
            pathNodeIds={state.pathNodeIds}
            availableEdgeIds={availableEdgeIds}
            onFollowEdge={followEdge}
          />
        </div>
      )}

      {/* Control panel */}
      <div style={{
        flex: showTreeView ? 2 : undefined,
        width: showTreeView ? undefined : '100%',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        gap: '16px',
        overflow: 'auto',
      }}>
        {/* Breadcrumb */}
        {state.pathNodeIds.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            alignItems: 'center',
            fontSize: '12px',
            color: 'var(--text-muted)',
            padding: '8px 12px',
            backgroundColor: 'var(--sidebar-bg)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}>
            {breadcrumb.map((label, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {i > 0 && <span style={{ color: 'var(--border)', fontSize: '14px' }}>›</span>}
                <span style={{
                  color: i === breadcrumb.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
                }}>
                  {label}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Idle state */}
        {state.mode === 'idle' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Ready to record a call through the pathway tree.
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.7 }}>
              Press <kbd style={{ padding: '1px 5px', border: '1px solid var(--border)', borderRadius: '3px', fontFamily: 'monospace' }}>N</kbd> or click below
            </div>
            <button className="btn btn-primary" onClick={start}>
              Start Call
            </button>
          </div>
        )}

        {/* Recording state */}
        {state.mode === 'recording' && currentNode && (
          <>
            {/* Node content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                marginBottom: '8px',
              }}>
                {currentNode.label}
              </div>
              <div style={{
                fontSize: '14px',
                lineHeight: 1.7,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'var(--font-body)',
              }}>
                {currentNode.content || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No script content for this step.</span>}
              </div>
            </div>

            {/* No connection button — only on start nodes */}
            {currentNode.type === 'start' && (
              <div style={{ flexShrink: 0 }}>
                <button
                  onClick={logNoConnection}
                  title="No connection — phone not answered (F)"
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--sidebar-bg)',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span>No connection</span>
                  <kbd style={{ padding: '1px 5px', border: '1px solid var(--border)', borderRadius: '3px', fontFamily: 'monospace', fontSize: '11px' }}>F</kbd>
                </button>
              </div>
            )}

            {/* Edge choices */}
            <div style={{ flexShrink: 0 }}>
              {availableEdges.length === 0 ? (
                <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', padding: '12px' }}>
                  No outgoing paths. This node has no connections yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {availableEdges.map((edge, idx) => {
                    const targetNode = nodeMap[edge.toNodeId]
                    const isTerminal = targetNode?.type === 'terminal' || targetNode?.type === 'booked'
                    return (
                      <button
                        key={edge.id}
                        className="btn btn-secondary"
                        onClick={() => followEdge(edge.id)}
                        style={{
                          justifyContent: 'flex-start',
                          textAlign: 'left',
                          gap: '10px',
                          padding: '10px 14px',
                          borderColor: isTerminal
                            ? (targetNode?.type === 'booked' ? 'var(--success)' : 'var(--danger)')
                            : 'var(--border)',
                        }}
                      >
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--sidebar-bg)',
                          border: '1px solid var(--border)',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0,
                          color: 'var(--text-muted)',
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: '13px' }}>{edge.responseLabel}</span>
                        {targetNode && (
                          <span style={{
                            fontSize: '11px',
                            color: targetNode.type === 'booked' ? 'var(--success)' : targetNode.type === 'terminal' ? 'var(--danger)' : 'var(--text-muted)',
                            opacity: 0.8,
                          }}>
                            → {targetNode.label}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {state.history.length > 0 ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={back}
                    style={{ fontSize: '12px', color: 'var(--text-muted)' }}
                  >
                    ← Back
                  </button>
                ) : (
                  <span />
                )}
                <button
                  className="btn btn-sm"
                  onClick={forceExit}
                  title="End call now (Esc)"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--danger)',
                    backgroundColor: 'var(--danger-light)',
                    border: '1px solid var(--danger-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 12px',
                    cursor: 'pointer',
                  }}
                >
                  End Call
                </button>
              </div>
            </div>
          </>
        )}

        {/* Notes state */}
        {state.mode === 'notes' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${isBooked ? 'var(--success)' : 'var(--danger)'}`,
              backgroundColor: isBooked ? 'var(--success-light)' : 'var(--danger-light)',
              fontSize: '14px',
              fontWeight: 600,
              color: isBooked ? 'var(--success)' : 'var(--danger)',
              textAlign: 'center',
            }}>
              {isBooked ? 'Appointment Booked!' : `Call ended — ${currentNode?.label ?? 'Terminal'}`}
            </div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Notes (optional)
            </label>
            <textarea
              ref={notesRef}
              autoFocus
              value={state.notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What happened? What could be improved?"
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                resize: 'vertical',
                outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Press <kbd style={{ padding: '1px 5px', border: '1px solid var(--border)', borderRadius: '3px', fontFamily: 'monospace' }}>Alt+Enter</kbd> to save
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={saveNotes}>
                Save Note
              </button>
              <button className="btn btn-ghost" onClick={skipNotes}>
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Done state */}
        {isDone && completedCall && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <div style={{
              padding: '20px 32px',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${completedCall.wasBooked ? 'var(--success)' : 'var(--border)'}`,
              backgroundColor: completedCall.wasBooked ? 'var(--success-light)' : 'var(--bg-card)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: completedCall.wasBooked ? 'var(--success)' : 'var(--text-primary)',
                marginBottom: '6px',
              }}>
                {completedCall.wasBooked ? 'Booked! Call logged.' : 'Call logged.'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {completedCall.pathNodeIds.length} steps traversed
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Starting next call in a moment… or press <kbd style={{ padding: '1px 5px', border: '1px solid var(--border)', borderRadius: '3px', fontFamily: 'monospace' }}>N</kbd>
            </div>
            <button className="btn btn-primary" onClick={() => { reset(); doneHandled.current = false }}>
              Log Another
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
