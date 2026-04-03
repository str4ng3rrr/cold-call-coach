import { useState } from 'react'
import { X, FileText, BarChart2, GitBranch } from 'lucide-react'
import ScriptDiff from './ScriptDiff'
import FunnelAnalytics from './FunnelAnalytics'
import ComparisonSidebar from './ComparisonSidebar'
import TreeCompareView from './tree/TreeCompareView'
import TreeAnalyticsPanel from './tree/TreeAnalyticsPanel'
import type { TestScript } from '../../types/scriptTesting'

type CompareTab = 'script' | 'analytics' | 'tree'

interface ComparisonViewProps {
  scripts: TestScript[]
  onClose: () => void
}

const VERSION_COLORS = [
  'var(--danger)',
  '#1a6b3e',
  'var(--accent)',
  '#d4850a',
]

const tabs: { id: CompareTab; label: string; Icon: typeof FileText }[] = [
  { id: 'script', label: 'Script Diff', Icon: FileText },
  { id: 'analytics', label: 'Analytics', Icon: BarChart2 },
  { id: 'tree', label: 'Tree Compare', Icon: GitBranch },
]

export default function ComparisonView({ scripts, onClose }: ComparisonViewProps) {
  const [activeTab, setActiveTab] = useState<CompareTab>('script')

  // scripts is already sorted oldest-first from ScriptTestingPage
  const oldest = scripts[0]
  const newest = scripts[scripts.length - 1]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-card)',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {scripts.length === 2 ? 'A/B Comparison' : `${scripts.length}-Version Comparison`}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            {scripts.map((s, i) => (
              <span key={s.id}>
                <span style={{ color: VERSION_COLORS[i % VERSION_COLORS.length], fontWeight: 600 }}>{s.name}</span>
                {i < scripts.length - 1 && <span style={{ marginLeft: '4px' }}>vs</span>}
              </span>
            ))}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <X size={16} />
          Close
        </button>
      </div>

      {/* Main body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Comparison sidebar - only when analytics tab active */}
        <div style={{
          width: activeTab === 'analytics' ? '200px' : '0px',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          flexShrink: 0,
        }}>
          <ComparisonSidebar scripts={scripts} />
        </div>

        {/* Content area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>
          {activeTab === 'script' && (
            <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
              {scripts.length > 2 && (
                <div style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--bg-card)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}>
                  Showing diff for <strong>{oldest.name}</strong> → <strong>{newest.name}</strong>
                </div>
              )}
              <ScriptDiff
                textA={oldest.scriptContent}
                nameA={oldest.name}
                textB={newest.scriptContent}
                nameB={newest.name}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ flex: 1, overflow: 'auto', minWidth: 0, display: 'flex' }}>
              {scripts.map((script, i) => (
                <div
                  key={script.id}
                  style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '16px',
                    borderRight: i < scripts.length - 1 ? '1px solid var(--border)' : undefined,
                    minWidth: 0,
                  }}
                >
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: VERSION_COLORS[i % VERSION_COLORS.length],
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '12px',
                  }}>
                    {String.fromCharCode(65 + i)} — {script.name}
                  </div>
                  {script.tree && (script.treeCalls?.length ?? 0) > 0 ? (
                    <TreeAnalyticsPanel tree={script.tree} treeCalls={script.treeCalls ?? []} />
                  ) : (
                    <>
                      <FunnelAnalytics script={script} accentColor={VERSION_COLORS[i % VERSION_COLORS.length]} />
                      <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Using tally data
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tree' && (
            <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
              <TreeCompareView scripts={scripts} />
            </div>
          )}
        </div>

        {/* Vertical tab bar - far right */}
        <div style={{
          width: '48px',
          flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '8px',
          gap: '4px',
        }}>
          {tabs.map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                title={label}
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'background-color 0.12s',
                }}
              >
                <Icon size={16} color={isActive ? 'var(--accent)' : 'var(--text-muted)'} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
