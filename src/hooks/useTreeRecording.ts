import { useReducer, useCallback, useMemo } from 'react'
import type { ScriptTreeData, TreeCallRecord } from '../types/scriptTesting'

interface TreeRecordingState {
  mode: 'idle' | 'recording' | 'notes' | 'done'
  currentNodeId: string | null
  pathNodeIds: string[]
  notes: string
  history: { nodeId: string; pathSnapshot: string[] }[]
  completedCall: Omit<TreeCallRecord, 'id'> | null
}

type TreeRecordingAction =
  | { type: 'START'; rootNodeId: string }
  | { type: 'FOLLOW_EDGE'; toNodeId: string; isTerminal: boolean }
  | { type: 'BACK' }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SAVE_NOTES' }
  | { type: 'SKIP_NOTES' }
  | { type: 'RESET' }
  | { type: 'FORCE_EXIT' }
  | { type: 'LOG_NO_CONNECTION' }

const INITIAL_STATE: TreeRecordingState = {
  mode: 'idle',
  currentNodeId: null,
  pathNodeIds: [],
  notes: '',
  history: [],
  completedCall: null,
}

function reducer(state: TreeRecordingState, action: TreeRecordingAction): TreeRecordingState {
  switch (action.type) {
    case 'START':
      return {
        ...INITIAL_STATE,
        mode: 'recording',
        currentNodeId: action.rootNodeId,
        pathNodeIds: [action.rootNodeId],
      }

    case 'FOLLOW_EDGE': {
      const newPath = [...state.pathNodeIds, action.toNodeId]
      if (action.isTerminal) {
        return {
          ...state,
          history: [...state.history, { nodeId: state.currentNodeId!, pathSnapshot: state.pathNodeIds }],
          currentNodeId: action.toNodeId,
          pathNodeIds: newPath,
          mode: 'notes',
          notes: '',
        }
      }
      return {
        ...state,
        history: [...state.history, { nodeId: state.currentNodeId!, pathSnapshot: state.pathNodeIds }],
        currentNodeId: action.toNodeId,
        pathNodeIds: newPath,
      }
    }

    case 'BACK': {
      if (state.history.length === 0) return state
      const prev = state.history[state.history.length - 1]
      return {
        ...state,
        mode: 'recording',
        currentNodeId: prev.nodeId,
        pathNodeIds: prev.pathSnapshot,
        history: state.history.slice(0, -1),
        notes: '',
      }
    }

    case 'SET_NOTES':
      return { ...state, notes: action.notes }

    case 'SAVE_NOTES':
    case 'SKIP_NOTES': {
      const notes = action.type === 'SAVE_NOTES' ? state.notes : undefined
      return {
        ...state,
        mode: 'done',
        notes: '',
        completedCall: {
          timestamp: new Date().toISOString(),
          pathNodeIds: state.pathNodeIds,
          terminalNodeId: state.currentNodeId!,
          wasBooked: false, // will be set by the component that knows the node type
          notes,
        },
      }
    }

    case 'FORCE_EXIT': {
      if (state.mode !== 'recording' || !state.currentNodeId) return state
      return {
        ...state,
        mode: 'notes',
        notes: '',
      }
    }

    case 'LOG_NO_CONNECTION': {
      if (state.mode !== 'recording' || !state.currentNodeId) return state
      return {
        ...state,
        mode: 'done',
        completedCall: {
          timestamp: new Date().toISOString(),
          pathNodeIds: [state.currentNodeId],
          terminalNodeId: state.currentNodeId,
          wasBooked: false,
          noConnection: true,
        },
      }
    }

    case 'RESET':
      return INITIAL_STATE

    default:
      return state
  }
}

export function useTreeRecording(tree: ScriptTreeData) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const nodeMap = useMemo(() => {
    return Object.fromEntries(tree.nodes.map(n => [n.id, n]))
  }, [tree.nodes])

  const currentNode = state.currentNodeId ? nodeMap[state.currentNodeId] ?? null : null

  const availableEdges = useMemo(() => {
    if (!state.currentNodeId) return []
    return tree.edges.filter(e => e.fromNodeId === state.currentNodeId)
  }, [tree.edges, state.currentNodeId])

  const start = useCallback(() => {
    const root = tree.nodes.find(n => n.type === 'start')
    if (root) dispatch({ type: 'START', rootNodeId: root.id })
  }, [tree.nodes])

  const followEdge = useCallback((edgeId: string) => {
    const edge = tree.edges.find(e => e.id === edgeId)
    if (!edge) return
    const targetNode = nodeMap[edge.toNodeId]
    if (!targetNode) return
    const isTerminal = targetNode.type === 'terminal' || targetNode.type === 'booked'
    dispatch({ type: 'FOLLOW_EDGE', toNodeId: edge.toNodeId, isTerminal })
  }, [tree.edges, nodeMap])

  const back = useCallback(() => dispatch({ type: 'BACK' }), [])
  const setNotes = useCallback((notes: string) => dispatch({ type: 'SET_NOTES', notes }), [])
  const saveNotes = useCallback(() => dispatch({ type: 'SAVE_NOTES' }), [])
  const skipNotes = useCallback(() => dispatch({ type: 'SKIP_NOTES' }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])
  const forceExit = useCallback(() => dispatch({ type: 'FORCE_EXIT' }), [])
  const logNoConnection = useCallback(() => dispatch({ type: 'LOG_NO_CONNECTION' }), [])

  // Build completedCall with wasBooked set correctly
  const completedCall = useMemo(() => {
    if (!state.completedCall) return null
    const terminalNode = nodeMap[state.completedCall.terminalNodeId]
    return {
      ...state.completedCall,
      wasBooked: terminalNode?.type === 'booked',
    }
  }, [state.completedCall, nodeMap])

  return {
    state,
    currentNode,
    availableEdges,
    start,
    followEdge,
    back,
    setNotes,
    saveNotes,
    skipNotes,
    reset,
    forceExit,
    logNoConnection,
    isDone: state.mode === 'done',
    completedCall,
  }
}
