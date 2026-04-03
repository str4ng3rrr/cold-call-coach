import { useRef, useEffect, useState } from 'react'
import type { ScriptTreeData, TreeNode, TreeEdge } from '../../../types/scriptTesting'

const NODE_WIDTH = 180
const NODE_HEIGHT = 64
const NODE_HEIGHT_HALF = NODE_HEIGHT / 2

interface Props {
  tree: ScriptTreeData
  currentNodeId: string | null
  pathNodeIds: string[]
  availableEdgeIds: string[]
  onFollowEdge: (edgeId: string) => void
}

function getNodePort(node: TreeNode, side: 'left' | 'right') {
  return {
    x: side === 'right' ? node.x + NODE_WIDTH : node.x,
    y: node.y + NODE_HEIGHT_HALF,
  }
}

function cubicBezierPath(sx: number, sy: number, tx: number, ty: number) {
  const cp1x = sx + 80
  const cp2x = tx - 80
  return `M ${sx},${sy} C ${cp1x},${sy} ${cp2x},${ty} ${tx},${ty}`
}

const TYPE_CONFIG: Record<TreeNode['type'], { border: string; badge: string; bg: string }> = {
  start: { border: 'var(--accent)', badge: 'var(--accent)', bg: 'var(--bg-card)' },
  step: { border: 'var(--border)', badge: 'var(--text-muted)', bg: 'var(--bg-card)' },
  terminal: { border: 'var(--danger)', badge: 'var(--danger)', bg: 'var(--bg-card)' },
  booked: { border: 'var(--success)', badge: 'var(--success)', bg: 'var(--bg-card)' },
}

export default function RecordTreeView({ tree, currentNodeId, pathNodeIds, availableEdgeIds, onFollowEdge }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState(() => ({
    x: tree.viewport.x,
    y: tree.viewport.y,
    zoom: tree.viewport.zoom,
  }))
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  const pathSet = new Set(pathNodeIds)
  const availableSet = new Set(availableEdgeIds)
  const nodeMap = Object.fromEntries(tree.nodes.map(n => [n.id, n]))

  // Center on current node when it changes
  useEffect(() => {
    if (!currentNodeId || !containerRef.current) return
    const node = nodeMap[currentNodeId]
    if (!node) return
    const rect = containerRef.current.getBoundingClientRect()
    const targetX = rect.width / 2 - (node.x + NODE_WIDTH / 2) * transform.zoom
    const targetY = rect.height / 2 - (node.y + NODE_HEIGHT_HALF) * transform.zoom
    setTransform(t => ({ ...t, x: targetX, y: targetY }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeId])

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.button !== 2) return
    e.preventDefault()
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }
    containerRef.current!.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isPanning) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setTransform(t => ({ ...t, x: panStart.current.tx + dx, y: panStart.current.ty + dy }))
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (isPanning) {
      setIsPanning(false)
      containerRef.current?.releasePointerCapture(e.pointerId)
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault()
    const newZoom = Math.min(2, Math.max(0.25, transform.zoom * (1 - e.deltaY * 0.001)))
    const rect = containerRef.current!.getBoundingClientRect()
    const cursorX = e.clientX - rect.left
    const cursorY = e.clientY - rect.top
    const newX = cursorX - (cursorX - transform.x) * (newZoom / transform.zoom)
    const newY = cursorY - (cursorY - transform.y) * (newZoom / transform.zoom)
    setTransform({ x: newX, y: newY, zoom: newZoom })
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
  }

  function edgeStroke(edge: TreeEdge): string {
    if (availableSet.has(edge.id)) return 'var(--accent)'
    const fromVisited = pathSet.has(edge.fromNodeId)
    const toVisited = pathSet.has(edge.toNodeId)
    if (fromVisited && toVisited) return 'var(--text-muted)'
    return 'var(--border)'
  }

  function edgeOpacity(edge: TreeEdge): number {
    if (availableSet.has(edge.id)) return 1
    const fromVisited = pathSet.has(edge.fromNodeId)
    const toVisited = pathSet.has(edge.toNodeId)
    if (fromVisited && toVisited) return 0.7
    return 0.3
  }

  function nodeOpacity(node: TreeNode): number {
    if (node.id === currentNodeId) return 1
    if (pathSet.has(node.id)) return 0.85
    // Reachable via an available edge
    const isNextNode = tree.edges.some(e => availableSet.has(e.id) && e.toNodeId === node.id)
    if (isNextNode) return 1
    return 0.35
  }

  function nodeBorder(node: TreeNode): string {
    if (node.id === currentNodeId) {
      return node.type === 'start' ? 'var(--accent)' :
             node.type === 'booked' ? 'var(--success)' :
             node.type === 'terminal' ? 'var(--danger)' :
             'var(--accent)'
    }
    const cfg = TYPE_CONFIG[node.type]
    return cfg.border
  }

  function nodeBorderWidth(node: TreeNode): string {
    if (node.id === currentNodeId) return '3px'
    const isNextNode = tree.edges.some(e => availableSet.has(e.id) && e.toNodeId === node.id)
    if (isNextNode) return '2px'
    return '1px'
  }

  function nodeGlow(node: TreeNode): string {
    if (node.id === currentNodeId) return '0 0 0 4px rgba(26,77,62,0.35), var(--shadow-md)'
    const isNextNode = tree.edges.some(e => availableSet.has(e.id) && e.toNodeId === node.id)
    if (isNextNode) return '0 0 0 2px rgba(26,77,62,0.2), var(--shadow-sm)'
    return 'none'
  }

  const isNextNode = (node: TreeNode) =>
    tree.edges.some(e => availableSet.has(e.id) && e.toNodeId === node.id)

  const edgeToNode = (nodeId: string) =>
    tree.edges.find(e => availableSet.has(e.id) && e.toNodeId === nodeId)

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'default',
        backgroundColor: 'var(--sidebar-bg)',
        backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
        backgroundSize: `${24 * transform.zoom}px ${24 * transform.zoom}px`,
        backgroundPosition: `${transform.x}px ${transform.y}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Edges SVG */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <defs>
            <marker id="rv-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--border)" />
            </marker>
            <marker id="rv-arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--accent)" />
            </marker>
            <marker id="rv-arrow-visited" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--text-muted)" />
            </marker>
          </defs>
          {tree.edges.map(edge => {
            const fromNode = nodeMap[edge.fromNodeId]
            const toNode = nodeMap[edge.toNodeId]
            if (!fromNode || !toNode) return null
            const src = getNodePort(fromNode, 'right')
            const dst = getNodePort(toNode, 'left')
            const path = cubicBezierPath(src.x, src.y, dst.x, dst.y)
            const mx = (src.x + dst.x) / 2
            const my = (src.y + dst.y) / 2
            const isAvailable = availableSet.has(edge.id)
            const isVisited = pathSet.has(edge.fromNodeId) && pathSet.has(edge.toNodeId)
            const marker = isAvailable ? 'url(#rv-arrow-active)' : isVisited ? 'url(#rv-arrow-visited)' : 'url(#rv-arrow)'
            return (
              <g key={edge.id} style={{ opacity: edgeOpacity(edge) }}>
                <path
                  d={path}
                  stroke={edgeStroke(edge)}
                  strokeWidth={isAvailable ? 2.5 : 1.5}
                  fill="none"
                  markerEnd={marker}
                  strokeDasharray={isAvailable ? undefined : '4 3'}
                />
                {/* Label */}
                <g>
                  <rect x={mx - 42} y={my - 10} width={84} height={20} rx={4}
                    fill="var(--bg-card)" stroke={isAvailable ? 'var(--accent)' : 'var(--border)'} strokeWidth="1" />
                  <text x={mx} y={my + 4} textAnchor="middle" fontSize="10"
                    fill={isAvailable ? 'var(--accent)' : 'var(--text-muted)'}
                    style={{ fontFamily: 'var(--font-body)' }}>
                    {edge.responseLabel.length > 11 ? edge.responseLabel.slice(0, 11) + '…' : edge.responseLabel}
                  </text>
                </g>
              </g>
            )
          })}
        </svg>

        {/* Nodes */}
        {tree.nodes.map(node => {
          const cfg = TYPE_CONFIG[node.type]
          const isCurrent = node.id === currentNodeId
          const isNext = isNextNode(node)
          const clickableEdge = isNext ? edgeToNode(node.id) : null
          const badgeLabel = node.type === 'start' ? 'Start' : node.type === 'step' ? 'Step' : node.type === 'terminal' ? 'End' : 'Booked'
          return (
            <div
              key={node.id}
              onClick={clickableEdge ? () => onFollowEdge(clickableEdge.id) : undefined}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: `${NODE_WIDTH}px`,
                minHeight: `${NODE_HEIGHT}px`,
                backgroundColor: isCurrent ? 'var(--sidebar-bg)' : cfg.bg,
                border: `${nodeBorderWidth(node)} solid ${nodeBorder(node)}`,
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                opacity: nodeOpacity(node),
                boxShadow: nodeGlow(node),
                cursor: isNext ? 'pointer' : 'default',
                transition: 'opacity 0.15s, box-shadow 0.15s',
                userSelect: 'none',
              }}
            >
              {/* Badge */}
              <div style={{
                position: 'absolute',
                top: '6px',
                right: '8px',
                fontSize: '10px',
                fontWeight: 700,
                color: isCurrent ? nodeBorder(node) : cfg.badge,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                opacity: 0.85,
              }}>
                {isCurrent ? '▶ NOW' : badgeLabel}
              </div>

              {/* Label */}
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                paddingRight: '44px',
                lineHeight: 1.3,
                wordBreak: 'break-word',
              }}>
                {node.label}
              </div>

              {/* "Click to go here" hint for available next nodes */}
              {isNext && (
                <div style={{
                  marginTop: '4px',
                  fontSize: '10px',
                  color: 'var(--accent)',
                  fontWeight: 600,
                }}>
                  Click to choose
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Zoom level indicator */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        padding: '4px 8px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '11px',
        color: 'var(--text-muted)',
      }}>
        {Math.round(transform.zoom * 100)}%
      </div>
    </div>
  )
}
