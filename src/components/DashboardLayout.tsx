import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, BookMarked, FileText, MessageSquare, Briefcase, FlaskConical, Menu, X, ChevronLeft, ChevronRight, Phone } from 'lucide-react'
import KeyboardShortcuts from './KeyboardShortcuts'
import PageTransition from './PageTransition'

const navItems = [
  { to: '/lessons', label: 'Lessons', icon: BookOpen, shortcut: '1' },
  { to: '/playbook', label: 'Playbook', icon: BookMarked, shortcut: '2' },
  { to: '/script', label: 'Script', icon: FileText, shortcut: '3' },
  { to: '/coach', label: 'Coach Chat', icon: MessageSquare, shortcut: '4' },
  { to: '/offer', label: 'My Offer', icon: Briefcase, shortcut: '5' },
  { to: '/testing', label: 'Testing', icon: FlaskConical, shortcut: '6' },
]

const pageLabels: Record<string, string> = {
  '/lessons': 'Lessons',
  '/playbook': 'Playbook',
  '/script': 'Script',
  '/coach': 'Coach Chat',
  '/offer': 'My Offer',
  '/testing': 'Script Testing',
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const pageLabel = pageLabels[location.pathname] ?? 'Cold Call Coach'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <KeyboardShortcuts />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)',
            zIndex: 40, display: 'none',
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`dashboard-sidebar${sidebarOpen ? ' sidebar-open' : ''}${collapsed ? ' sidebar-collapsed' : ''}`}
        style={{
          width: collapsed ? '56px' : '240px',
          flexShrink: 0,
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.22s ease',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: collapsed ? '16px 0' : '20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            position: 'relative',
            flexShrink: 0,
            minHeight: '64px',
          }}
        >
          {collapsed ? (
            <Phone size={20} color="var(--accent)" />
          ) : (
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
              Cold Call Coach
            </span>
          )}
          {/* Mobile close btn */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="sidebar-close-btn"
            aria-label="Close sidebar"
            style={{
              display: 'none',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px', color: 'var(--text-muted)',
            }}
          >
            <X size={18} />
          </button>
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="sidebar-collapse-btn"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              position: 'absolute',
              top: '50%',
              right: collapsed ? '50%' : '8px',
              transform: collapsed ? 'translate(50%, -50%)' : 'translateY(-50%)',
              background: 'var(--sidebar-bg)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--text-muted)',
              zIndex: 10,
              transition: 'right 0.22s ease, transform 0.22s ease',
            }}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>
        <nav style={{ flex: 1, padding: collapsed ? '12px 0' : '12px' }}>
          {navItems.map(({ to, label, icon: Icon, shortcut }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? label : undefined}
              style={({ isActive }) => ({
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '10px',
                padding: collapsed ? '10px 0' : '8px 12px',
                borderRadius: collapsed ? 0 : '6px',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '2px',
                transition: 'background-color 0.12s, color 0.12s',
                backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} color={isActive ? 'var(--accent)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flex: 1 }}>{label}</span>
                      <span
                        className="nav-shortcut-hint"
                        style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.5 }}
                      >
                        Ctrl+Shift+{shortcut}
                      </span>
                    </>
                  )}
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
          overflow: 'hidden',
          backgroundColor: 'var(--bg)',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mobile header bar */}
        <div
          className="mobile-header"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '12px',
            padding: '0 16px',
            height: '56px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--sidebar-bg)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px', color: 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.2, fontWeight: 400 }}>
              Cold Call Coach
            </span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {pageLabel}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>

      <style>{`
        .nav-link-item:hover {
          background-color: var(--accent-light) !important;
        }
        .sidebar-collapse-btn:hover {
          background-color: var(--accent-light) !important;
          color: var(--accent) !important;
        }
        .sidebar-collapsed .sidebar-collapse-btn {
          right: 50% !important;
          transform: translate(50%, -50%) !important;
        }
        @media (max-width: 640px) {
          .dashboard-sidebar {
            position: fixed !important;
            top: 0; left: 0; bottom: 0;
            z-index: 50;
            transform: translateX(-100%);
            transition: transform 0.22s ease;
            width: 240px !important;
          }
          .dashboard-sidebar.sidebar-open {
            transform: translateX(0);
          }
          .mobile-overlay {
            display: block !important;
          }
          .mobile-header {
            display: flex !important;
          }
          .sidebar-close-btn {
            display: block !important;
          }
          .sidebar-collapse-btn {
            display: none !important;
          }
          .nav-shortcut-hint {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
