import { useMemo } from 'react'
import FunnelBar from './FunnelBar'
import MiniBarChart from './MiniBarChart'
import type { TestScript } from '../../types/scriptTesting'
import { BOOKED_OUTCOMES, REACHED_OWNER_OUTCOMES, CALLBACK_ELIGIBLE_OUTCOMES } from '../../types/scriptTesting'
import { loadJSON, StorageKeys } from '../../lib/storage'

interface FunnelAnalyticsProps {
  script: TestScript
  accentColor?: string
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getHourInTz(isoTimestamp: string, tz: string): number {
  return parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(new Date(isoTimestamp)), 10) % 24
}

export function computeAnalytics(script: TestScript) {
  const calls = script.calls
  const total = calls.length
  const connected = calls.filter(c => c.outcome !== 'no_connection').length
  const reachedOwner = calls.filter(c => REACHED_OWNER_OUTCOMES.includes(c.outcome)).length
  const booked = calls.filter(c => BOOKED_OUTCOMES.includes(c.outcome)).length
  const messagesLeft = calls.filter(c => CALLBACK_ELIGIBLE_OUTCOMES.includes(c.outcome)).length
  const callbacks = script.callbacks.length
  const callbackRate = messagesLeft > 0 ? Math.round((callbacks / messagesLeft) * 100) : 0

  // Time of day buckets (by hour)
  const byHour = Array(24).fill(0)
  const byDow = Array(7).fill(0)
  const bookedByHour = Array(24).fill(0)

  for (const call of calls) {
    const tz = call.callingTimezone || loadJSON<string>(StorageKeys.CALLING_TZ, 'America/New_York')
    const h = getHourInTz(call.timestamp, tz)
    const dow = new Date(call.timestamp).getDay()
    byHour[h]++
    byDow[dow]++
    if (BOOKED_OUTCOMES.includes(call.outcome)) bookedByHour[h]++
  }

  // Group hours into blocks for readability
  const hourBlocks = [
    { label: '6-8a', value: byHour[6] + byHour[7] + byHour[8] },
    { label: '9-11a', value: byHour[9] + byHour[10] + byHour[11] },
    { label: '12-2p', value: byHour[12] + byHour[13] + byHour[14] },
    { label: '3-5p', value: byHour[15] + byHour[16] + byHour[17] },
    { label: '6-8p', value: byHour[18] + byHour[19] + byHour[20] },
    { label: 'Other', value: byHour.slice(0,6).reduce((a,b)=>a+b,0) + byHour.slice(21).reduce((a,b)=>a+b,0) },
  ]

  const dowData = DOW_LABELS.map((label, i) => ({ label, value: byDow[i] }))

  return {
    total, connected, reachedOwner, booked,
    messagesLeft, callbacks, callbackRate,
    hourBlocks, dowData,
    connectionRate: total > 0 ? Math.round((connected / total) * 100) : 0,
    ownerRate: connected > 0 ? Math.round((reachedOwner / connected) * 100) : 0,
    bookingRate: total > 0 ? Math.round((booked / total) * 100) : 0,
    bookingFromOwnerRate: reachedOwner > 0 ? Math.round((booked / reachedOwner) * 100) : 0,
  }
}

export default function FunnelAnalytics({ script, accentColor = 'var(--accent)' }: FunnelAnalyticsProps) {
  const stats = useMemo(() => computeAnalytics(script), [script])

  if (stats.total === 0) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '14px',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius-md)',
      }}>
        No calls logged yet. Use the tally to start tracking results.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '12px',
      }}>
        {[
          { label: 'Total Calls', value: stats.total, sub: null },
          { label: 'Connected', value: stats.connected, sub: `${stats.connectionRate}%` },
          { label: 'Reached Owner', value: stats.reachedOwner, sub: `${stats.ownerRate}% of connected` },
          { label: 'Booked', value: stats.booked, sub: `${stats.bookingRate}% overall` },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: accentColor, lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Funnel bars */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Conversion Funnel
        </div>
        <FunnelBar label="Connected" count={stats.connected} total={stats.total} color={accentColor} />
        <FunnelBar label="Reached Owner" count={stats.reachedOwner} total={stats.total} color={accentColor} />
        <FunnelBar label="Booked" count={stats.booked} total={stats.total} color={accentColor} />
        {stats.messagesLeft > 0 && (
          <FunnelBar label="Messages Left (eligible callback)" count={stats.messagesLeft} total={stats.total} color="var(--terracotta)" />
        )}
      </div>

      {/* Time charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
      }}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
        }}>
          <MiniBarChart title="Calls by Time of Day" data={stats.hourBlocks} color={accentColor} height={64} />
        </div>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
        }}>
          <MiniBarChart title="Calls by Day of Week" data={stats.dowData} color={accentColor} height={64} />
        </div>
      </div>
    </div>
  )
}
