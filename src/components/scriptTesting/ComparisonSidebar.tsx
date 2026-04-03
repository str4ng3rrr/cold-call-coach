import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import { computeAnalytics } from './FunnelAnalytics'
import { computeTreeAnalytics } from '../../lib/treeAnalytics'
import type { TestScript, TreeFunnelStats } from '../../types/scriptTesting'

interface ComparisonSidebarProps {
  scripts: TestScript[]
}

interface DeltaRowProps {
  label: string
  valueA: number
  valueB: number
  unit?: string
  higherIsBetter?: boolean
  labelA?: string
  labelB?: string
}

function DeltaRow({ label, valueA, valueB, unit = 'pp', higherIsBetter = true, labelA = 'V1', labelB = 'Vn' }: DeltaRowProps) {
  const delta = valueB - valueA
  const isPositive = delta > 0
  const isNeutral = delta === 0
  const isGood = higherIsBetter ? isPositive : !isPositive

  const color = isNeutral ? 'var(--text-muted)' : isGood ? '#1a6b3e' : 'var(--danger)'
  const Icon = isNeutral ? Minus : isGood ? TrendingUp : TrendingDown

  const deltaStr = isNeutral
    ? `0 ${unit}`
    : `${isPositive ? '+' : ''}${delta} ${unit}`

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Icon size={13} color={color} />
        <span style={{ fontSize: '15px', fontWeight: 700, color }}>{deltaStr}</span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
        {labelA}: {valueA}{unit === 'pp' ? '%' : ''} → {labelB}: {valueB}{unit === 'pp' ? '%' : ''}
      </div>
    </div>
  )
}

function useTreeFunnelStats(script: TestScript): TreeFunnelStats | null {
  if (script.tree && (script.treeCalls?.length ?? 0) > 0) {
    return computeTreeAnalytics(script.tree, script.treeCalls!).funnelStats
  }
  return null
}

function pct(n: number) {
  return Math.round(n * 100)
}

export default function ComparisonSidebar({ scripts }: ComparisonSidebarProps) {
  const isMulti = scripts.length > 2
  const labelA = isMulti ? 'V1' : 'A'
  const labelB = isMulti ? `V${scripts.length}` : 'B'

  const scriptA = scripts[0]
  const scriptB = scripts[scripts.length - 1]

  const treeFsA = useTreeFunnelStats(scriptA)
  const treeFsB = useTreeFunnelStats(scriptB)
  const useTree = treeFsA !== null || treeFsB !== null

  const allTallyStats = scripts.map(s => computeAnalytics(s))
  const tallyA = allTallyStats[0]
  const tallyB = allTallyStats[allTallyStats.length - 1]

  const anyOwner = [scriptA, scriptB].some(s =>
    s.tree?.nodes.some(n => n.semanticId === 'owner')
  )

  const treeTotalA = treeFsA?.totalCalls ?? 0
  const treeTotalB = treeFsB?.totalCalls ?? 0
  const noData = useTree
    ? treeTotalA === 0 && treeTotalB === 0
    : allTallyStats.every(s => s.total === 0)

  const lowSampleSize = useTree
    ? treeTotalA < 30 || treeTotalB < 30
    : allTallyStats.some(s => s.total < 30)

  return (
    <div style={{
      width: '200px',
      flexShrink: 0,
      borderRight: '1px solid var(--border)',
      backgroundColor: 'var(--bg-card)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isMulti ? `V1 → V${scripts.length}` : 'B vs A'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500 }}>
          Delta
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
        {noData ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>
            No call data yet in either version.
          </div>
        ) : useTree ? (
          <>
            <DeltaRow
              label="Connection Rate"
              valueA={pct(treeFsA?.connectionRate ?? 0)}
              valueB={pct(treeFsB?.connectionRate ?? 0)}
              labelA={labelA}
              labelB={labelB}
            />
            {anyOwner && (
              <DeltaRow
                label="Owner Rate"
                valueA={pct(treeFsA?.ownerRate ?? 0)}
                valueB={pct(treeFsB?.ownerRate ?? 0)}
                labelA={labelA}
                labelB={labelB}
              />
            )}
            <DeltaRow
              label="Booking Rate"
              valueA={pct(treeFsA?.bookingRate ?? 0)}
              valueB={pct(treeFsB?.bookingRate ?? 0)}
              labelA={labelA}
              labelB={labelB}
            />
            <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '8px 0 14px' }} />
            <DeltaRow
              label="Total Calls"
              valueA={treeFsA?.totalCalls ?? 0}
              valueB={treeFsB?.totalCalls ?? 0}
              unit=""
              labelA={labelA}
              labelB={labelB}
            />
          </>
        ) : (
          <>
            <DeltaRow label="Booking Rate" valueA={tallyA.bookingRate} valueB={tallyB.bookingRate} labelA={labelA} labelB={labelB} />
            <DeltaRow label="Connect Rate" valueA={tallyA.connectionRate} valueB={tallyB.connectionRate} labelA={labelA} labelB={labelB} />
            <DeltaRow label="Owner Rate" valueA={tallyA.ownerRate} valueB={tallyB.ownerRate} labelA={labelA} labelB={labelB} />
            <DeltaRow label="Book from Owner" valueA={tallyA.bookingFromOwnerRate} valueB={tallyB.bookingFromOwnerRate} labelA={labelA} labelB={labelB} />
            <DeltaRow label="Callback Rate" valueA={tallyA.callbackRate} valueB={tallyB.callbackRate} labelA={labelA} labelB={labelB} />
            <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '8px 0 14px' }} />
            <DeltaRow label="Total Calls" valueA={tallyA.total} valueB={tallyB.total} unit="" labelA={labelA} labelB={labelB} />
            <DeltaRow label="Booked" valueA={tallyA.booked} valueB={tallyB.booked} unit="" labelA={labelA} labelB={labelB} />
          </>
        )}

        {lowSampleSize && !noData && (
          <div style={{
            marginTop: '12px',
            padding: '8px 10px',
            backgroundColor: 'rgba(210, 130, 60, 0.1)',
            border: '1px solid rgba(210, 130, 60, 0.3)',
            borderRadius: '6px',
            display: 'flex',
            gap: '6px',
            alignItems: 'flex-start',
          }}>
            <AlertTriangle size={12} color="var(--terracotta)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ fontSize: '11px', color: 'var(--terracotta)', lineHeight: 1.4 }}>
              Results may not be significant with &lt;30 calls per version.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
