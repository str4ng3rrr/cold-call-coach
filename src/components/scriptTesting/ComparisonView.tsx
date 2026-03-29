import { X } from 'lucide-react'
import ScriptDiff from './ScriptDiff'
import FunnelAnalytics from './FunnelAnalytics'
import FunnelBar from './FunnelBar'
import { computeAnalytics } from './FunnelAnalytics'
import type { TestScript } from '../../types/scriptTesting'

interface ComparisonViewProps {
  scriptA: TestScript
  scriptB: TestScript
  onClose: () => void
}

export default function ComparisonView({ scriptA, scriptB, onClose }: ComparisonViewProps) {
  const statsA = computeAnalytics(scriptA)
  const statsB = computeAnalytics(scriptB)

  const maxCalls = Math.max(statsA.total, statsB.total, 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-card)',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Comparing Versions
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {scriptA.name} vs {scriptB.name}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Side-by-side summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { script: scriptA, stats: statsA, color: 'var(--danger)', label: 'A' },
            { script: scriptB, stats: statsB, color: '#1a6b3e', label: 'B' },
          ].map(({ script, stats, color, label }) => (
            <div key={script.id} style={{
              backgroundColor: 'var(--bg-card)',
              border: `2px solid ${color}`,
              borderRadius: 'var(--radius-md)',
              padding: '16px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Version {label}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                {script.name}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Total', value: stats.total },
                  { label: 'Booked', value: stats.booked },
                  { label: 'Book Rate', value: `${stats.bookingRate}%` },
                  { label: 'Connect Rate', value: `${stats.connectionRate}%` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Side-by-side funnel comparison */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
            Funnel Comparison
          </div>
          {[
            { label: 'Total Calls', a: statsA.total, b: statsB.total },
            { label: 'Connected', a: statsA.connected, b: statsB.connected },
            { label: 'Reached Owner', a: statsA.reachedOwner, b: statsB.reachedOwner },
            { label: 'Booked', a: statsA.booked, b: statsB.booked },
          ].map(({ label, a, b }) => (
            <div key={label} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <FunnelBar label="A" count={a} total={maxCalls} color="var(--danger)" />
                <FunnelBar label="B" count={b} total={maxCalls} color="#1a6b3e" />
              </div>
            </div>
          ))}
        </div>

        {/* Script diff */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Script Diff
          </div>
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <ScriptDiff
              textA={scriptA.scriptContent}
              nameA={scriptA.name}
              textB={scriptB.scriptContent}
              nameB={scriptB.name}
            />
          </div>
        </div>

        {/* Full analytics side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Version A — {scriptA.name}
            </div>
            <FunnelAnalytics script={scriptA} accentColor="var(--danger)" />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a6b3e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Version B — {scriptB.name}
            </div>
            <FunnelAnalytics script={scriptB} accentColor="#1a6b3e" />
          </div>
        </div>
      </div>
    </div>
  )
}
