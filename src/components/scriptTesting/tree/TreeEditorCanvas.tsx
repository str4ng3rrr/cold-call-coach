import { useState, useRef, useEffect, useCallback } from 'react'
import type { TreeNode, TreeEdge } from '../../../types/scriptTesting'
import TreeNodeCard from './TreeNodeCard'
import EdgeLayer from './EdgeLayer'
import EdgeLabelPopup from './EdgeLabelPopup'

interface Props {
  nodes: TreeNode[]
  edges: TreeEdge[]
  viewport: { x: number; y: number; zoom: number }
  onMoveNode: (id: string, x: number, y: number) => void
  onAddNode: (partial: Omit<TreeNode, 'id'>) => void
  onDeleteNode: (id: string) => void
  onUpdateNode: (id: string, updates: Partial<Omit<TreeNode, 'id'>>) => void
  onAddEdge: (partial: Omit<TreeEdge, 'id'>) => void
  onDeleteEdge: (id: string) => void
  onUpdateEdge: (id: string, updates: Partial<Omit<TreeEdge, 'id'>>) => void
  onSaveViewport: (vp: { x: number; y: number; zoom: number }) => void
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
  onEditEdge?: (edgeId: string) => void
}

export default function TreeEditorCanvas({
  nodes,
  edges,
  viewport,
  onMoveNode,
  onAddEdge,
  onDeleteEdge,
  onSaveViewport,
  selectedNodeId,
  onSelectNode,
  onEditEdge,
}: Props) {
  const [transform, setTransform] = useState(() => ({
    x: viewport.x,
    y: viewport.y,
    zoom: viewport.zoom,
  }))
  const [isPanning, setIsPanning] = useState(false)
  const [isRightPanning, setIsRightPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [pendingEdge, setPendingEdge] = useState<{ fromId: string; toId: string; screenPos: { x: number; y: number } } | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragInitialNodePos = useRef<{ id: string; x: number; y: number } | null>(null)

  // Sync transform from viewport prop on first mount only
  const didInit = useRef(false)
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true
      setTransform({ x: viewport.x, y: viewport.y, zoom: viewport.zoom })
    }
  }, [])

  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (sx - rect.left - transform.x) / transform.zoom,
      y: (sy - rect.top - transform.y) / transform.zoom,
    }
  }, [transform])

  // Escape cancels connect mode and deselects
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setConnectingFrom(null)
        setPendingEdge(null)
        onSelectNode(null)
        setSelectedEdgeId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSelectNode])

  function handleCanvasPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Right-click pans from anywhere on the canvas (even over nodes)
    if (e.button === 2) {
      e.preventDefault()
      setIsRightPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }
      canvasRef.current!.setPointerCapture(e.pointerId)
      return
    }
    if (e.target !== canvasRef.current) return
    if (connectingFrom) {
      setConnectingFrom(null)
      return
    }
    onSelectNode(null)
    setSelectedEdgeId(null)
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }
    canvasRef.current!.setPointerCapture(e.pointerId)
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (connectingFrom) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY)
      setMousePos(canvasPos)
    }
    if (!isPanning && !isRightPanning) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setTransform(t => ({ ...t, x: panStart.current.tx + dx, y: panStart.current.ty + dy }))
  }

  function handleCanvasPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (isRightPanning) {
      setIsRightPanning(false)
      onSaveViewport(transform)
      canvasRef.current?.releasePointerCapture(e.pointerId)
      return
    }
    if (isPanning) {
      setIsPanning(false)
      onSaveViewport(transform)
      canvasRef.current?.releasePointerCapture(e.pointerId)
    }
  }

  function handleContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    // Suppress context menu when right-click panning
    e.preventDefault()
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault()
    const newZoom = Math.min(2, Math.max(0.25, transform.zoom * (1 - e.deltaY * 0.001)))
    const rect = canvasRef.current!.getBoundingClientRect()
    const cursorX = e.clientX - rect.left
    const cursorY = e.clientY - rect.top
    const newX = cursorX - (cursorX - transform.x) * (newZoom / transform.zoom)
    const newY = cursorY - (cursorY - transform.y) * (newZoom / transform.zoom)
    const newTransform = { x: newX, y: newY, zoom: newZoom }
    setTransform(newTransform)
    onSaveViewport(newTransform)
  }

  function handleConnectHandleClick(nodeId: string) {
    setConnectingFrom(nodeId)
    onSelectNode(null)
  }

  function handleConnectTargetClick(nodeId: string) {
    if (!connectingFrom || connectingFrom === nodeId) {
      setConnectingFrom(null)
      return
    }
    // Check for duplicate edge
    const exists = edges.some(e => e.fromNodeId === connectingFrom && e.toNodeId === nodeId)
    if (exists) {
      setConnectingFrom(null)
      return
    }
    // Calculate screen position for the popup (midpoint between nodes)
    const fromNode = nodes.find(n => n.id === connectingFrom)
    const toNode = nodes.find(n => n.id === nodeId)
    if (fromNode && toNode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const fromScreenX = rect.left + (fromNode.x + 180) * transform.zoom + transform.x
      const fromScreenY = rect.top + (fromNode.y + 30) * transform.zoom + transform.y
      const toScreenX = rect.left + toNode.x * transform.zoom + transform.x
      const toScreenY = rect.top + (toNode.y + 30) * transform.zoom + transform.y
      setPendingEdge({
        fromId: connectingFrom,
        toId: nodeId,
        screenPos: { x: (fromScreenX + toScreenX) / 2, y: (fromScreenY + toScreenY) / 2 },
      })
    }
    setConnectingFrom(null)
    setMousePos(null)
  }

  function handleEdgeLabelConfirm(label: string) {
    if (!pendingEdge) return
    onAddEdge({ fromNodeId: pendingEdge.fromId, toNodeId: pendingEdge.toId, responseLabel: label })
    setPendingEdge(null)
  }

  function handleFitToScreen() {
    if (nodes.length === 0) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const padding = 80

    const minX = Math.min(...nodes.map(n => n.x))
    const maxX = Math.max(...nodes.map(n => n.x + 180))
    const minY = Math.min(...nodes.map(n => n.y))
    const maxY = Math.max(...nodes.map(n => n.y + 60))

    const contentW = maxX - minX
    const contentH = maxY - minY
    const zoom = Math.min(
      2,
      Math.max(0.25, Math.min(
        (rect.width - padding * 2) / contentW,
        (rect.height - padding * 2) / contentH
      ))
    )
    const newX = (rect.width - contentW * zoom) / 2 - minX * zoom
    const newY = (rect.height - contentH * zoom) / 2 - minY * zoom
    const newTransform = { x: newX, y: newY, zoom }
    setTransform(newTransform)
    onSaveViewport(newTransform)
  }

  const cursor = (isPanning || isRightPanning) ? 'grabbing' : connectingFrom ? 'crosshair' : 'default'

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      {/* Canvas */}
      <div
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          cursor,
          backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
          backgroundSize: `${24 * transform.zoom}px ${24 * transform.zoom}px`,
          backgroundPosition: `${transform.x}px ${transform.y}px`,
          backgroundColor: 'var(--sidebar-bg)',
        }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      >
        {/* Transformed inner layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Edges SVG */}
          <EdgeLayer
            nodes={nodes}
            edges={edges}
            connectingFrom={connectingFrom}
            mousePos={mousePos}
            selectedEdgeId={selectedEdgeId}
            onDeleteEdge={onDeleteEdge}
            onSelectEdge={setSelectedEdgeId}
            onEditEdge={onEditEdge}
          />

          {/* Nodes */}
          {nodes.map(node => (
            <TreeNodeCard
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              isConnecting={!!connectingFrom}
              isConnectTarget={!!connectingFrom && connectingFrom !== node.id}
              onSelect={() => {
                if (!connectingFrom) {
                  onSelectNode(node.id)
                  setSelectedEdgeId(null)
                }
              }}
              onDragStart={() => {
                onSelectNode(node.id)
                dragInitialNodePos.current = { id: node.id, x: node.x, y: node.y }
              }}
              onDrag={(totalDx, totalDy) => {
                if (!dragInitialNodePos.current) return
                onMoveNode(
                  node.id,
                  dragInitialNodePos.current.x + totalDx / transform.zoom,
                  dragInitialNodePos.current.y + totalDy / transform.zoom
                )
              }}
              onDragEnd={() => { dragInitialNodePos.current = null }}
              onConnectHandleClick={() => handleConnectHandleClick(node.id)}
              onConnectTargetClick={() => handleConnectTargetClick(node.id)}
            />
          ))}
        </div>
      </div>

      {/* Toolbar overlay buttons */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        gap: '6px',
        zIndex: 10,
      }}>
        {connectingFrom && (
          <div style={{
            padding: '6px 12px',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            Click a node to connect · Esc to cancel
          </div>
        )}
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleFitToScreen}
          title="Fit all nodes to screen"
          style={{ fontSize: '11px' }}
        >
          Fit
        </button>
        <div style={{
          padding: '5px 10px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
        }}>
          {Math.round(transform.zoom * 100)}%
        </div>
      </div>

      {/* Edge label popup */}
      {pendingEdge && (
        <EdgeLabelPopup
          position={pendingEdge.screenPos}
          onConfirm={handleEdgeLabelConfirm}
          onCancel={() => setPendingEdge(null)}
        />
      )}
    </div>
  )
}
