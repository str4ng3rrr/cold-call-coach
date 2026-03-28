import { NavLink, Outlet } from 'react-router-dom'
import { BookOpen, BookMarked, FileText, MessageSquare } from 'lucide-react'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/lessons', label: 'Lessons', icon: BookOpen },
  { to: '/playbook', label: 'Playbook', icon: BookMarked },
  { to: '/script', label: 'Script', icon: FileText },
  { to: '/coach', label: 'Coach Chat', icon: MessageSquare },
]

export default function DashboardLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          flexShrink: 0,
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
            Cold Call Coach
          </span>
        </div>
        <nav style={{ flex: 1, padding: '12px' }}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-0.5',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} color={isActive ? '#3b82f6' : '#6b7280'} />
                  <span style={{ color: isActive ? '#3b82f6' : '#374151' }}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#ffffff',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
