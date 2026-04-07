import { useState, useMemo, useRef, useEffect } from 'react'
import { GitBranch, X } from 'lucide-react'
import { computeTreeAnalytics } from '../../../lib/treeAnalytics'
import type { TestScript, TreeAnalytics, TreeNode } from '../../../types/scriptTesting'
import { useCustomSemanticIds, type CustomSemanticId } from '../../../hooks/useCustomSemanticIds'

const BUILTIN_SEMANTIC_LABELS: Record<string, string> = {
  'opener': 'Opener',
  'gatekeeper': 'Gatekeeper / Receptionist',
  'owner': 'Owner / Decision Maker',
  'explainer': 'Explainer / Pitch',
  'close': 'Close / Appointment',
  'not-in-office': 'Not in Office',
  'take-a-message': 'Take a Message',
}

function getSemanticLabel(id: string | undefined, customIds: CustomSemanticId[]): string | null {
  if (!id) return null
  if (BUILTIN_SEMANTIC_LABELS[id]) return BUILTIN_SEMANTIC_LABELS[id]
  return customIds.find(c => c.key === id)?.label ?? id
}

interface Props {
  scripts: TestScript[]
}

type SubMode = 'table' | 'canvas'

interface VersionAnalytics {
  script: TestScript
  analytics: TreeAnalytics | null
  nodeMap: Record<string, TreeNode>
}

interface ClickedInfo {
  nodeId: string
  versionIdx: number
}

function exitRate(visits: number, exits: number): number {
  return visits > 0 ? (exits / visits) * 100 : 0
}

function exitRateStr(visits: number, exits: number): string {
  return exitRate(visits, exits).toFixed(0) + '%'
}

function nodeColor(rate: number, hasData: boolean): string {
  if (!hasData) return 'var(--border)'
  if (rate >= 25) return 'var(--danger)'
  if (rate >= 10) return '#d4850a'
  return 'var(--success)'
}

export default function TreeCompareView({ scripts }: Props) {
  const [subMode, setSubMode] = useState<SubMode>('table')
  const [activeIds, setActiveIds] = useState<string[]>(() => scripts.map(s => s.id))
  const [clickedInfo, setClickedInfo] = useState<ClickedInfo | null>(null)
  const { customIds } = useCustomSemanticIds()

  const versionData: VersionAnalytics[] = useMemo(() => {
    return scripts.map(script => {
      if (!script.tree) return { script, analytics: null, nodeMap: {} }
      const treeCalls = script.treeCalls ?? []
      const analytics = computeTreeAnalytics(script.tree, treeCalls)
      const nodeMap = Object.fromEntries(script.tree.nodes.map(n => [n.id, n]))
      return { script, analytics, nodeMap }
    })
  }, [scripts])

  const activeVersions = versionData.filter(v => activeIds.includes(v.script.id))

  function toggleVersion(id: string) {
    setClickedInfo(null)
    setActiveIds(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev
        return prev.filter(x => x !== id)
      }
      return [...prev, id]
    })
  }

  function handleNodeClick(nodeId: string, versionIdx: number) {
    setClickedInfo(prev =>
      prev?.nodeId === nodeId && prev.versionIdx === versionIdx ? null : { nodeId, versionIdx }
    )
  }

  const allLabels: string[] = useMemo(() => {
    const labelsSet = new Set<string>()
    for (const v of activeVersions) {
      if (!v.script.tree) continue
      for (const node of v.script.tree.nodes) {
        labelsSet.add(node.label.toLowerCase())
      }
    }
    return Array.from(labelsSet)
  }, [activeVersions])

  const labelToDisplayName = useMemo(() => {
    const map: Record<string, string> = {}
    for (const v of activeVersions) {
      if (!v.script.tree) continue
      for (const node of v.script.tree.nodes) {
        const key = node.label.toLowerCase()
        if (!map[key]) map[key] = node.label
      }
    }
    return map
  }, [activeVersions])

  function getNodeStatForVersion(v: VersionAnalytics, labelLower: string) {
    if (!v.script.tree || !v.analytics) return null
    const node = v.script.tree.nodes.find(n => n.label.toLowerCase() === labelLower)
    if (!node) return null
    const stat = v.analytics.nodeStats[node.id]
    return stat ?? null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Comparing:</span>
          {scripts.map((s, i) => {
            const isActive = activeIds.includes(s.id)
            const versionLabel = `V${i + 1}`
            return (
              <button
                key={s.id}
                onClick={() => toggleVersion(s.id)}
                title={activeIds.length <= 2 && isActive ? 'At least 2 versions must remain selected' : undefined}
                style={{
                  padding: '3px 10px',
                  borderRadius: '999px',
                  border: '1px solid var(--border)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: activeIds.length <= 2 && isActive ? 'not-allowed' : 'pointer',
                  backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  opacity: activeIds.length <= 2 && isActive ? 0.7 : 1,
                  transition: 'background-color 0.12s',
                }}
              >
                {versionLabel}: {s.name}
              </button>
            )
          })}
        </div>

        <div style={{
          display: 'flex',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {(['table', 'canvas'] as SubMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setSubMode(mode)}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: subMode === mode ? 'var(--accent)' : 'transparent',
                color: subMode === mode ? '#fff' : 'var(--text-muted)',
                textTransform: 'capitalize',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: subMode === 'table' ? 'auto' : 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {subMode === 'table' ? (
          <TableMode activeVersions={activeVersions} allLabels={allLabels} labelToDisplayName={labelToDisplayName} getNodeStatForVersion={getNodeStatForVersion} />
        ) : (
          <>
            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <CanvasMode activeVersions={activeVersions} customIds={customIds} onNodeClick={handleNodeClick} />
            </div>
            {clickedInfo && (
              <NodeClickDrawer
                clickedInfo={clickedInfo}
                activeVersions={activeVersions}
                customIds={customIds}
                onClose={() => setClickedInfo(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface TableModeProps {
  activeVersions: VersionAnalytics[]
  allLabels: string[]
  labelToDisplayName: Record<string, string>
  getNodeStatForVersion: (v: VersionAnalytics, labelLower: string) => { visitCount: number; exitCount: number } | null
}

function TableMode({ activeVersions, allLabels, labelToDisplayName, getNodeStatForVersion }: TableModeProps) {
  if (activeVersions.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No versions selected.</div>
  }

  const cellStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    borderRight: '1px solid var(--border)',
    fontSize: '12px',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  }

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 700,
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--bg-card)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
  }

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${200 + activeVersions.length * 180}px` }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: '180px', textAlign: 'left' }}>Node</th>
            {activeVersions.map((v, i) => (
              <th key={v.script.id} style={{ ...headerCellStyle, textAlign: 'center' }}>
                V{i + 1}: {v.script.name}
                {!v.script.tree && <div style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--danger)', fontSize: '10px', marginTop: '2px' }}>No tree</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allLabels.map(labelLower => {
            const displayName = labelToDisplayName[labelLower] ?? labelLower

            return (
              <tr key={labelLower}>
                <td style={{ ...cellStyle, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-card)' }}>
                  {displayName}
                </td>
                {activeVersions.map((v, vIdx) => {
                  if (!v.script.tree) {
                    return (
                      <td key={v.script.id} style={{ ...cellStyle, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No tree data
                      </td>
                    )
                  }

                  const stat = getNodeStatForVersion(v, labelLower)
                  if (!stat) {
                    return (
                      <td key={v.script.id} style={{ ...cellStyle, textAlign: 'center', color: 'var(--text-muted)' }}>
                        —
                      </td>
                    )
                  }

                  const rate = exitRate(stat.visitCount, stat.exitCount)

                  let color: string = 'var(--text-muted)'
                  if (vIdx > 0) {
                    const prevStat = getNodeStatForVersion(activeVersions[vIdx - 1], labelLower)
                    if (prevStat) {
                      const prevRate = exitRate(prevStat.visitCount, prevStat.exitCount)
                      const diff = rate - prevRate
                      if (diff <= -5) color = 'var(--success)'
                      else if (diff >= 5) color = 'var(--danger)'
                    }
                  }

                  return (
                    <td key={v.script.id} style={{ ...cellStyle, textAlign: 'center', color }}>
                      <span style={{ marginRight: '6px' }}>{stat.visitCount}v</span>
                      <span style={{ marginRight: '6px' }}>{stat.exitCount}x</span>
                      <span style={{ fontWeight: 700 }}>{exitRateStr(stat.visitCount, stat.exitCount)}</span>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Canvas mode ────────────────────────────────────────────────────────────

interface CanvasModeProps {
  activeVersions: VersionAnalytics[]
  customIds: CustomSemanticId[]
  onNodeClick: (nodeId: string, versionIdx: number) => void
}

function CanvasMode({ activeVersions, customIds, onNodeClick }: CanvasModeProps) {
  const n = activeVersions.length
  const panelBasis = n === 2 ? 'calc(50% - 1px)' : n === 3 ? 'calc(33.33% - 1px)' : 'calc(25% - 1px)'

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      {activeVersions.map((v, i) => (
        <div
          key={v.script.id}
          style={{
            flex: `0 0 ${panelBasis}`,
            display: 'flex',
            flexDirection: 'column',
            borderRight: i < n - 1 ? '1px solid var(--border)' : 'none',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '8px 14px',
            borderBottom: '1px solid var(--border)',
            fontWeight: 700,
            fontSize: '12px',
            color: 'var(--text-muted)',
            flexShrink: 0,
            backgroundColor: 'var(--bg-card)',
          }}>
            V{i + 1}: {v.script.name}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {!v.script.tree ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No tree built yet
              </div>
            ) : (
              <ReadOnlyTreeCanvas
                v={v}
                customIds={customIds}
                onNodeClick={nodeId => onNodeClick(nodeId, i)}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Interactive read-only canvas ───────────────────────────────────────────

const NODE_W = 180
const NODE_H = 68

interface ReadOnlyTreeCanvasProps {
  v: VersionAnalytics
  customIds: CustomSemanticId[]
  onNodeClick: (nodeId: string) => void
}

function ReadOnlyTreeCanvas({ v, customIds, onNodeClick }: ReadOnlyTreeCanvasProps) {
  const tree = v.script.tree!
  const analytics = v.analytics
  const hasData = (v.script.treeCalls?.length ?? 0) > 0

  const containerRef = useRef<HTMLDivElement>(null)
  const [vp, setVp] = useState({ x: 40, y: 40, zoom: 1 })
  const panStart = useRef<{ x: number; y: number } | null>(null)

  // Non-passive wheel handler for smooth zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      setVp(prev => {
        const rect = el.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.max(0.25, Math.min(2, prev.zoom * factor))
        const scale = newZoom / prev.zoom
        return { x: mx - (mx - prev.x) * scale, y: my - (my - prev.y) * scale, zoom: newZoom }
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-node]')) return
    panStart.current = { x: e.clientX - vp.x, y: e.clientY - vp.y }
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!panStart.current || e.buttons !== 1) {
      panStart.current = null
      return
    }
    const start = panStart.current
    setVp(prev => ({ ...prev, x: e.clientX - start.x, y: e.clientY - start.y }))
  }

  function handleMouseUp() {
    panStart.current = null
    if (containerRef.current) containerRef.current.style.cursor = 'grab'
  }

  const transform = `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%', cursor: 'grab', backgroundColor: 'var(--bg)', userSelect: 'none' }}
    >
      {/* Edges SVG */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
        <g style={{ transform, transformOrigin: '0 0' } as React.CSSProperties}>
          {tree.edges.map(edge => {
            const from = tree.nodes.find(n => n.id === edge.fromNodeId)
            const to = tree.nodes.find(n => n.id === edge.toNodeId)
            if (!from || !to) return null
            const sx = from.x + NODE_W, sy = from.y + NODE_H / 2
            const tx = to.x, ty = to.y + NODE_H / 2
            const cp = 80
            return (
              <path
                key={edge.id}
                d={`M${sx},${sy} C${sx + cp},${sy} ${tx - cp},${ty} ${tx},${ty}`}
                fill="none"
                stroke="var(--border)"
                strokeWidth={1.5}
              />
            )
          })}
        </g>
      </svg>

      {/* Nodes */}
      <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', transform }}>
        {tree.nodes.map(node => {
          const stat = analytics?.nodeStats[node.id]
          const visits = stat?.visitCount ?? 0
          const exits = stat?.exitCount ?? 0
          const rate = exitRate(visits, exits)
          const borderCol = nodeColor(rate, hasData && visits > 0)
          const typeAccent = node.type === 'start' ? 'var(--accent)'
            : node.type === 'terminal' ? 'var(--danger)'
            : node.type === 'booked' ? 'var(--success)'
            : 'var(--text-muted)'
          const semLabel = getSemanticLabel(node.semanticId, customIds)

          return (
            <div
              key={node.id}
              data-node="1"
              onClick={() => onNodeClick(node.id)}
              onMouseDown={e => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: NODE_W,
                height: NODE_H,
                borderRadius: 6,
                border: `${hasData && visits > 0 ? 2 : 1}px solid ${borderCol}`,
                backgroundColor: 'var(--bg-card)',
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'flex',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ width: 4, flexShrink: 0, backgroundColor: typeAccent }} />
              <div style={{ flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.label}
                </div>
                {semLabel && (
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', background: 'var(--border)', borderRadius: 3, padding: '1px 4px', alignSelf: 'flex-start' }}>
                    {semLabel}
                  </div>
                )}
                <div style={{ fontSize: 10, color: hasData && visits > 0 ? borderCol : 'var(--text-muted)' }}>
                  {hasData ? `${visits}v · ${exits}x · ${exitRateStr(visits, exits)}` : 'no data yet'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Node click bottom drawer ────────────────────────────────────────────────

interface NodeClickDrawerProps {
  clickedInfo: ClickedInfo
  activeVersions: VersionAnalytics[]
  customIds: CustomSemanticId[]
  onClose: () => void
}

function NodeClickDrawer({ clickedInfo, activeVersions, customIds, onClose }: NodeClickDrawerProps) {
  const clickedVersion = activeVersions[clickedInfo.versionIdx]
  const clickedNode = clickedVersion?.script.tree?.nodes.find(n => n.id === clickedInfo.nodeId)

  if (!clickedNode) return null

  const semLabel = getSemanticLabel(clickedNode.semanticId, customIds)
  const hasSemId = !!clickedNode.semanticId

  // Build rows: one per active version, matching by semanticId or just showing clicked version
  const rows = activeVersions.map((v, i) => {
    let matchedNode: TreeNode | undefined
    if (hasSemId) {
      matchedNode = v.script.tree?.nodes.find(n => n.semanticId === clickedNode.semanticId)
    } else if (i === clickedInfo.versionIdx) {
      matchedNode = clickedNode
    }
    if (!matchedNode) return { v, i, matchedNode: null, visits: 0, exits: 0, rate: 0, hasData: false }
    const stat = v.analytics?.nodeStats[matchedNode.id]
    const visits = stat?.visitCount ?? 0
    const exits = stat?.exitCount ?? 0
    const hasData = (v.script.treeCalls?.length ?? 0) > 0
    return { v, i, matchedNode, visits, exits, rate: exitRate(visits, exits), hasData }
  })

  return (
    <div style={{
      flexShrink: 0,
      borderTop: '1px solid var(--border)',
      backgroundColor: 'var(--bg-card)',
      height: 190,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Drawer header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{clickedNode.label}</span>
          {semLabel && <span style={{ fontSize: 10, background: 'var(--border)', borderRadius: 3, padding: '2px 6px', color: 'var(--text-muted)' }}>{semLabel}</span>}
          {!hasSemId && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Assign a Semantic ID to compare this node across versions</span>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
          <X size={14} />
        </button>
      </div>

      {/* Stats rows */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {rows.map((row, rowIdx) => {
          const borderCol = nodeColor(row.rate, row.hasData && row.visits > 0)
          const prevRow = rowIdx > 0 ? rows[rowIdx - 1] : null
          let delta: React.ReactNode = null
          if (prevRow && prevRow.matchedNode && row.matchedNode && row.hasData) {
            const diff = row.rate - prevRow.rate
            if (Math.abs(diff) >= 5) {
              delta = <span style={{ fontSize: 10, color: diff < 0 ? 'var(--success)' : 'var(--danger)' }}>{diff > 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(0)}pp</span>
            }
          }

          return (
            <div key={row.v.script.id} style={{ minWidth: 140, padding: '8px 12px', borderRadius: 6, border: `1px solid var(--border)`, backgroundColor: 'var(--bg)', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>V{row.i + 1}: {row.v.script.name}</div>
              {!row.matchedNode ? (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>—</div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 2 }}>{row.matchedNode.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: borderCol }}>{row.hasData ? exitRateStr(row.visits, row.exits) : '—'}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.visits}v · {row.exits}x exits</div>
                  {delta}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { GitBranch as TreeCompareIcon }
