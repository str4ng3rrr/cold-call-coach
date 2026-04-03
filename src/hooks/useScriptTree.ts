import { useCallback } from 'react'
import type { ScriptTreeData, TreeNode, TreeEdge } from '../types/scriptTesting'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const EMPTY_TREE: ScriptTreeData = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
}

export function useScriptTree(
  tree: ScriptTreeData | undefined,
  onUpdate: (tree: ScriptTreeData) => void
) {
  const t = tree ?? EMPTY_TREE

  const addNode = useCallback((partial: Omit<TreeNode, 'id'>): TreeNode => {
    const node: TreeNode = { ...partial, id: generateId() }
    onUpdate({ ...t, nodes: [...t.nodes, node] })
    return node
  }, [t, onUpdate])

  const updateNode = useCallback((id: string, updates: Partial<Omit<TreeNode, 'id'>>) => {
    onUpdate({ ...t, nodes: t.nodes.map(n => n.id === id ? { ...n, ...updates } : n) })
  }, [t, onUpdate])

  const deleteNode = useCallback((id: string) => {
    onUpdate({
      ...t,
      nodes: t.nodes.filter(n => n.id !== id),
      edges: t.edges.filter(e => e.fromNodeId !== id && e.toNodeId !== id),
    })
  }, [t, onUpdate])

  const moveNode = useCallback((id: string, x: number, y: number) => {
    onUpdate({ ...t, nodes: t.nodes.map(n => n.id === id ? { ...n, x, y } : n) })
  }, [t, onUpdate])

  const addEdge = useCallback((partial: Omit<TreeEdge, 'id'>): TreeEdge => {
    const edge: TreeEdge = { ...partial, id: generateId() }
    onUpdate({ ...t, edges: [...t.edges, edge] })
    return edge
  }, [t, onUpdate])

  const updateEdge = useCallback((id: string, updates: Partial<Omit<TreeEdge, 'id'>>) => {
    onUpdate({ ...t, edges: t.edges.map(e => e.id === id ? { ...e, ...updates } : e) })
  }, [t, onUpdate])

  const deleteEdge = useCallback((id: string) => {
    onUpdate({ ...t, edges: t.edges.filter(e => e.id !== id) })
  }, [t, onUpdate])

  const saveViewport = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    onUpdate({ ...t, viewport })
  }, [t, onUpdate])

  const getChildren = useCallback((nodeId: string) => {
    return t.edges
      .filter(e => e.fromNodeId === nodeId)
      .map(edge => {
        const node = t.nodes.find(n => n.id === edge.toNodeId)!
        return { edge, node }
      })
      .filter(({ node }) => node != null)
  }, [t])

  const getRootNode = useCallback(() => {
    return t.nodes.find(n => n.type === 'start')
  }, [t])

  return { addNode, updateNode, deleteNode, moveNode, addEdge, updateEdge, deleteEdge, saveViewport, getChildren, getRootNode, tree: t }
}
