import { useState, useCallback } from 'react'
import { StorageKeys, loadJSON, saveJSON } from '../lib/storage'

export interface CustomSemanticId {
  key: string
  label: string
}

function load(): CustomSemanticId[] {
  return loadJSON<CustomSemanticId[]>(StorageKeys.CustomSemanticIds, [])
}

function persist(ids: CustomSemanticId[]) {
  saveJSON(StorageKeys.CustomSemanticIds, ids)
}

export function useCustomSemanticIds() {
  const [customIds, setCustomIds] = useState<CustomSemanticId[]>(load)

  const addId = useCallback((label: string): string => {
    const slug = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const key = 'custom_' + slug + '_' + Date.now().toString(36)
    const entry: CustomSemanticId = { key, label }
    setCustomIds(prev => {
      const next = [...prev, entry]
      persist(next)
      return next
    })
    return key
  }, [])

  const updateId = useCallback((key: string, newLabel: string) => {
    setCustomIds(prev => {
      const next = prev.map(id => id.key === key ? { ...id, label: newLabel } : id)
      persist(next)
      return next
    })
  }, [])

  const deleteId = useCallback((key: string) => {
    setCustomIds(prev => {
      const next = prev.filter(id => id.key !== key)
      persist(next)
      return next
    })
  }, [])

  return { customIds, addId, updateId, deleteId }
}
