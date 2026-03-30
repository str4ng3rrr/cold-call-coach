import { useMemo } from 'react'
import type { TallyStage } from '../../types/scriptTesting'

// --- Node layout (precomputed positions for the full funnel tree) ---

interface NodeDef {
  id: string
  label: string
  x: number
  y: number
  isTerminal: boolean
}

// SVG viewBox: 0 0 360 166
// 7 levels, y-spacing ~24px, labels below nodes
const NODES: NodeDef[] = [
  // Level 0
  { id: 'call_started', label: 'Call', x: 168, y: 12, isTerminal: false },
  // Level 1
  { id: 'no_connection', label: 'NC', x: 50, y: 38, isTerminal: true },
  { id: 'connected', label: 'Conn', x: 208, y: 38, isTerminal: false },
  // Level 2
  { id: 'gatekeeper', label: 'GK', x: 132, y: 60, isTerminal: false },
  { id: 'owner', label: 'Owner', x: 282, y: 60, isTerminal: false },
  // Level 3
  { id: 'gk_opening_fail', label: 'GKF', x: 60, y: 82, isTerminal: true },
  { id: 'gk_pass', label: 'Pass', x: 156, y: 82, isTerminal: false },
  { id: 'opening_fail', label: 'OpF', x: 250, y: 82, isTerminal: true },
  { id: 'opening_good', label: 'OpG', x: 308, y: 82, isTerminal: false },
  // Level 4
  { id: 'not_in_office', label: 'NIO', x: 106, y: 104, isTerminal: false },
  { id: 'transferred', label: 'Xfer', x: 183, y: 104, isTerminal: false },
  { id: 'explainer_fail', label: 'ExF', x: 275, y: 104, isTerminal: true },
  { id: 'explainer_success', label: 'ExS', x: 328, y: 104, isTerminal: false },
  // Level 5
  { id: 'left_message', label: 'Msg', x: 80, y: 128, isTerminal: true },
  { id: 'no_message', label: 'NoM', x: 126, y: 128, isTerminal: true },
  { id: 'owner_picked_up', label: 'OwP', x: 160, y: 128, isTerminal: false },
  { id: 'owner_not_available', label: 'NA', x: 206, y: 128, isTerminal: false },
  { id: 'close_fail', label: 'ClF', x: 305, y: 128, isTerminal: true },
  { id: 'appointment_booked', label: 'Bk!', x: 342, y: 128, isTerminal: true },
  // Level 6
  { id: 'left_voicemail', label: 'VM', x: 186, y: 152, isTerminal: true },
  { id: 'no_voicemail', label: 'NoV', x: 226, y: 152, isTerminal: true },
]

const NODE_MAP: Record<string, NodeDef> = {}
for (const n of NODES) NODE_MAP[n.id] = n

// --- Edges ---

const EDGES: [string, string][] = [
  ['call_started', 'no_connection'],
  ['call_started', 'connected'],
  ['connected', 'gatekeeper'],
  ['connected', 'owner'],
  ['gatekeeper', 'gk_opening_fail'],
  ['gatekeeper', 'gk_pass'],
  ['gk_pass', 'not_in_office'],
  ['gk_pass', 'transferred'],
  ['not_in_office', 'left_message'],
  ['not_in_office', 'no_message'],
  ['transferred', 'owner_picked_up'],
  ['transferred', 'owner_not_available'],
  ['owner_not_available', 'left_voicemail'],
  ['owner_not_available', 'no_voicemail'],
  ['owner', 'opening_fail'],
  ['owner', 'opening_good'],
  ['opening_good', 'explainer_fail'],
  ['opening_good', 'explainer_success'],
  ['explainer_success', 'close_fail'],
  ['explainer_success', 'appointment_booked'],
]

// Children lookup
const CHILDREN: Record<string, string[]> = {}
for (const [from, to] of EDGES) {
  if (!CHILDREN[from]) CHILDREN[from] = []
  CHILDREN[from].push(to)
}

// --- Path logic ---

// Build the "visual path" — the sequence of node IDs the marker travels through.
// When owner_picked_up is followed by owner-subtree steps, insert 'owner' as the jump target.
function getVisualPath(path: string[]): string[] {
  const vp = ['call_started']
  for (let i = 0; i < path.length; i++) {
    vp.push(path[i])
    if (path[i] === 'owner_picked_up' && i + 1 < path.length) {
      vp.push('owner') // jump
    }
  }
  return vp
}

// The "current options" are children of the current node in the tree.
// Special case: at owner_picked_up, options come from the owner node (jump target).
function getOptions(nodeId: string): string[] {
  if (nodeId === 'owner_picked_up') return CHILDREN['owner'] || []
  return CHILDREN[nodeId] || []
}

// --- Component ---

interface FunnelTreeProps {
  path: string[]
  stage: TallyStage
}

export default function FunnelTree({ path, stage }: FunnelTreeProps) {
  const visualPath = useMemo(() => getVisualPath(path), [path])
  const pathSet = useMemo(() => new Set(visualPath), [visualPath])
  const currentId = visualPath[visualPath.length - 1]
  const options = useMemo(() => new Set(getOptions(currentId)), [currentId])

  // Active edges: consecutive pairs in the visual path
  const activeEdgeSet = useMemo(() => {
    const s = new Set<string>()
    for (let i = 0; i < visualPath.length - 1; i++) {
      s.add(visualPath[i] + '>' + visualPath[i + 1])
    }
    return s
  }, [visualPath])

  // Marker target
  const m = NODE_MAP[currentId]
  const mx = m?.x ?? 168
  const my = m?.y ?? 12

  // Is the jump arrow on the active path?
  const jumpActive = pathSet.has('owner_picked_up') && (
    pathSet.has('owner') || currentId === 'owner_picked_up'
  )

  if (stage === 'idle' || stage === 'done') return null

  return (
    <div className="funnel-tree-viz" style={{ padding: '2px 0 6px' }}>
      <svg
        viewBox="0 0 360 166"
        width="100%"
        style={{ display: 'block', maxWidth: '400px', margin: '0 auto' }}
      >
        {/* --- Edges --- */}
        {EDGES.map(([from, to]) => {
          const a = NODE_MAP[from]
          const b = NODE_MAP[to]
          const edgeKey = from + '>' + to
          const isActive = activeEdgeSet.has(edgeKey)
          const isOption = from === currentId && options.has(to)
          // Special: if at owner_picked_up, highlight edges from owner to its children
          const isJumpOption = currentId === 'owner_picked_up' && from === 'owner' && options.has(to)
          const op = isActive ? 1 : (isOption || isJumpOption) ? 0.45 : 0.12
          return (
            <line
              key={edgeKey}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isActive ? 'var(--accent)' : 'var(--border)'}
              strokeWidth={isActive ? 2 : 1.2}
              opacity={op}
              style={{ transition: 'all 0.35s ease' }}
            />
          )
        })}

        {/* --- Jump arrow (OwP → Owner) --- */}
        {(() => {
          const owp = NODE_MAP['owner_picked_up']
          const own = NODE_MAP['owner']
          return (
            <path
              d={`M ${owp.x + 4} ${owp.y - 4} C ${owp.x + 30} ${owp.y - 60} ${own.x - 30} ${own.y - 20} ${own.x - 4} ${own.y + 4}`}
              fill="none"
              stroke={jumpActive ? 'var(--accent)' : 'var(--border)'}
              strokeWidth={jumpActive ? 1.8 : 1}
              strokeDasharray="4 3"
              opacity={jumpActive ? 0.7 : 0.1}
              markerEnd={jumpActive ? 'url(#arrowGreen)' : 'url(#arrowDim)'}
              style={{ transition: 'all 0.35s ease' }}
            />
          )
        })()}

        {/* Arrow markers */}
        <defs>
          <marker id="arrowGreen" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)" opacity="0.7" />
          </marker>
          <marker id="arrowDim" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--border)" opacity="0.15" />
          </marker>
        </defs>

        {/* --- Nodes --- */}
        {NODES.map(node => {
          const onPath = pathSet.has(node.id)
          const isOpt = options.has(node.id)
          const op = onPath ? 1 : isOpt ? 0.65 : 0.15
          const fill = onPath ? 'var(--accent)' : 'var(--bg-card)'
          const stroke = onPath ? 'var(--accent)' : 'var(--border)'
          return (
            <g key={node.id}>
              <circle
                cx={node.x} cy={node.y}
                r={4}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.5}
                strokeDasharray={node.isTerminal && !onPath ? '2 1.5' : 'none'}
                opacity={op}
                style={{ transition: 'all 0.35s ease' }}
              />
              <text
                x={node.x}
                y={node.id === 'call_started' ? node.y - 8 : node.y + 12}
                textAnchor="middle"
                fontSize="7"
                fontWeight={onPath ? 700 : 500}
                fill={onPath ? 'var(--accent)' : 'var(--text-muted)'}
                opacity={op}
                style={{
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.35s ease',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {node.label}
              </text>
            </g>
          )
        })}

        {/* --- Glowing marker --- */}
        <g style={{
          transform: `translate(${mx}px, ${my}px)`,
          transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
          {/* Outer glow */}
          <circle r={9} fill="var(--accent)" opacity={0.15} style={{ filter: 'blur(4px)' }} />
          {/* Inner ring */}
          <circle r={6} fill="none" stroke="var(--accent)" strokeWidth={1.5} opacity={0.35} />
          {/* Core dot */}
          <circle r={3.5} fill="var(--accent)" stroke="var(--bg-card)" strokeWidth={1} />
        </g>
      </svg>

      <style>{`
        @media (max-width: 640px) {
          .funnel-tree-viz { display: none !important; }
        }
      `}</style>
    </div>
  )
}
