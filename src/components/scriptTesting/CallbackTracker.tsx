import { Phone, PhoneCall, Trash2 } from 'lucide-react'
import type { TestScript } from '../../types/scriptTesting'
import { CALLBACK_ELIGIBLE_OUTCOMES, OUTCOME_LABELS } from '../../types/scriptTesting'

interface CallbackTrackerProps {
  script: TestScript
  onAddCallback: (originalCallId: string) => void
  onDeleteCallback: (callbackId: string) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function CallbackTracker({ script, onAddCallback, onDeleteCallback }: CallbackTrackerProps) {
  // Calls eligible for callback (left a message/voicemail)
  const eligibleCalls = script.calls.filter(c => CALLBACK_ELIGIBLE_OUTCOMES.includes(c.outcome))
  const callbacks = script.callbacks
  const callbackIds = new Set(callbacks.map(cb => cb.originalCallId))

  const callbackRate = eligibleCalls.length > 0
    ? Math.round((callbacks.length / eligibleCalls.length) * 100)
    : 0

  if (eligibleCalls.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '13px',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius-md)',
      }}>
        No messages or voicemails left yet. Callback tracking will appear here.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Callback ratio header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PhoneCall size={16} color="var(--terracotta)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Callback Rate
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--terracotta)' }}>
            {callbackRate}%
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
            ({callbacks.length} / {eligibleCalls.length})
          </span>
        </div>
      </div>

      {/* List of eligible calls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Messages &amp; Voicemails Left
        </div>
        {eligibleCalls.map(call => {
          const hasCallback = callbackIds.has(call.id)
          const callbackRecord = callbacks.find(cb => cb.originalCallId === call.id)

          return (
            <div
              key={call.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: hasCallback ? '#e8f5f0' : 'var(--bg-card)',
                border: `1px solid ${hasCallback ? '#a3c4b8' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {OUTCOME_LABELS[call.outcome]}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formatDate(call.timestamp)}
                </span>
                {hasCallback && callbackRecord && (
                  <span style={{ fontSize: '11px', color: '#1a4d3e', fontWeight: 500 }}>
                    Callback logged: {formatDate(callbackRecord.timestamp)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {!hasCallback ? (
                  <button
                    className="btn btn-sm"
                    onClick={() => onAddCallback(call.id)}
                    style={{
                      backgroundColor: 'var(--terracotta)',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Phone size={12} />
                    Log Callback
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#1a4d3e', fontWeight: 600 }}>Callback ✓</span>
                    {callbackRecord && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => onDeleteCallback(callbackRecord.id)}
                        title="Remove callback"
                      >
                        <Trash2 size={11} color="var(--text-muted)" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
