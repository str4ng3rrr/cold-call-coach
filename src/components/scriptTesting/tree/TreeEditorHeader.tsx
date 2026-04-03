import { useRef, useState } from 'react'
import { Tag } from 'lucide-react'
import type { ScriptTreeData, TreeCallRecord } from '../../../types/scriptTesting'

interface TreeExport {
  version: 1
  exportedAt: string
  treeData: ScriptTreeData
  callRecords?: TreeCallRecord[]
}

interface Props {
  scriptName: string
  activeMode: 'edit' | 'record' | 'analytics'
  onModeChange: (mode: 'edit' | 'record' | 'analytics') => void
  onClose: () => void
  showScript?: boolean
  onToggleScript?: () => void
  tree?: ScriptTreeData
  treeCalls?: TreeCallRecord[]
  onImport?: (treeData: ScriptTreeData, callRecords?: TreeCallRecord[]) => void
  onOpenIdManager?: () => void
}

const MODES: { id: 'edit' | 'record' | 'analytics'; label: string }[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'record', label: 'Record' },
  { id: 'analytics', label: 'Analytics' },
]

export default function TreeEditorHeader({
  scriptName,
  activeMode,
  onModeChange,
  onClose,
  showScript,
  onToggleScript,
  tree,
  treeCalls,
  onImport,
  onOpenIdManager,
}: Props) {
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportIncludeCalls, setExportIncludeCalls] = useState(false)
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showStatus(type: 'success' | 'error', message: string) {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    setImportStatus({ type, message })
    statusTimerRef.current = setTimeout(() => setImportStatus(null), 3000)
  }

  function handleExport() {
    if (!tree) return
    const payload: TreeExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      treeData: tree,
      ...(exportIncludeCalls && treeCalls ? { callRecords: treeCalls } : {}),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${scriptName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-tree.json`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportModal(false)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as TreeExport
        if (
          !parsed.treeData ||
          !Array.isArray(parsed.treeData.nodes) ||
          !Array.isArray(parsed.treeData.edges)
        ) {
          showStatus('error', 'Invalid file: missing nodes or edges.')
          return
        }
        onImport?.(parsed.treeData, parsed.callRecords)
        showStatus('success', 'Tree imported successfully.')
      } catch {
        showStatus('error', 'Failed to parse JSON file.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-card)',
        flexShrink: 0,
        height: '48px',
        gap: '16px',
      }}>
        {/* Script name */}
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          flexShrink: 0,
          maxWidth: '220px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {scriptName}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
            · Pathway Tree
          </span>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              style={{
                padding: '6px 16px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activeMode === mode.id ? 'var(--accent)' : 'transparent',
                color: activeMode === mode.id ? '#fff' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => {
                if (activeMode !== mode.id) {
                  e.currentTarget.style.backgroundColor = 'var(--sidebar-bg)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (activeMode !== mode.id) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Import status message */}
          {importStatus && (
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: importStatus.type === 'success' ? 'var(--success)' : 'var(--danger)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: importStatus.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
              border: `1px solid ${importStatus.type === 'success' ? 'var(--success)' : 'var(--danger-border)'}`,
            }}>
              {importStatus.message}
            </span>
          )}

          {/* Semantic ID Manager button */}
          {onOpenIdManager && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={onOpenIdManager}
              title="Manage Semantic IDs"
              style={{ padding: '4px 8px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
            >
              <Tag size={14} />
            </button>
          )}

          {/* Export button */}
          {tree && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowExportModal(true)}
              title="Export tree"
              style={{ fontSize: '14px', padding: '4px 8px', lineHeight: 1 }}
            >
              ↓
            </button>
          )}

          {/* Import button */}
          {onImport && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => fileInputRef.current?.click()}
                title="Import tree"
                style={{ fontSize: '14px', padding: '4px 8px', lineHeight: 1 }}
              >
                ↑
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
            </>
          )}

          {/* Script panel toggle — only shown in record mode */}
          {activeMode === 'record' && onToggleScript && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={onToggleScript}
              title={showScript ? 'Hide script panel' : 'Show script panel'}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: showScript ? 'var(--accent)' : 'var(--text-muted)',
                padding: '4px 10px',
              }}
            >
              Script {showScript ? '◀' : '▶'}
            </button>
          )}

          {/* Close button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            title="Close"
            style={{ fontSize: '18px', lineHeight: 1, padding: '4px 8px' }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Export modal */}
      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 400,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              minWidth: '300px',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Export Tree
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                <input
                  type="radio"
                  name="exportType"
                  checked={!exportIncludeCalls}
                  onChange={() => setExportIncludeCalls(false)}
                />
                Tree structure only (nodes + edges)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                <input
                  type="radio"
                  name="exportType"
                  checked={exportIncludeCalls}
                  onChange={() => setExportIncludeCalls(true)}
                />
                Tree + call records (full analytics history)
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleExport}>
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
