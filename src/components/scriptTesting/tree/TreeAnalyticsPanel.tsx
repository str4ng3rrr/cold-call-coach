import { useMemo } from 'react'
import type { ScriptTreeData, TreeCallRecord } from '../../../types/scriptTesting'
import { computeTreeAnalytics } from '../../../lib/treeAnalytics'

interface Props {
  tree: ScriptTreeData
  treeCalls: TreeCallRecord[]
}

function pct(n: number) {
  return (n * 100).toFixed(0) + '%'
}

export default function TreeAnalyticsPanel({ tree, treeCalls }: Props) {
  const analytics = useMemo(() => computeTreeAnalytics(tree, treeCalls), [tree, treeCalls])
  const nodeMap = useMemo(() => Object.fromEntries(tree.nodes.map(n => [n.id, n])), [tree.nodes])

  if (treeCalls.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 40px',
        gap: '12px',
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '32px', opacity: 0.3 }}>📊</div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          No calls recorded yet
        </div>
        <div style={{ fontSize: '13px', maxWidth: '300px' }}>
          Use Record mode to log calls through the pathway tree. Analytics will appear here.
        </div>
      </div>
    )
  }

  const fs = analytics.funnelStats
  const hasGk = tree.nodes.some(n => n.semanticId === 'gatekeeper')
  const hasOwner = tree.nodes.some(n => n.semanticId === 'owner')
  const hasExplainer = tree.nodes.some(n => n.semanticId === 'explainer')
  const hasClose = tree.nodes.some(n => n.semanticId === 'close')
  const hasNotInOffice = tree.nodes.some(n => n.semanticId === 'not-in-office')
  const hasTakeMessage = tree.nodes.some(n => n.semanticId === 'take-a-message')
  const anySemanticIds = tree.nodes.some(n => n.semanticId)

  function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
    return (
      <div style={{
        flex: '1 1 100px',
        padding: '14px 16px',
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '22px', fontWeight: 700, color: accent ? 'var(--accent)' : 'var(--text-primary)' }}>
          {value}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {label}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Funnel metrics */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Funnel
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Row 1: call counts */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <StatCard label="Total Calls" value={fs.totalCalls} />
            <StatCard label="No Connection" value={fs.noConnectionCalls} />
            <StatCard label="Connected" value={fs.connectedCalls} />
            {hasGk && <StatCard label="Reached GK" value={fs.reachedGkCalls} />}
            {hasOwner && <StatCard label="Reached Owner" value={fs.reachedOwnerCalls} />}
          </div>
          {/* Row 2: depth counts + booked */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {hasExplainer && <StatCard label="Delivered Pitch" value={fs.deliveredExplainerCalls} />}
            {hasClose && <StatCard label="Attempted Close" value={fs.closedCalls} />}
            {hasNotInOffice && <StatCard label="Not in Office" value={fs.notInOfficeCalls} />}
            {hasTakeMessage && <StatCard label="Took Message" value={fs.takeMessageCalls} />}
            <StatCard label="Booked" value={fs.bookedCalls} accent />
          </div>
          {/* Rates row */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <StatCard label="Connection Rate" value={pct(fs.connectionRate)} />
            {hasOwner && <StatCard label="Owner Rate" value={pct(fs.ownerRate)} />}
            <StatCard label="Booking Rate" value={pct(fs.bookingRate)} accent />
          </div>
        </div>
        {!anySemanticIds && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', padding: '10px 14px', backgroundColor: 'var(--sidebar-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            Assign Semantic IDs to nodes for detailed funnel metrics
          </div>
        )}
      </div>

      {/* Node visit counts */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Node Activity
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {tree.nodes.map(node => {
            const stat = analytics.nodeStats[node.id]
            if (!stat) return null
            const isTerminal = node.type === 'terminal' || node.type === 'booked'
            const typeColor = node.type === 'start' ? 'var(--accent)'
              : node.type === 'terminal' ? 'var(--danger)'
              : node.type === 'booked' ? 'var(--success)'
              : 'var(--text-muted)'

            return (
              <div
                key={node.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: typeColor,
                    flexShrink: 0,
                    width: '44px',
                  }}>
                    {node.type}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexShrink: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>{stat.visitCount} visit{stat.visitCount !== 1 ? 's' : ''}</span>
                  <span style={{ color: isTerminal && stat.exitCount > 0 ? (node.type === 'booked' ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)' }}>
                    {stat.exitCount}x exits
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top paths */}
      {analytics.topPaths.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Top Paths
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analytics.topPaths.map((path, i) => {
              const pathLabels = path.pathNodeIds
                .map(id => nodeMap[id]?.label ?? id)
                .join(' › ')
              return (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '6px', wordBreak: 'break-word' }}>
                    {pathLabels}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{path.count} call{path.count !== 1 ? 's' : ''}</span>
                    <span style={{ color: path.bookingRate > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {pct(path.bookingRate)} booked
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
