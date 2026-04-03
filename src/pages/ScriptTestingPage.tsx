import { useState } from 'react'
import { useTestScripts } from '../hooks/useTestScripts'
import VersionCardList from '../components/scriptTesting/VersionCardList'
import VersionDetail from '../components/scriptTesting/VersionDetail'
import ComparisonView from '../components/scriptTesting/ComparisonView'
import CreateVersionModal from '../components/scriptTesting/CreateVersionModal'
import type { CallRecord, ScriptTreeData, TreeCallRecord } from '../types/scriptTesting'

type View =
  | { type: 'list' }
  | { type: 'detail'; scriptId: string }
  | { type: 'compare'; ids: string[] }

export default function ScriptTestingPage() {
  const {
    scripts,
    createScript,
    updateScript,
    deleteScript,
    addCall,
    deleteCall,
    addCallback,
    deleteCallback,
    updateTree,
    addTreeCall,
  } = useTestScripts()

  const [view, setView] = useState<View>({ type: 'list' })
  const [showCreateModal, setShowCreateModal] = useState(false)

  function handleCreateVersion(name: string, scriptContent: string) {
    const newScript = createScript(name, scriptContent)
    setView({ type: 'detail', scriptId: newScript.id })
  }

  function handleOpen(id: string) {
    setView({ type: 'detail', scriptId: id })
  }

  function handleCompare(ids: string[]) {
    setView({ type: 'compare', ids })
  }

  function handleDeleteSemanticId(key: string) {
    for (const script of scripts) {
      if (!script.tree) continue
      const hasMatch = script.tree.nodes.some(n => n.semanticId === key)
      if (!hasMatch) continue
      updateTree(script.id, {
        ...script.tree,
        nodes: script.tree.nodes.map(n =>
          n.semanticId === key ? { ...n, semanticId: undefined } : n
        ),
      })
    }
  }

  if (view.type === 'detail') {
    const script = scripts.find(s => s.id === view.scriptId)
    if (!script) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Version not found.{' '}
          <button className="btn btn-ghost btn-sm" onClick={() => setView({ type: 'list' })}>
            Go back
          </button>
        </div>
      )
    }
    return (
      <div style={{ height: '100%', overflow: 'hidden' }}>
        <VersionDetail
          script={script}
          onBack={() => setView({ type: 'list' })}
          onAddCall={(call: Omit<CallRecord, 'id'>) => addCall(script.id, call)}
          onDeleteCall={(callId: string) => deleteCall(script.id, callId)}
          onAddCallback={(originalCallId: string) => addCallback(script.id, originalCallId)}
          onDeleteCallback={(callbackId: string) => deleteCallback(script.id, callbackId)}
          onToggleArchive={() => updateScript(script.id, { archived: !script.archived })}
          onDelete={() => {
            deleteScript(script.id)
            setView({ type: 'list' })
          }}
          onUpdateTree={(tree: ScriptTreeData) => updateTree(script.id, tree)}
          onAddTreeCall={(call: Omit<TreeCallRecord, 'id'>) => addTreeCall(script.id, call)}
          onReplaceTreeCalls={(calls: TreeCallRecord[]) => updateScript(script.id, { treeCalls: calls })}
          onDeleteSemanticId={handleDeleteSemanticId}
        />
      </div>
    )
  }

  if (view.type === 'compare') {
    const found = view.ids.map(id => scripts.find(s => s.id === id)).filter((s): s is NonNullable<typeof s> => s !== undefined)
    if (found.length < 2) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Could not find versions to compare.{' '}
          <button className="btn btn-ghost btn-sm" onClick={() => setView({ type: 'list' })}>
            Go back
          </button>
        </div>
      )
    }
    const sortedScripts = [...found].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return (
      <div style={{ height: '100%', overflow: 'hidden' }}>
        <ComparisonView
          scripts={sortedScripts}
          onClose={() => setView({ type: 'list' })}
        />
      </div>
    )
  }

  // List view
  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <VersionCardList
        scripts={scripts}
        onOpen={handleOpen}
        onCreateNew={() => setShowCreateModal(true)}
        onToggleArchive={(id: string) => {
          const s = scripts.find(s => s.id === id)
          if (s) updateScript(id, { archived: !s.archived })
        }}
        onCompare={(ids) => handleCompare(ids)}
      />
      {showCreateModal && (
        <CreateVersionModal
          onConfirm={handleCreateVersion}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
