import { useState } from 'react'
import type { TreeNode, TreeEdge } from '../../../types/scriptTesting'

const NODE_WIDTH = 180
const NODE_HEIGHT_HALF = 30

interface Props {
  nodes: TreeNode[]
  edges: TreeEdge[]
  connectingFrom: string | null
  mousePos: { x: number; y: number } | null
  selectedEdgeId: string | null
  onDeleteEdge: (id: string) => void
  onSelectEdge: (id: string | null) => void
  onEditEdge?: (edgeId: string) => void
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

function midpoint(sx: number, sy: number, tx: number, ty: number) {
  return { x: (sx + tx) / 2, y: (sy + ty) / 2 }
}

export default function EdgeLayer({
  nodes,
  edges,
  connectingFrom,
  mousePos,
  selectedEdgeId,
  onDeleteEdge,
  onSelectEdge,
  onEditEdge,
}: Props) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

  const connectingNode = connectingFrom ? nodeMap[connectingFrom] : null

  return (
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
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="var(--border)" />
        </marker>
        <marker
          id="arrowhead-hover"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="var(--text-muted)" />
        </marker>
        <marker
          id="arrowhead-selected"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="var(--accent)" />
        </marker>
      </defs>

      {/* Existing edges */}
      {edges.map(edge => {
        const fromNode = nodeMap[edge.fromNodeId]
        const toNode = nodeMap[edge.toNodeId]
        if (!fromNode || !toNode) return null

        const src = getNodePort(fromNode, 'right')
        const dst = getNodePort(toNode, 'left')
        const path = cubicBezierPath(src.x, src.y, dst.x, dst.y)
        const mid = midpoint(src.x, src.y, dst.x, dst.y)

        const isSelected = selectedEdgeId === edge.id
        const isHovered = hoveredEdgeId === edge.id

        const strokeColor = isSelected ? 'var(--accent)' : isHovered ? 'var(--text-muted)' : 'var(--border)'
        const markerEnd = isSelected ? 'url(#arrowhead-selected)' : isHovered ? 'url(#arrowhead-hover)' : 'url(#arrowhead)'

        return (
          <g key={edge.id}>
            {/* Invisible thick hit area */}
            <path
              d={path}
              stroke="transparent"
              strokeWidth="12"
              fill="none"
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={() => onSelectEdge(isSelected ? null : edge.id)}
              onMouseEnter={() => setHoveredEdgeId(edge.id)}
              onMouseLeave={() => setHoveredEdgeId(null)}
            />
            {/* Visible line */}
            <path
              d={path}
              stroke={strokeColor}
              strokeWidth={isSelected || isHovered ? 2.5 : 2}
              fill="none"
              markerEnd={markerEnd}
              style={{ pointerEvents: 'none', transition: 'stroke 0.1s, stroke-width 0.1s' }}
            />

            {/* Label */}
            {(isHovered || isSelected || edge.responseLabel) && (
              <g
                style={{
                  pointerEvents: onEditEdge ? 'all' : 'none',
                  cursor: onEditEdge ? 'pointer' : 'default',
                }}
                onClick={onEditEdge ? (e) => { e.stopPropagation(); onEditEdge(edge.id) } : undefined}
              >
                <rect
                  x={mid.x - 40}
                  y={mid.y - 10}
                  width={80}
                  height={20}
                  rx={4}
                  fill="var(--bg-card)"
                  stroke={isSelected ? 'var(--accent)' : 'var(--border)'}
                  strokeWidth="1"
                />
                <text
                  x={mid.x}
                  y={mid.y + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isSelected ? 'var(--accent)' : 'var(--text-muted)'}
                  style={{ fontFamily: 'var(--font-body)', userSelect: 'none' }}
                >
                  {edge.responseLabel.length > 10 ? edge.responseLabel.slice(0, 10) + '…' : edge.responseLabel}
                </text>
              </g>
            )}

            {/* Delete button — show on hover or selected */}
            {(isHovered || isSelected) && (
              <g
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); onDeleteEdge(edge.id) }}
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
              >
                <circle cx={mid.x + 48} cy={mid.y} r={9} fill="var(--danger-light)" stroke="var(--danger-border)" strokeWidth="1" />
                <text x={mid.x + 48} y={mid.y + 4} textAnchor="middle" fontSize="12" fill="var(--danger)" style={{ fontFamily: 'var(--font-body)' }}>
                  ×
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* Rubber-band line while connecting */}
      {connectingFrom && connectingNode && mousePos && (
        <line
          x1={connectingNode.x + NODE_WIDTH}
          y1={connectingNode.y + NODE_HEIGHT_HALF}
          x2={mousePos.x}
          y2={mousePos.y}
          stroke="var(--accent)"
          strokeWidth="2"
          strokeDasharray="6 3"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </svg>
  )
}
