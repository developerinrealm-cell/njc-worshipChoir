import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { SocketProvider, useSocket } from './context/SocketContext'
import Library from './pages/Library'
import Controller from './pages/Controller'
import Display from './pages/Display'
import Setlists from './pages/Setlists'

function Nav() {
  const { connected } = useSocket()
  return (
    <nav style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}
      className="h-12 flex items-center px-4 gap-1 flex-shrink-0">
      <span className="font-display text-base mr-4" style={{ color: 'var(--text)', letterSpacing: '0.02em' }}>
        Worship Presenter
      </span>
      {[
        { to: '/library', label: 'Library' },
        { to: '/setlists', label: 'Setlists' },
        { to: '/controller', label: 'Controller' },
        { to: '/display', label: 'Display' },
      ].map(({ to, label }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
              isActive
                ? 'text-accent-light'
                : 'hover:bg-[var(--bg3)]'
            }`
          }
          style={({ isActive }) => ({
            background: isActive ? 'rgba(124,106,247,0.12)' : 'transparent',
            color: isActive ? 'var(--accent-light)' : 'var(--text2)'
          })}>
          {label}
        </NavLink>
      ))}
      <div className="ml-auto flex items-center gap-2">
        <div className="w-2 h-2 rounded-full transition-all"
          style={{ background: connected ? 'var(--green)' : 'var(--text3)',
            boxShadow: connected ? '0 0 6px var(--green)' : 'none' }} />
        <span className="text-xs" style={{ color: 'var(--text3)' }}>
          {connected ? 'Live' : 'Offline'}
        </span>
        <a href="/display" target="_blank" rel="noreferrer"
          className="btn ml-2 text-xs">
          Open display ↗
        </a>
      </div>
    </nav>
  )
}

function AppInner() {
  const location = useLocation()
  const isDisplay = location.pathname === '/display'
  return (
    <div className="h-full flex flex-col">
      {!isDisplay && <Nav />}
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/library" element={<Library />} />
          <Route path="/setlists" element={<Setlists />} />
          <Route path="/controller" element={<Controller />} />
          <Route path="/display" element={<Display />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <SocketProvider>
      <AppInner />
    </SocketProvider>
  )
}
