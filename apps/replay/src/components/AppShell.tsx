import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { Video, Upload, PlaySquare } from 'lucide-react'
import { cn } from './ui'

export function AppShell() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { name: 'Upload Video', path: '/', icon: Upload },
    { name: 'View Videos', path: '/videos', icon: PlaySquare },
  ]

  return (
    <div className="min-h-screen bg-black-bg text-slate-200 font-sans flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-black-sidebar border-b border-black-border sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gold rounded flex items-center justify-center shadow-lg shadow-gold/20">
            <Video className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-lg font-bold tracking-tighter text-white uppercase">Albion Replay</h1>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed top-0 left-0 h-full w-64 bg-black-sidebar border-r border-black-border z-50 flex-col">
        <div className="flex items-center gap-3 p-6 mb-4">
          <div className="w-8 h-8 bg-gold rounded flex items-center justify-center shadow-lg shadow-gold/20">
            <Video className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-lg font-bold tracking-tighter text-white uppercase">Albion Replay</h1>
        </div>

        <div className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative",
                location.pathname === item.path 
                  ? "bg-gold/10 text-gold" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-black-border"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", location.pathname === item.path ? "text-gold" : "text-slate-500 group-hover:text-slate-300")} />
              <span className="font-bold text-sm uppercase tracking-wide whitespace-nowrap">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 md:ml-64 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  )
}
