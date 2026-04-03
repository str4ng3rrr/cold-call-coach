import { useMemo } from 'react'
import { X } from 'lucide-react'
import type { TestScript } from '../../types/scriptTesting'
import { OUTCOME_LABELS } from '../../types/scriptTesting'

interface Props {
  script: TestScript
  dayLabel?: string | null
  onClose: () => void
}

// ─── helpers ────────────────────────────────────────────────────────────────

function pct(num: number, den: number): string {
  if (den === 0) return '—'
  return Math.round((num / den) * 100) + '%'
}

function fraction(num: number, den: number): string {
  if (den === 0) return '0 / 0'
  return `${num} / ${den}`
}

function computeDetailed(script: TestScript) {
  const calls = script.calls
  const total = calls.length

  const count = (outcomes: string[]) =>
    calls.filter(c => outcomes.includes(c.outcome)).length

  const noConnection    = count(['no_connection'])
  const connected       = total - noConnection

  // Gatekeeper branch
  const viaGK = count([
    'gk_opening_fail',
    'gk_not_in_office_left_message', 'gk_not_in_office_no_message',
    'gk_transferred_not_available_left_voicemail', 'gk_transferred_not_available_no_voicemail',
    'gk_owner_opening_fail', 'gk_explainer_fail', 'gk_close_fail', 'gk_appointment_booked',
  ])
  const gkOpeningFail   = count(['gk_opening_fail'])
  const notInOffice     = count(['gk_not_in_office_left_message', 'gk_not_in_office_no_message'])
  const nioLeftMsg      = count(['gk_not_in_office_left_message'])
  const nioNoMsg        = count(['gk_not_in_office_no_message'])
  const transferred     = count(['gk_transferred_not_available_left_voicemail', 'gk_transferred_not_available_no_voicemail'])
  const transLeftVM     = count(['gk_transferred_not_available_left_voicemail'])
  const transNoVM       = count(['gk_transferred_not_available_no_voicemail'])
  const gkPass          = count(['gk_owner_opening_fail', 'gk_explainer_fail', 'gk_close_fail', 'gk_appointment_booked'])
  const gkOwnerOpenFail = count(['gk_owner_opening_fail'])
  const gkExplainFail   = count(['gk_explainer_fail'])
  const gkCloseFail     = count(['gk_close_fail'])
  const gkBooked        = count(['gk_appointment_booked'])

  // Direct owner branch
  const directOwner     = count(['owner_opening_fail', 'explainer_fail', 'close_fail', 'appointment_booked'])
  const dirOpenFail     = count(['owner_opening_fail'])
  const dirExplainFail  = count(['explainer_fail'])
  const dirCloseFail    = count(['close_fail'])
  const dirBooked       = count(['appointment_booked'])

  // Aggregates
  const ownersReached   = gkPass + directOwner
  const ownerOpenFail   = gkOwnerOpenFail + dirOpenFail
  const allBooked       = gkBooked + dirBooked
  const messagesLeft    = nioLeftMsg + transLeftVM
  const callbacks       = script.callbacks.length

  return {
    total, noConnection, connected,
    viaGK, gkOpeningFail, notInOffice, nioLeftMsg, nioNoMsg,
    transferred, transLeftVM, transNoVM,
    gkPass, gkOwnerOpenFail, gkExplainFail, gkCloseFail, gkBooked,
    directOwner, dirOpenFail, dirExplainFail, dirCloseFail, dirBooked,
    ownersReached, ownerOpenFail, allBooked, messagesLeft, callbacks,
  }
}

// ─── sub-components ──────────────────────────────────────────────────────────

function RatioCard({ label, num, den, note }: { label: string; num: number; den: number; note?: string }) {
  const p = pct(num, den)
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface, var(--bg-elevated))',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 16px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1.1 }}>{p}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600, marginTop: '4px' }}>{label}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{fraction(num, den)}</div>
      {note && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', fontStyle: 'italic' }}>{note}</div>}
    </div>
  )
}

type NodeColor = 'booked' | 'fail' | 'message' | 'neutral' | 'branch'

function treeColor(color: NodeColor): string {
  switch (color) {
    case 'booked':  return 'var(--success, #4caf82)'
    case 'fail':    return 'var(--danger, #e05e5e)'
    case 'message': return 'var(--warning, #d4a24c)'
    case 'branch':  return 'var(--accent)'
    default:        return 'var(--border)'
  }
}

function TreeNode({
  label, count, parentCount, total, depth, color, isLast,
}: {
  label: string
  count: number
  parentCount: number
  total: number
  depth: number
  color: NodeColor
  isLast?: boolean
}) {
  const pctParent = pct(count, parentCount)
  const pctTotal  = pct(count, total)
  const dimmed    = count === 0

  return (
    <div style={{
      paddingLeft: depth * 20,
      opacity: dimmed ? 0.4 : 1,
      marginBottom: '4px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingLeft: depth > 0 ? 12 : 0,
        borderLeft: depth > 0 ? `2px solid ${treeColor(color)}` : undefined,
      }}>
        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: depth === 0 ? 700 : 500, flex: 1 }}>
          {label}
        </span>
        <span style={{
          fontSize: '13px',
          fontWeight: 700,
          color: treeColor(color),
          minWidth: '28px',
          textAlign: 'right',
        }}>
          {count}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '100px', textAlign: 'right' }}>
          {pctParent !== '—' ? `${pctParent} of parent` : ''}
          {pctParent !== '—' && pctTotal !== '—' ? ' · ' : ''}
          {pctTotal !== '—' ? `${pctTotal} overall` : ''}
        </span>
      </div>
      {isLast && <div style={{ height: '4px' }} />}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '11px',
      fontWeight: 700,
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: '14px',
      paddingBottom: '8px',
      borderBottom: '1px solid var(--border)',
    }}>
      {children}
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export default function DetailedAnalyticsModal({ script, dayLabel, onClose }: Props) {
  const d = useMemo(() => computeDetailed(script), [script])

  if (d.total === 0) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} onClick={onClose}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '14px',
        }} onClick={e => e.stopPropagation()}>
          No calls to analyze for this period.
          <br />
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ marginTop: '16px' }}>Close</button>
        </div>
      </div>
    )
  }

  // Outcomes table rows — all 14, sorted by count desc
  const outcomeRows = (Object.keys(OUTCOME_LABELS) as (keyof typeof OUTCOME_LABELS)[])
    .map(key => ({
      key,
      label: OUTCOME_LABELS[key],
      count: script.calls.filter(c => c.outcome === key).length,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.65)',
        overflowY: 'auto',
        padding: '24px 16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: '820px',
          margin: '0 auto',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Detailed Analytics
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {dayLabel
                ? <><span style={{ color: 'var(--accent)', fontWeight: 600 }}>{dayLabel}</span> · {d.total} call{d.total !== 1 ? 's' : ''}</>
                : <>{script.name} · {d.total} total call{d.total !== 1 ? 's' : ''}</>
              }
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Section 1: Key Ratios ── */}
        <div>
          <SectionTitle>Key Ratios</SectionTitle>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
            gap: '10px',
          }}>
            <RatioCard label="Connection Rate"      num={d.connected}     den={d.total}         note="connected / total" />
            <RatioCard label="No Connection"        num={d.noConnection}  den={d.total}         note="no_connection / total" />
            <RatioCard label="Via Gatekeeper"       num={d.viaGK}         den={d.connected}     note="of connected" />
            <RatioCard label="Direct to Owner"      num={d.directOwner}   den={d.connected}     note="of connected" />
            <RatioCard label="GK Opening Fail"      num={d.gkOpeningFail} den={d.connected}     note="of connected" />
            <RatioCard label="Not in Office"        num={d.notInOffice}   den={d.connected}     note="of connected" />
            <RatioCard label="GK Pass Rate"         num={d.gkPass}        den={d.viaGK}         note="of via-GK calls" />
            <RatioCard label="Talk to Owner"        num={d.ownersReached} den={d.connected}     note="of connected" />
            <RatioCard label="After-Opening Fail"   num={d.ownerOpenFail} den={d.ownersReached} note="of owners reached" />
            <RatioCard label="Booked / Connections" num={d.allBooked}     den={d.connected}     note="of connected" />
            <RatioCard label="Booked / Total"       num={d.allBooked}     den={d.total}         note="of all calls" />
            <RatioCard label="Callback Rate"        num={d.callbacks}     den={d.messagesLeft}  note="callbacks / messages" />
          </div>
        </div>

        {/* ── Section 2: Funnel Tree ── */}
        <div>
          <SectionTitle>Call Flow Breakdown</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>

            <TreeNode label="Total Calls"       count={d.total}        parentCount={d.total}    total={d.total} depth={0} color="branch" />
            <TreeNode label="No Connection"     count={d.noConnection} parentCount={d.total}    total={d.total} depth={1} color="fail" />

            <div style={{ height: '6px' }} />
            <TreeNode label="Connected"         count={d.connected}    parentCount={d.total}    total={d.total} depth={1} color="branch" />

            {/* Via GK */}
            <TreeNode label="Via Gatekeeper"    count={d.viaGK}        parentCount={d.connected} total={d.total} depth={2} color="neutral" />
            <TreeNode label="GK Opening Fail"   count={d.gkOpeningFail} parentCount={d.viaGK}   total={d.total} depth={3} color="fail" />

            <TreeNode label="Not in Office"     count={d.notInOffice}  parentCount={d.viaGK}    total={d.total} depth={3} color="message" />
            <TreeNode label="Left Message"      count={d.nioLeftMsg}   parentCount={d.notInOffice} total={d.total} depth={4} color="message" />
            <TreeNode label="No Message"        count={d.nioNoMsg}     parentCount={d.notInOffice} total={d.total} depth={4} color="fail" />

            <TreeNode label="Transferred (N/A)" count={d.transferred}  parentCount={d.viaGK}    total={d.total} depth={3} color="message" />
            <TreeNode label="Left Voicemail"    count={d.transLeftVM}  parentCount={d.transferred} total={d.total} depth={4} color="message" />
            <TreeNode label="No Voicemail"      count={d.transNoVM}    parentCount={d.transferred} total={d.total} depth={4} color="fail" />

            <TreeNode label="GK Pass → Owner"   count={d.gkPass}       parentCount={d.viaGK}    total={d.total} depth={3} color="branch" />
            <TreeNode label="Opening Fail"      count={d.gkOwnerOpenFail} parentCount={d.gkPass} total={d.total} depth={4} color="fail" />
            <TreeNode label="Explainer Fail"    count={d.gkExplainFail}  parentCount={d.gkPass}  total={d.total} depth={4} color="fail" />
            <TreeNode label="Close Fail"        count={d.gkCloseFail}    parentCount={d.gkPass}  total={d.total} depth={4} color="fail" />
            <TreeNode label="Booked"            count={d.gkBooked}       parentCount={d.gkPass}  total={d.total} depth={4} color="booked" isLast />

            {/* Direct owner */}
            <TreeNode label="Direct to Owner"   count={d.directOwner}  parentCount={d.connected} total={d.total} depth={2} color="neutral" />
            <TreeNode label="Opening Fail"      count={d.dirOpenFail}  parentCount={d.directOwner} total={d.total} depth={3} color="fail" />
            <TreeNode label="Explainer Fail"    count={d.dirExplainFail} parentCount={d.directOwner} total={d.total} depth={3} color="fail" />
            <TreeNode label="Close Fail"        count={d.dirCloseFail} parentCount={d.directOwner} total={d.total} depth={3} color="fail" />
            <TreeNode label="Booked"            count={d.dirBooked}    parentCount={d.directOwner} total={d.total} depth={3} color="booked" isLast />
          </div>
        </div>

        {/* ── Section 3: All Outcomes Table ── */}
        <div>
          <SectionTitle>All Outcomes</SectionTitle>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Outcome', 'Count', '% of Total', '% of Connected'].map(h => (
                    <th key={h} style={{
                      padding: '6px 10px',
                      textAlign: h === 'Outcome' ? 'left' : 'right',
                      fontWeight: 700,
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outcomeRows.map(row => (
                  <tr
                    key={row.key}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      opacity: row.count === 0 ? 0.35 : 1,
                    }}
                  >
                    <td style={{ padding: '7px 10px', color: 'var(--text-primary)', fontWeight: 500 }}>{row.label}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{row.count}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>{pct(row.count, d.total)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>
                      {row.key === 'no_connection' ? '—' : pct(row.count, d.connected)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
