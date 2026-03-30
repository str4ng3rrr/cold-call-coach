import { useEffect, useRef } from 'react'
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react'
import TallyButton from './TallyButton'
import FunnelTree from './FunnelTree'
import { useTallyFlow } from '../../hooks/useTallyFlow'
import { OUTCOME_LABELS } from '../../types/scriptTesting'
import type { CallRecord, FunnelOutcome } from '../../types/scriptTesting'

interface TallyFlowProps {
  onCallComplete: (call: Omit<CallRecord, 'id'>) => void
}

export default function TallyFlow({ onCallComplete }: TallyFlowProps) {
  const { state, stageInfo, start, pick, back, canGoBack, setNotes, saveNotes, skipNotes, reset, isDone, isIdle } = useTallyFlow()
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const prevDoneRef = useRef(false)

  // When we enter done stage, fire the callback
  useEffect(() => {
    if (isDone && !prevDoneRef.current && state.pendingOutcome) {
      const record: Omit<CallRecord, 'id'> = {
        timestamp: new Date().toISOString(),
        path: state.path,
        outcome: state.pendingOutcome as FunnelOutcome,
        notes: state.notes || undefined,
      }
      onCallComplete(record)
    }
    prevDoneRef.current = isDone
  }, [isDone, state, onCallComplete])

  // Focus notes textarea when entering notes_input stage
  useEffect(() => {
    if (state.stage === 'notes_input' && notesRef.current) {
      notesRef.current.focus()
    }
  }, [state.stage])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        // Inside notes textarea, only handle Alt+Enter
        if (state.stage === 'notes_input' && e.key === 'Enter' && e.altKey) {
          saveNotes()
        }
        return
      }

      // Back: Backspace or Escape
      if ((e.key === 'Backspace' || e.key === 'Escape') && canGoBack) {
        e.preventDefault()
        back()
        return
      }

      if (state.stage === 'idle' && e.key === 'n') {
        start()
        return
      }
      if (isDone && e.key === 'n') {
        reset()
        start()
        return
      }
      const options = stageInfo.options
      if (e.key === '1' && options[0]) pick(options[0].action)
      if (e.key === '2' && options[1]) pick(options[1].action)
      if (e.key === '3' && options[2]) pick(options[2].action)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [state.stage, stageInfo.options, isDone, canGoBack, pick, start, reset, back, saveNotes])

  const isBooked = isDone && (
    state.pendingOutcome === 'appointment_booked' ||
    state.pendingOutcome === 'gk_appointment_booked'
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Visual funnel tree */}
      <FunnelTree path={state.path} stage={state.stage} />

      {/* Breadcrumb trail */}
      {state.path.length > 0 && !isDone && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
          {state.path.map((step, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--sidebar-bg)',
                padding: '2px 8px',
                borderRadius: '100px',
                border: '1px solid var(--border)',
              }}>
                {formatPathStep(step)}
              </span>
              {i < state.path.length - 1 && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.4 }}>›</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Back button + stage title */}
      {!isDone && !isIdle && state.stage !== 'notes_input' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {canGoBack && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={back}
              title="Go back (Backspace)"
              style={{
                padding: '4px 6px',
                flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {stageInfo.title}
          </div>
        </div>
      )}

      {/* Done state */}
      {isDone && (
        <div style={{
          padding: '20px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: isBooked ? '#e8f5f0' : 'var(--sidebar-bg)',
          border: `1px solid ${isBooked ? '#a3c4b8' : 'var(--border)'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          textAlign: 'center',
        }}>
          {isBooked ? (
            <Sparkles size={28} color="var(--accent)" />
          ) : (
            <CheckCircle size={24} color="var(--text-muted)" />
          )}
          <div style={{
            fontSize: isBooked ? '17px' : '15px',
            fontWeight: 700,
            color: isBooked ? 'var(--accent)' : 'var(--text-primary)',
          }}>
            {isBooked ? 'Appointment Booked!' : 'Call Logged'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {state.pendingOutcome ? OUTCOME_LABELS[state.pendingOutcome as FunnelOutcome] : ''}
          </div>
          {state.notes && (
            <div style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              maxWidth: '100%',
              wordBreak: 'break-word',
            }}>
              "{state.notes}"
            </div>
          )}
        </div>
      )}

      {/* Idle state */}
      {isIdle && (
        <div style={{
          padding: '24px 20px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--sidebar-bg)',
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Ready to log a call result
          </div>
          <button className="btn btn-primary" onClick={start} style={{ width: '100%', padding: '14px' }}>
            New Call <span style={{ opacity: 0.5, fontSize: '12px', marginLeft: '6px' }}>(N)</span>
          </button>
        </div>
      )}

      {/* Notes input stage */}
      {state.stage === 'notes_input' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {stageInfo.title}
          </div>
          <textarea
            ref={notesRef}
            value={state.notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What went wrong? (optional)"
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={saveNotes} style={{ flex: 1 }}>
              Save Note <span style={{ opacity: 0.5, fontSize: '11px' }}>Alt+↵</span>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={skipNotes}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Regular option buttons */}
      {!isDone && state.stage !== 'notes_input' && state.stage !== 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stageInfo.options.map((option, i) => (
            <TallyButton
              key={option.action}
              option={option}
              onClick={() => pick(option.action)}
              keyHint={`${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Log another after done */}
      {isDone && (
        <button
          className="btn btn-secondary"
          onClick={() => { reset(); start() }}
          style={{ width: '100%' }}
        >
          Log Another Call <span style={{ opacity: 0.4, fontSize: '11px' }}>(N)</span>
        </button>
      )}
    </div>
  )
}

function formatPathStep(step: string): string {
  return step
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
