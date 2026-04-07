import { useState, useEffect } from 'react'
import { GitBranch } from 'lucide-react'
import type { TestScript, ScriptTreeData, TreeCallRecord, TreeNode } from '../../../types/scriptTesting'
import { useScriptTree } from '../../../hooks/useScriptTree'
import { generateId } from '../../../lib/utils'
import TreeEditorHeader from './TreeEditorHeader'
import TreeEditorCanvas from './TreeEditorCanvas'
import NodeAddToolbar from './NodeAddToolbar'
import NodeEditPanel from './NodeEditPanel'
import TreeRecordingPanel from './TreeRecordingPanel'
import TreeAnalyticsPanel from './TreeAnalyticsPanel'
import EdgeLabelPopup from './EdgeLabelPopup'
import SemanticIdManager from './SemanticIdManager'

interface Props {
  script: TestScript
  onClose: () => void
  onUpdateTree: (tree: ScriptTreeData) => void
  onAddTreeCall: (call: Omit<TreeCallRecord, 'id'>) => void
  onReplaceTreeCalls?: (calls: TreeCallRecord[]) => void
  onDeleteSemanticId?: (key: string) => void
}

type Mode = 'edit' | 'record' | 'analytics'

export default function ScriptTreeEditorOverlay({ script, onClose, onUpdateTree, onAddTreeCall, onReplaceTreeCalls, onDeleteSemanticId }: Props) {
  const [activeMode, setActiveMode] = useState<Mode>('edit')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showScript, setShowScript] = useState(false)
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [showIdManager, setShowIdManager] = useState(false)

  const treeOps = useScriptTree(script.tree, onUpdateTree)
  const { tree, addNode, updateNode, deleteNode, moveNode, addEdge, deleteEdge, updateEdge, saveViewport } = treeOps

  // Block body scroll on mount
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const selectedNode = selectedNodeId ? tree.nodes.find(n => n.id === selectedNodeId) ?? null : null
  const outgoingEdges = selectedNodeId ? tree.edges.filter(e => e.fromNodeId === selectedNodeId) : []

  const editingEdge = editingEdgeId ? tree.edges.find(e => e.id === editingEdgeId) ?? null : null

  function handleImport(treeData: ScriptTreeData, callRecords?: TreeCallRecord[]) {
    onUpdateTree(treeData)
    if (callRecords && onReplaceTreeCalls) {
      onReplaceTreeCalls(callRecords)
    }
  }

  function handleEditEdgeLabelConfirm(label: string) {
    if (!editingEdgeId) return
    updateEdge(editingEdgeId, { responseLabel: label })
    setEditingEdgeId(null)
  }

  // Compute screen center for the edge label popup when editing an existing edge
  const editingEdgePopupPos = (() => {
    if (!editingEdge) return { x: 0, y: 0 }
    const fromNode = tree.nodes.find(n => n.id === editingEdge.fromNodeId)
    const toNode = tree.nodes.find(n => n.id === editingEdge.toNodeId)
    if (!fromNode || !toNode) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  })()

  // Empty state — no tree yet
  if (!script.tree) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <TreeEditorHeader
          scriptName={script.name}
          activeMode={activeMode}
          onModeChange={setActiveMode}
          onClose={onClose}
          showScript={showScript}
          onToggleScript={() => setShowScript(s => !s)}
          onImport={handleImport}
          onOpenIdManager={() => setShowIdManager(true)}
        />
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: '40px',
        }}>
          <GitBranch size={48} strokeWidth={1.5} style={{ opacity: 0.3, color: 'var(--text-primary)' }} />
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            No pathway tree yet
          </div>
          <div style={{ fontSize: '14px', maxWidth: '340px', lineHeight: 1.6 }}>
            Create a branching tree of call steps and responses. Record calls by navigating the tree live, then view analytics on which paths work best.
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              onUpdateTree({
                nodes: [{
                  id: generateId(),
                  type: 'start',
                  label: 'Opening',
                  content: '',
                  x: 400,
                  y: 250,
                }],
                edges: [],
                viewport: { x: 0, y: 0, zoom: 1 },
              })
            }}
          >
            Create Tree
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      backgroundColor: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <TreeEditorHeader
        scriptName={script.name}
        activeMode={activeMode}
        onModeChange={mode => {
          setActiveMode(mode)
          setSelectedNodeId(null)
        }}
        onClose={onClose}
        showScript={showScript}
        onToggleScript={() => setShowScript(s => !s)}
        tree={tree}
        treeCalls={script.treeCalls}
        onImport={handleImport}
        onOpenIdManager={() => setShowIdManager(true)}
      />

      {/* Edit mode */}
      {activeMode === 'edit' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          <NodeAddToolbar
            onAddNode={(partial) => {
              const node = addNode(partial as Omit<TreeNode, 'id'>)
              setSelectedNodeId(node.id)
            }}
            viewport={tree.viewport}
          />
          <TreeEditorCanvas
            nodes={tree.nodes}
            edges={tree.edges}
            viewport={tree.viewport}
            onMoveNode={moveNode}
            onAddNode={(partial) => {
              const node = addNode(partial)
              setSelectedNodeId(node.id)
            }}
            onDeleteNode={(id) => {
              deleteNode(id)
              setSelectedNodeId(null)
            }}
            onUpdateNode={updateNode}
            onAddEdge={addEdge}
            onDeleteEdge={deleteEdge}
            onUpdateEdge={updateEdge}
            onSaveViewport={saveViewport}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onEditEdge={(edgeId) => {
              setEditingEdgeId(edgeId)
              setSelectedNodeId(null)
            }}
          />
          {selectedNode && (
            <NodeEditPanel
              node={selectedNode}
              outgoingEdges={outgoingEdges}
              allNodes={tree.nodes}
              onUpdateNode={(updates) => updateNode(selectedNode.id, updates)}
              onDeleteNode={() => {
                deleteNode(selectedNode.id)
                setSelectedNodeId(null)
              }}
              onUpdateEdge={updateEdge}
              onDeleteEdge={deleteEdge}
              onStartConnect={() => {}}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
          {editingEdge && (
            <EdgeLabelPopup
              position={editingEdgePopupPos}
              initialValue={editingEdge.responseLabel}
              onConfirm={handleEditEdgeLabelConfirm}
              onCancel={() => setEditingEdgeId(null)}
            />
          )}
        </div>
      )}

      {/* Record mode */}
      {activeMode === 'record' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Script panel (collapsible) */}
          {showScript && (
            <div style={{
              width: '320px',
              flexShrink: 0,
              borderRight: '1px solid var(--border)',
              overflow: 'auto',
              backgroundColor: 'var(--bg-card)',
              padding: '16px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Script
              </div>
              <div style={{
                fontSize: '13px',
                lineHeight: 1.7,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'var(--font-body)',
              }}>
                {script.scriptContent || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No script content.</span>}
              </div>
            </div>
          )}
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <TreeRecordingPanel
              tree={tree}
              onCallComplete={onAddTreeCall}
            />
          </div>
        </div>
      )}

      {/* Analytics mode */}
      {activeMode === 'analytics' && (
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <TreeAnalyticsPanel
            tree={tree}
            treeCalls={script.treeCalls ?? []}
          />
        </div>
      )}

      {showIdManager && (
        <SemanticIdManager
          onClose={() => setShowIdManager(false)}
          onDeleteId={(key) => {
            onDeleteSemanticId?.(key)
          }}
        />
      )}
    </div>
  )
}
