import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Guilds from './pages/Guilds';
import Regear from './pages/Regear';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Settings from './pages/Settings';
import { LogOut, User as UserIcon, LayoutDashboard, Shield, Sword, ChevronLeft, ChevronRight, Languages, Settings as SettingsIcon } from 'lucide-react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-black-bg text-gold">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: t('common.dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('common.guilds'), path: '/guilds', icon: Shield },
    { name: t('common.regear'), path: '/regear', icon: Sword },
    { name: t('common.profile'), path: '/profile', icon: UserIcon },
    { name: t('common.settings'), path: '/settings', icon: SettingsIcon },
  ];

  if (isAdmin) {
    navItems.push({ name: t('common.admin'), path: '/admin', icon: Shield });
  }

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(nextLang);
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    localStorage.removeItem('albion_erp_token');
    window.dispatchEvent(new Event('storage'));
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-black-bg text-slate-200 font-sans flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-black-sidebar border-b border-black-border sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gold rounded flex items-center justify-center shadow-lg shadow-gold/20">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-lg font-bold tracking-tighter text-white uppercase">Albion ERP</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-gold transition-colors"
        >
          <div className="w-6 h-5 relative flex flex-col justify-between">
            <motion.span 
              animate={isMobileMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
              className="w-full h-0.5 bg-current rounded-full"
            />
            <motion.span 
              animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
              className="w-full h-0.5 bg-current rounded-full"
            />
            <motion.span 
              animate={isMobileMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
              className="w-full h-0.5 bg-current rounded-full"
            />
          </div>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[55] md:hidden"
            />
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-black-sidebar border-r border-black-border z-[56] p-6 flex flex-col md:hidden"
            >
              <div className="flex items-center gap-3 mb-10">
                <div className="w-8 h-8 bg-gold rounded flex items-center justify-center shadow-lg shadow-gold/20">
                  <Shield className="w-5 h-5 text-black" />
                </div>
                <h1 className="text-lg font-bold tracking-tighter text-white uppercase">Albion ERP</h1>
              </div>

              <div className="flex-1 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileMenu}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      location.pathname === item.path 
                        ? "bg-gold/10 text-gold" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-black-border"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-wide">{item.name}</span>
                  </Link>
                ))}
              </div>

              <div className="pt-6 border-t border-black-border space-y-2">
                <button
                  onClick={toggleLanguage}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-gold hover:bg-black-border transition-all"
                >
                  <Languages className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase tracking-wide">{i18n.language.startsWith('zh') ? 'English' : '中文'}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-gold hover:bg-black-border transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase tracking-wide">{t('common.logout')}</span>
                </button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.nav 
        animate={{ width: isCollapsed ? 80 : 256 }}
        className="hidden md:flex fixed top-0 left-0 h-full bg-black-sidebar border-r border-black-border z-50 flex-col transition-all duration-300"
      >
        <div className="flex items-center justify-between p-4 mb-8">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3 px-2"
              >
                <div className="w-8 h-8 bg-gold rounded flex items-center justify-center shadow-lg shadow-gold/20">
                  <Shield className="w-5 h-5 text-black" />
                </div>
                <h1 className="text-lg font-bold tracking-tighter text-white uppercase">Albion ERP</h1>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-black-border rounded-lg text-slate-400 hover:text-gold transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
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
              {!isCollapsed && <span className="font-bold text-sm uppercase tracking-wide">{item.name}</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-black-card border border-black-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.name}
                </div>
              )}
            </Link>
          ))}
        </div>

        <div className="mt-auto p-3 border-t border-black-border">
          <button
            onClick={toggleLanguage}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:text-gold hover:bg-black-border transition-all duration-200 group relative",
              isCollapsed && "justify-center"
            )}
          >
            <Languages className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-bold text-sm uppercase tracking-wide">{i18n.language.startsWith('zh') ? 'English' : '中文'}</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-black-card border border-black-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {i18n.language.startsWith('zh') ? 'English' : '中文'}
              </div>
            )}
          </button>

          {user && (
            <div className="mt-2 space-y-1">
              {!isCollapsed && (
                <div className="flex items-center gap-3 px-3 py-4 mb-2">
                  <div className="w-8 h-8 rounded bg-black-border flex items-center justify-center text-gold font-bold border border-gold/20">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{user.email}</p>
                    <p className="text-[10px] text-gold font-bold uppercase tracking-widest">{profile?.role || 'User'}</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:text-gold hover:bg-black-border transition-all duration-200 group relative",
                  isCollapsed && "justify-center"
                )}
              >
                <LogOut className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="font-bold text-sm uppercase tracking-wide">{t('common.logout')}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-black-card border border-black-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {t('common.logout')}
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-4 md:p-8 transition-all duration-300", 
        "md:ml-0", // Default
        !isCollapsed ? "md:ml-64" : "md:ml-20"
      )}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/guilds" element={<ProtectedRoute><Layout><Guilds /></Layout></ProtectedRoute>} />
        <Route path="/regear" element={<ProtectedRoute><Layout><Regear /></Layout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Layout><Admin /></Layout></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
