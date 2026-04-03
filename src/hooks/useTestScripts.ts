import { useState, useCallback } from 'react'
import { StorageKeys, loadJSON, saveJSON } from '../lib/storage'
import type { TestScript, CallRecord, CallbackRecord, ScriptTreeData, TreeCallRecord } from '../types/scriptTesting'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function load(): TestScript[] {
  return loadJSON<TestScript[]>(StorageKeys.TestScripts, [])
}

function persist(scripts: TestScript[]) {
  saveJSON(StorageKeys.TestScripts, scripts)
}

export function useTestScripts() {
  const [scripts, setScripts] = useState<TestScript[]>(load)

  const refresh = useCallback(() => {
    setScripts(load())
  }, [])

  const createScript = useCallback((name: string, scriptContent: string): TestScript => {
    const newScript: TestScript = {
      id: generateId(),
      name,
      scriptContent,
      createdAt: new Date().toISOString(),
      archived: false,
      calls: [],
      callbacks: [],
    }
    setScripts(prev => {
      const next = [...prev, newScript]
      persist(next)
      return next
    })
    return newScript
  }, [])

  const updateScript = useCallback((id: string, updates: Partial<Pick<TestScript, 'name' | 'archived' | 'tree' | 'treeCalls'>>) => {
    setScripts(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updates } : s)
      persist(next)
      return next
    })
  }, [])

  const deleteScript = useCallback((id: string) => {
    setScripts(prev => {
      const next = prev.filter(s => s.id !== id)
      persist(next)
      return next
    })
  }, [])

  const addCall = useCallback((scriptId: string, call: Omit<CallRecord, 'id'>) => {
    const newCall: CallRecord = { ...call, id: generateId() }
    setScripts(prev => {
      const next = prev.map(s =>
        s.id === scriptId
          ? { ...s, calls: [...s.calls, newCall] }
          : s
      )
      persist(next)
      return next
    })
    return newCall
  }, [])

  const deleteCall = useCallback((scriptId: string, callId: string) => {
    setScripts(prev => {
      const next = prev.map(s =>
        s.id === scriptId
          ? { ...s, calls: s.calls.filter(c => c.id !== callId) }
          : s
      )
      persist(next)
      return next
    })
  }, [])

  const addCallback = useCallback((scriptId: string, originalCallId: string) => {
    const newCallback: CallbackRecord = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      originalCallId,
    }
    setScripts(prev => {
      const next = prev.map(s =>
        s.id === scriptId
          ? { ...s, callbacks: [...s.callbacks, newCallback] }
          : s
      )
      persist(next)
      return next
    })
    return newCallback
  }, [])

  const deleteCallback = useCallback((scriptId: string, callbackId: string) => {
    setScripts(prev => {
      const next = prev.map(s =>
        s.id === scriptId
          ? { ...s, callbacks: s.callbacks.filter(c => c.id !== callbackId) }
          : s
      )
      persist(next)
      return next
    })
  }, [])

  const updateTree = useCallback((scriptId: string, tree: ScriptTreeData) => {
    setScripts(prev => {
      const next = prev.map(s => s.id === scriptId ? { ...s, tree } : s)
      persist(next)
      return next
    })
  }, [])

  const addTreeCall = useCallback((scriptId: string, call: Omit<TreeCallRecord, 'id'>) => {
    const newCall: TreeCallRecord = { ...call, id: generateId() }
    setScripts(prev => {
      const next = prev.map(s =>
        s.id === scriptId
          ? { ...s, treeCalls: [...(s.treeCalls ?? []), newCall] }
          : s
      )
      persist(next)
      return next
    })
    return newCall
  }, [])

  const deleteTreeCall = useCallback((scriptId: string, callId: string) => {
    setScripts(prev => {
      const next = prev.map(s =>
        s.id === scriptId
          ? { ...s, treeCalls: (s.treeCalls ?? []).filter(c => c.id !== callId) }
          : s
      )
      persist(next)
      return next
    })
  }, [])

  return {
    scripts,
    refresh,
    createScript,
    updateScript,
    deleteScript,
    addCall,
    deleteCall,
    addCallback,
    deleteCallback,
    updateTree,
    addTreeCall,
    deleteTreeCall,
  }
}
