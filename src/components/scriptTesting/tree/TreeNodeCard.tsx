import { useRef } from 'react'
import type { TreeNode, SemanticNodeId } from '../../../types/scriptTesting'

const SEMANTIC_LABELS: Record<SemanticNodeId, string> = {
  opener: 'Opener',
  gatekeeper: 'GK',
  owner: 'Owner',
  explainer: 'Pitch',
  close: 'Close',
  'not-in-office': 'NIO',
}

interface Props {
  node: TreeNode
  selected: boolean
  isConnecting: boolean
  isConnectTarget: boolean
  onSelect: () => void
  onDragStart: () => void
  onDrag: (dx: number, dy: number) => void
  onDragEnd: () => void
  onConnectHandleClick: () => void
  onConnectTargetClick: () => void
}

const TYPE_CONFIG = {
  start: {
    borderColor: 'var(--accent)',
    borderWidth: '2px',
    badgeLabel: 'Start',
    badgeColor: 'var(--accent)',
    glowColor: 'rgba(26,77,62,0.35)',
  },
  step: {
    borderColor: 'var(--border)',
    borderWidth: '1px',
    badgeLabel: 'Step',
    badgeColor: 'var(--text-muted)',
    glowColor: 'rgba(45,42,38,0.25)',
  },
  terminal: {
    borderColor: 'var(--danger)',
    borderWidth: '2px',
    badgeLabel: 'End',
    badgeColor: 'var(--danger)',
    glowColor: 'rgba(192,57,43,0.35)',
  },
  booked: {
    borderColor: 'var(--success)',
    borderWidth: '2px',
    badgeLabel: 'Booked',
    badgeColor: 'var(--success)',
    glowColor: 'rgba(26,77,62,0.35)',
  },
}

export default function TreeNodeCard({
  node,
  selected,
  isConnecting,
  isConnectTarget,
  onSelect,
  onDragStart,
  onDrag,
  onDragEnd,
  onConnectHandleClick,
  onConnectTargetClick,
}: Props) {
  const cfg = TYPE_CONFIG[node.type]
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Don't start drag when clicking on connect handle
    if ((e.target as HTMLElement).dataset.connectHandle) return

    e.stopPropagation()

    if (isConnecting) {
      onConnectTargetClick()
      return
    }

    dragStart.current = { x: e.clientX, y: e.clientY }
    isDragging.current = false
    onDragStart()
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (!isDragging.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      isDragging.current = true
    }
    if (isDragging.current) {
      onDrag(dx, dy)
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) {
      onSelect()
    }
    dragStart.current = null
    isDragging.current = false
    onDragEnd()
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const boxShadow = selected
    ? `0 0 0 3px ${cfg.glowColor}, var(--shadow-md)`
    : isConnectTarget
    ? `0 0 0 3px rgba(26,77,62,0.5), var(--shadow-sm)`
    : 'var(--shadow-sm)'

  return (
    <div
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: '180px',
        minHeight: '60px',
        backgroundColor: 'var(--bg-card)',
        border: `${cfg.borderWidth} solid ${cfg.borderColor}`,
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        cursor: isConnecting ? 'crosshair' : 'grab',
        userSelect: 'none',
        boxShadow,
        transition: 'box-shadow 0.12s',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Type badge */}
      <div style={{
        position: 'absolute',
        top: '6px',
        right: '8px',
        fontSize: '10px',
        fontWeight: 700,
        color: cfg.badgeColor,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        opacity: 0.8,
      }}>
        {cfg.badgeLabel}
      </div>

      {/* Label */}
      <div style={{
        fontSize: '14px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        paddingRight: '36px',
        lineHeight: 1.3,
        wordBreak: 'break-word',
      }}>
        {node.label}
      </div>

      {/* Semantic ID badge */}
      {node.semanticId && (
        <div style={{
          display: 'inline-block',
          marginTop: '5px',
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--text-muted)',
          backgroundColor: 'var(--sidebar-bg)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '1px 7px',
          letterSpacing: '0.02em',
        }}>
          {SEMANTIC_LABELS[node.semanticId]}
        </div>
      )}

      {/* Connect handle (right edge) */}
      {!isConnecting && (
        <div
          data-connect-handle="true"
          onClick={(e) => { e.stopPropagation(); onConnectHandleClick() }}
          style={{
            position: 'absolute',
            right: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-card)',
            border: `2px solid ${cfg.borderColor}`,
            cursor: 'crosshair',
            zIndex: 1,
          }}
          title="Connect to another node"
        />
      )}
    </div>
  )
}
