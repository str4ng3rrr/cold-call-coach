import type { TreeNode } from '../../../types/scriptTesting'

interface Props {
  onAddNode: (partial: Omit<TreeNode, 'id'>) => void
  viewport: { x: number; y: number; zoom: number }
}

let addOffset = 0

function getDefaultPosition(viewport: { x: number; y: number; zoom: number }) {
  // Place near the center of the current viewport, with a small offset to avoid stacking
  addOffset = (addOffset + 40) % 200
  const baseX = Math.max(50, (-viewport.x / viewport.zoom) + 200 + addOffset)
  const baseY = Math.max(50, (-viewport.y / viewport.zoom) + 200 + addOffset)
  return { x: baseX, y: baseY }
}

const TOOLBAR_BUTTONS: {
  label: string
  type: TreeNode['type']
  color: string
  defaultLabel: string
  defaultContent: string
}[] = [
  { label: '+ Step', type: 'step', color: 'var(--text-muted)', defaultLabel: 'New Step', defaultContent: '' },
  { label: '+ End', type: 'terminal', color: 'var(--danger)', defaultLabel: 'End', defaultContent: '' },
  { label: '+ Booked', type: 'booked', color: 'var(--success)', defaultLabel: 'Booked!', defaultContent: '' },
]

export default function NodeAddToolbar({ onAddNode, viewport }: Props) {
  return (
    <div style={{
      width: '56px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      padding: '12px 6px',
      borderRight: '1px solid var(--border)',
      backgroundColor: 'var(--bg-card)',
    }}>
      {TOOLBAR_BUTTONS.map(btn => {
        const { x, y } = getDefaultPosition(viewport)
        return (
          <button
            key={btn.type}
            onClick={() => onAddNode({
              type: btn.type,
              label: btn.defaultLabel,
              content: btn.defaultContent,
              x,
              y,
            })}
            title={`Add ${btn.type} node`}
            style={{
              width: '44px',
              padding: '8px 4px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid var(--border)`,
              backgroundColor: 'var(--bg)',
              color: btn.color,
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              textAlign: 'center',
              lineHeight: 1.3,
              transition: 'background-color 0.1s, border-color 0.1s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.backgroundColor = 'var(--sidebar-bg)'
              el.style.borderColor = btn.color
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.backgroundColor = 'var(--bg)'
              el.style.borderColor = 'var(--border)'
            }}
          >
            {btn.label}
          </button>
        )
      })}
    </div>
  )
}
