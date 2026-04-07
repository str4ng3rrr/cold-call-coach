import { useState, useRef } from 'react'
import { ArrowLeft, Phone, PhoneCall, BarChart2, Archive, ArchiveRestore, Trash2, CalendarDays, Layers, Sheet, GitBranch } from 'lucide-react'
import TallyFlow from './TallyFlow'
import CalendarHeatmap from './CalendarHeatmap'
import DetailedAnalyticsModal from './DetailedAnalyticsModal'
import CallbackTracker from './CallbackTracker'
import ScriptTreeEditorOverlay from './tree/ScriptTreeEditorOverlay'
import TreeAnalyticsPanel from './tree/TreeAnalyticsPanel'
import type { TestScript, CallRecord, ScriptTreeData, TreeCallRecord } from '../../types/scriptTesting'
import { OUTCOME_LABELS } from '../../types/scriptTesting'
import { StorageKeys, loadString, saveString } from '../../lib/storage'

interface VersionDetailProps {
  script: TestScript
  onBack: () => void
  onAddCall: (call: Omit<CallRecord, 'id'>) => void
  onDeleteCall: (callId: string) => void
  onAddCallback: (originalCallId: string) => void
  onDeleteCallback: (callbackId: string) => void
  onToggleArchive: () => void
  onDelete: () => void
  onUpdateTree: (tree: ScriptTreeData) => void
  onAddTreeCall: (call: Omit<TreeCallRecord, 'id'>) => void
  onReplaceTreeCalls?: (calls: TreeCallRecord[]) => void
  onDeleteSemanticId?: (key: string) => void
}

type Tab = 'tally' | 'analytics' | 'callbacks' | 'history'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function VersionDetail({
  script,
  onBack,
  onAddCall,
  onDeleteCall,
  onAddCallback,
  onDeleteCallback,
  onToggleArchive,
  onDelete,
  onUpdateTree,
  onAddTreeCall,
  onReplaceTreeCalls,
  onDeleteSemanticId,
}: VersionDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tally')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingCallId, setDeletingCallId] = useState<string | null>(null)
  const [showTreeEditor, setShowTreeEditor] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(false)
  const [syncState, setSyncState] = useState<'idle' | 'needs-auth' | 'waiting-auth' | 'loading' | 'success' | 'error'>('idle')
  const [syncMsg, setSyncMsg] = useState('')
  const authPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingSyncDay = useRef<string | null>(null)

  const TZ_OPTIONS = [
    { label: 'ET', tz: 'America/New_York' },
    { label: 'CT', tz: 'America/Chicago' },
    { label: 'MT', tz: 'America/Denver' },
    { label: 'PT', tz: 'America/Los_Angeles' },
  ]
  const [callingTz, setCallingTz] = useState(() => loadString(StorageKeys.CALLING_TZ, 'America/New_York'))

  function startAuthPoll(dayToSync: string) {
    pendingSyncDay.current = dayToSync
    if (authPollRef.current) clearInterval(authPollRef.current)
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/status')
        if (!res.ok) return
        const { authenticated } = await res.json()
        if (authenticated) {
          clearInterval(poll)
          authPollRef.current = null
          const day = pendingSyncDay.current
          pendingSyncDay.current = null
          if (day) doSync(day)
        }
      } catch { /* ignore polling errors */ }
    }, 1000)
    authPollRef.current = poll
    // Stop polling after 5 min
    setTimeout(() => {
      clearInterval(poll)
      if (authPollRef.current === poll) {
        authPollRef.current = null
        setSyncState('idle')
      }
    }, 300_000)
  }

  async function doSync(day: string) {
    setSyncState('loading')
    setSyncMsg('')
    try {
      const dayCalls = script.calls.filter(c => c.timestamp.startsWith(day))
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calls: dayCalls, scriptName: script.name, date: day }),
      })
      let body: { added?: number; updated?: number; error?: string }
      try { body = await res.json() } catch { throw new Error('Invalid response from server') }
      if (!res.ok) throw new Error(body.error || 'Sync failed')
      setSyncState('success')
      const parts = []
      if (body.added) parts.push(`${body.added} row${body.added > 1 ? 's' : ''} added`)
      if (body.updated) parts.push(`${body.updated} row${body.updated > 1 ? 's' : ''} updated`)
      setSyncMsg(parts.length ? parts.join(', ') : 'Synced')
      setTimeout(() => setSyncState('idle'), 5000)
    } catch (err) {
      setSyncState('error')
      setSyncMsg(err instanceof Error ? err.message : 'Sync failed')
      setTimeout(() => setSyncState('idle'), 5000)
    }
  }

  async function handleSync() {
    if (!selectedDay) return
    setSyncState('loading')
    setSyncMsg('')
    try {
      let statusData: { authenticated: boolean }
      try {
        const statusRes = await fetch('/api/auth/status')
        if (!statusRes.ok) throw new Error('server_down')
        statusData = await statusRes.json()
      } catch {
        throw new Error('Sheets server not running — start it with: npm run dev:full')
      }
      if (!statusData.authenticated) {
        setSyncState('needs-auth')
        return
      }
      await doSync(selectedDay)
    } catch (err) {
      setSyncState('error')
      setSyncMsg(err instanceof Error ? err.message : 'Sync failed')
      setTimeout(() => setSyncState('idle'), 5000)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'tally', label: 'Tally', icon: <Phone size={14} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={14} /> },
    { id: 'callbacks', label: 'Callbacks', icon: <PhoneCall size={14} /> },
    { id: 'history', label: 'History', icon: null },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-card)',
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ padding: '6px' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {script.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {script.calls.length} calls logged
              {script.archived && <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>· Archived</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowTreeEditor(true)}
            title="Script Pathway Tree"
          >
            <GitBranch size={14} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onToggleArchive}
            title={script.archived ? 'Unarchive' : 'Archive'}
          >
            {script.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </button>
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--danger)' }}>Delete all data?</span>
              <button className="btn btn-danger btn-sm" onClick={onDelete}>Yes, delete</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(true)} title="Delete version">
              <Trash2 size={14} color="var(--danger)" />
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        minHeight: 0,
      }} className="version-detail-layout">
        {/* Left: script content */}
        <div style={{
          flex: '0 0 60%',
          overflow: 'auto',
          borderRight: '1px solid var(--border)',
          padding: '20px',
        }} className="version-script-col">
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '12px',
          }}>
            Script Snapshot
          </div>
          {script.scriptContent ? (
            <pre style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: 1.7,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {script.scriptContent}
            </pre>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No script content saved with this version.
            </div>
          )}
        </div>

        {/* Right: tally + tabs */}
        <div style={{
          flex: '0 0 40%',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }} className="version-tally-col">
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--bg-card)',
            padding: '0 16px',
            flexShrink: 0,
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '10px 12px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: '-1px',
                  transition: 'color 0.12s',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {activeTab === 'tally' && (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '12px',
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>Calling TZ:</span>
                  {TZ_OPTIONS.map(opt => (
                    <button
                      key={opt.tz}
                      onClick={() => {
                        setCallingTz(opt.tz)
                        saveString(StorageKeys.CALLING_TZ, opt.tz)
                      }}
                      style={{
                        fontSize: '11px',
                        fontWeight: callingTz === opt.tz ? 700 : 500,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${callingTz === opt.tz ? 'var(--accent)' : 'var(--border)'}`,
                        background: callingTz === opt.tz ? 'var(--accent)' : 'transparent',
                        color: callingTz === opt.tz ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        transition: 'all 0.1s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <TallyFlow
                  onCallComplete={onAddCall}
                  onUndoLastCall={() => {
                    if (script.calls.length > 0) {
                      onDeleteCall(script.calls[script.calls.length - 1].id)
                    }
                  }}
                  callingTimezone={callingTz}
                />
              </>
            )}

            {activeTab === 'analytics' && (() => {
              const dayFilteredScript = selectedDay
                ? {
                    ...script,
                    calls: script.calls.filter(c => c.timestamp.startsWith(selectedDay)),
                    callbacks: (() => {
                      const ids = new Set(script.calls.filter(c => c.timestamp.startsWith(selectedDay)).map(c => c.id))
                      return script.callbacks.filter(cb => ids.has(cb.originalCallId))
                    })(),
                  }
                : script
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    {/* Sync to Sheets */}
                    {syncState === 'needs-auth' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Sign in to sync:</span>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            if (!selectedDay) return
                            window.open('/api/auth/google', '_blank', 'width=500,height=600')
                            setSyncState('waiting-auth')
                            startAuthPoll(selectedDay)
                          }}
                          style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)' }}
                        >
                          Authenticate with Google
                        </button>
                        <button className="btn btn-ghost btn-xs" onClick={() => setSyncState('idle')} style={{ padding: '2px 4px' }}>✕</button>
                      </div>
                    ) : syncState === 'waiting-auth' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--accent)' }}>Waiting for sign-in…</span>
                        <button className="btn btn-ghost btn-xs" onClick={() => {
                          if (authPollRef.current) { clearInterval(authPollRef.current); authPollRef.current = null }
                          setSyncState('idle')
                        }} style={{ padding: '2px 4px' }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={handleSync}
                          disabled={!selectedDay || syncState === 'loading'}
                          title={!selectedDay ? 'Select a day on the calendar first' : 'Sync this day to Google Sheets'}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            fontSize: '12px',
                            color: syncState === 'success' ? 'var(--success, #4caf82)'
                              : syncState === 'error' ? 'var(--danger, #e05e5e)'
                              : selectedDay ? 'var(--text-muted)' : 'var(--text-muted)',
                            border: `1px solid ${syncState === 'success' ? 'var(--success, #4caf82)' : syncState === 'error' ? 'var(--danger, #e05e5e)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-sm)', padding: '4px 10px',
                            opacity: !selectedDay || syncState === 'loading' ? 0.5 : 1,
                            cursor: !selectedDay ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Sheet size={13} />
                          {syncState === 'loading' ? 'Syncing…' : 'Sync to Sheets'}
                        </button>
                        {syncMsg && (syncState === 'success' || syncState === 'error') && (
                          <span style={{
                            fontSize: '11px',
                            color: syncState === 'success' ? 'var(--success, #4caf82)' : 'var(--danger, #e05e5e)',
                          }}>
                            {syncMsg}
                          </span>
                        )}
                      </div>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowDetailedAnalytics(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 10px',
                      }}
                    >
                      <Layers size={13} />
                      View All
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setShowCalendar(v => {
                          if (v) setSelectedDay(null)
                          return !v
                        })
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        color: showCalendar ? 'var(--accent)' : 'var(--text-muted)',
                        border: `1px solid ${showCalendar ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 10px',
                      }}
                    >
                      <CalendarDays size={13} />
                      Calendar
                    </button>
                  </div>
                  {showDetailedAnalytics && (
                    <DetailedAnalyticsModal
                      script={dayFilteredScript}
                      dayLabel={selectedDay
                        ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                        : null
                      }
                      onClose={() => setShowDetailedAnalytics(false)}
                    />
                  )}
                  {showCalendar && (
                    <CalendarHeatmap
                      calls={script.calls}
                      selectedDate={selectedDay}
                      onDateSelect={setSelectedDay}
                    />
                  )}
                  {selectedDay && (
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                        {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span>· {dayFilteredScript.calls.length} call{dayFilteredScript.calls.length !== 1 ? 's' : ''}</span>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setSelectedDay(null)}
                        style={{ marginLeft: '2px', fontSize: '10px', padding: '1px 6px', color: 'var(--text-muted)' }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  {script.tree
                    ? <TreeAnalyticsPanel tree={script.tree} treeCalls={script.treeCalls ?? []} />
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px 20px', textAlign: 'center' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                          Build your pathway tree first to see analytics here.
                        </p>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setShowTreeEditor(true)}
                        >
                          Open Tree Editor
                        </button>
                      </div>
                    )
                  }
                </>
              )
            })()}

            {activeTab === 'callbacks' && (
              <CallbackTracker
                script={script}
                onAddCallback={onAddCallback}
                onDeleteCallback={onDeleteCallback}
              />
            )}

            {activeTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {script.calls.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                    No calls logged yet.
                  </div>
                ) : (
                  [...script.calls].reverse().map(call => (
                    <div key={call.id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      gap: '8px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {OUTCOME_LABELS[call.outcome]}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {formatDate(call.timestamp)}
                        </div>
                        {call.notes && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                            "{call.notes}"
                          </div>
                        )}
                      </div>
                      {deletingCallId === call.id ? (
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => { onDeleteCall(call.id); setDeletingCallId(null) }}
                          title="Confirm delete"
                          style={{ fontSize: '11px', fontWeight: 600 }}
                        >
                          Sure?
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => setDeletingCallId(call.id)}
                          title="Delete call"
                        >
                          <Trash2 size={11} color="var(--text-muted)" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .version-detail-layout {
            flex-direction: column !important;
          }
          .version-script-col {
            flex: 0 0 auto !important;
            max-height: 200px !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border) !important;
          }
          .version-tally-col {
            flex: 1 !important;
          }
        }
      `}</style>

      {showTreeEditor && (
        <ScriptTreeEditorOverlay
          script={script}
          onClose={() => setShowTreeEditor(false)}
          onUpdateTree={onUpdateTree}
          onAddTreeCall={onAddTreeCall}
          onReplaceTreeCalls={onReplaceTreeCalls}
          onDeleteSemanticId={onDeleteSemanticId}
        />
      )}
    </div>
  )
}
