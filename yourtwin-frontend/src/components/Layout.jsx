import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Code,
  BarChart3,
  Brain,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Activity,
  Menu,
  Maximize,
  Minimize
} from 'lucide-react';

// Navigation items for students
const studentNavItems = [
  { path: '/student/dashboard', label: 'Dashboard', icon: Home },
  { path: '/student/progress', label: 'Progress', icon: BarChart3 },
  { path: '/student/twin', label: 'Digital Twin', icon: Brain },
  { path: '/student/sandbox', label: 'Sandbox', icon: Code },
];

// Navigation items for instructors
const instructorNavItems = [
  { path: '/instructor/dashboard', label: 'Dashboard', icon: Home },
  { path: '/instructor/lab-sessions', label: 'Lab Sessions', icon: Calendar },
  { path: '/instructor/analytics', label: 'Analytics', icon: Activity },
];

function Layout({ children, showSidebar = true, fullWidth = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get navigation items based on role
  const navItems = user?.role === 'instructor' ? instructorNavItems : studentNavItems;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/student/dashboard' || path === '/instructor/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  if (!showSidebar) {
    return <div className="min-h-screen bg-[#1e1e2e]">{children}</div>;
  }

  const sidebarWidth = collapsed ? 'w-16' : 'w-56';
  const sidebarMargin = collapsed ? 'lg:ml-16' : 'lg:ml-56';

  return (
    <div className="min-h-screen bg-[#1e1e2e]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Fixed on all screen sizes */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 ${sidebarWidth} bg-[#181825] border-r border-[#313244] flex flex-col transition-all duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className={`h-20 flex items-center border-b border-[#313244] ${collapsed ? 'justify-center px-3' : 'px-4'}`}>
          {collapsed ? (
            <img src="/logo.png" alt="YOURTWIN" className="h-14 object-contain" />
          ) : (
            <img src="/header.png" alt="YOURTWIN" className="h-14 object-contain" />
          )}
        </div>

        {/* User Info (collapsed shows avatar only) */}
        <div className={`border-b border-[#313244] ${collapsed ? 'py-4 px-3' : 'p-4'}`}>
          {collapsed ? (
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-[#89b4fa] to-[#cba6f7] flex items-center justify-center text-[#1e1e2e] font-bold text-base">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#89b4fa] to-[#cba6f7] flex items-center justify-center text-[#1e1e2e] font-bold text-sm flex-shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-[#cdd6f4] truncate">
                  {user?.lastName}, {user?.firstName}
                </p>
                <p className="text-sm text-[#6c7086] truncate">
                  {user?.role === 'instructor' ? 'Instructor' : `${user?.course || ''} ${user?.yearLevel || ''}-${user?.section || ''}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base transition-colors ${
                      active
                        ? 'bg-[#89b4fa]/20 text-[#89b4fa]'
                        : 'text-[#a6adc8] hover:bg-[#313244] hover:text-[#cdd6f4]'
                    } ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="w-6 h-6 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-[#313244] py-3 px-3 space-y-1">
          {/* Fullscreen Toggle - Above Settings */}
          <button
            onClick={toggleFullscreen}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base transition-colors ${
              isFullscreen
                ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]'
                : 'text-[#a6adc8] hover:bg-[#313244] hover:text-[#cdd6f4]'
            } ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? (isFullscreen ? 'Exit Fullscreen' : 'Fullscreen') : undefined}
          >
            {isFullscreen ? (
              <Minimize className="w-6 h-6 flex-shrink-0" />
            ) : (
              <Maximize className="w-6 h-6 flex-shrink-0" />
            )}
            {!collapsed && <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>}
          </button>
          <button
            onClick={() => navigate(user?.role === 'instructor' ? '/instructor/profile/edit' : '/student/profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base text-[#a6adc8] hover:bg-[#313244] hover:text-[#cdd6f4] transition-colors ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings className="w-6 h-6 flex-shrink-0" />
            {!collapsed && <span>Settings</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base text-[#f38ba8] hover:bg-[#f38ba8]/10 transition-colors ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-6 h-6 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-[#313244] border border-[#45475a] rounded-full items-center justify-center text-[#a6adc8] hover:text-[#cdd6f4] hover:bg-[#45475a] transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Content - offset by sidebar width */}
      <div className={`min-h-screen flex flex-col ${sidebarMargin} transition-all duration-200`}>
        {/* Top Bar (mobile) */}
        <header className="lg:hidden h-16 bg-[#181825] border-b border-[#313244] flex items-center justify-between px-4 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 hover:bg-[#313244] rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-[#cdd6f4]" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/header.png" alt="YOURTWIN" className="h-12" />
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-[#313244] rounded-lg transition-colors"
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5 text-[#a6e3a1]" />
            ) : (
              <Maximize className="w-5 h-5 text-[#cdd6f4]" />
            )}
          </button>
        </header>

        {/* Page Content */}
        <main className={`flex-1 ${fullWidth ? '' : 'p-5 lg:p-8'}`}>
          <div className={fullWidth ? 'h-full' : 'max-w-7xl mx-auto'}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
