import { useState } from 'react'
import { ArrowLeft, Phone, PhoneCall, BarChart2, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import TallyFlow from './TallyFlow'
import FunnelAnalytics from './FunnelAnalytics'
import CallbackTracker from './CallbackTracker'
import type { TestScript, CallRecord } from '../../types/scriptTesting'
import { OUTCOME_LABELS } from '../../types/scriptTesting'

interface VersionDetailProps {
  script: TestScript
  onBack: () => void
  onAddCall: (call: Omit<CallRecord, 'id'>) => void
  onDeleteCall: (callId: string) => void
  onAddCallback: (originalCallId: string) => void
  onDeleteCallback: (callbackId: string) => void
  onToggleArchive: () => void
  onDelete: () => void
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
}: VersionDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tally')
  const [confirmDelete, setConfirmDelete] = useState(false)

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
              <TallyFlow onCallComplete={onAddCall} />
            )}

            {activeTab === 'analytics' && (
              <FunnelAnalytics script={script} />
            )}

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
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => onDeleteCall(call.id)}
                        title="Delete call"
                      >
                        <Trash2 size={11} color="var(--text-muted)" />
                      </button>
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
    </div>
  )
}
