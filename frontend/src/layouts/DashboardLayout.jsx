import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  UploadCloud,
  BarChart3,
  Camera,
  AlertTriangle,
  ShieldCheck,
  FileText,
  UserCog,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  Search,
  ChevronRight
} from 'lucide-react'

export default function DashboardLayout() {
  const { user, logout, theme, toggleTheme, isAdmin } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Training Centres', path: '/centres', icon: Building2 },
    { name: 'Students', path: '/students', icon: Users },
    { name: 'Trainers', path: '/trainers', icon: GraduationCap },
    { name: 'Attendance Upload', path: '/attendance/upload', icon: UploadCloud },
    { name: 'Attendance Analytics', path: '/attendance/analytics', icon: BarChart3 },
    { name: 'Infrastructure Inspection', path: '/infrastructure', icon: Camera },
    { name: 'Anomaly Detection', path: '/anomalies', icon: AlertTriangle, badge: '4' },
    { name: 'Compliance Reports', path: '/compliance', icon: ShieldCheck },
    { name: 'PDF Reports', path: '/reports', icon: FileText },
  ]

  if (isAdmin()) {
    navItems.push({ name: 'User Management', path: '/users', icon: UserCog })
  }

  navItems.push(
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'User Profile', path: '/profile', icon: User }
  )

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="h-9 w-9 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold shadow-md shadow-primary-600/30 flex-shrink-0">
              TG
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white leading-none">
                  TrainGuard<span className="text-primary-600 ml-1">AI</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase mt-1">
                  Supabase Powered
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                {sidebarOpen && <span className="truncate">{item.name}</span>}
                {sidebarOpen && item.badge && (
                  <span className="ml-auto bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 text-xs px-2 py-0.5 rounded-full font-bold">
                    {item.badge}
                  </span>
                )}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50 shadow-lg">
                    {item.name}
                  </div>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User Card at bottom of sidebar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className={`flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'}`}>
            <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300">
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {user?.full_name || 'TrainGuard User'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate capitalize">
                  {user?.role ? user.role.replace('_', ' ') : 'Administrator'}
                </p>
              </div>
            )}
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden md:block w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search centres, batches, students..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition relative"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Alerts</span>
                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">4 Anomalies</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                      <p className="font-semibold text-red-600 dark:text-red-400">Critical: Identical Pattern Detected</p>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">Radiant Career Institute (TC-105) - 18 students matching 5 consecutive days.</p>
                    </div>
                    <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                      <p className="font-semibold text-amber-600 dark:text-amber-400">High: Sudden Attendance Drop</p>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">Pioneer Vocational (TC-103) - 38% drop in Batch BAT-03-01.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Centre Badge for Managers */}
            {user?.centre_id && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Centre ID: {user.centre_id.slice(0, 8)}...
              </span>
            )}
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
