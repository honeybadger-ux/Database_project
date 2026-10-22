import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Truck,
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  Search,
  User,
  Shield,
  ChevronRight,
  ExternalLink,
  Layers,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export const Layout = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCourierAdmin = user?.role === 'COURIER_ADMIN';
  const isManager = ['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER'].includes(user?.role);

  const navItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Parcels', to: '/parcels', icon: Package },
    { name: 'Shipments', to: '/shipments', icon: Truck },
  ];

  const adminNavItems = [
    { name: 'Admin Overview', to: '/admin', icon: Shield },
    { name: 'Hub Network', to: '/admin/hubs', icon: Building2 },
    { name: 'Workforce & Roles', to: '/admin/employees', icon: Users },
    { name: 'Analytics Intelligence', to: '/admin/analytics', icon: BarChart3 },
  ];

  if (isSuperAdmin) {
    adminNavItems.unshift({ name: 'Platform Governance', to: '/super-admin', icon: Shield });
  }

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500/15 selection:text-indigo-900">
      {/* Top Frosted Glass Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Mobile hamburger & Logo */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                  <Package className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                      Courier<span className="text-indigo-600">Track</span>
                    </span>
                    {user?.courier_name ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {user.courier_name}
                      </span>
                    ) : isSuperAdmin ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Super Platform Admin
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400 mt-1 hidden sm:block">
                    Multi-Tenant Logistics Aggregator SaaS
                  </span>
                </div>
              </Link>
            </div>

            {/* Right side navigation & user profile */}
              {isSuperAdmin && (
                <Link
                  to="/super-admin"
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    location.pathname === '/super-admin'
                      ? 'bg-purple-600 text-white shadow-xs font-bold'
                      : 'text-purple-700 hover:bg-purple-50'
                  }`}
                  title="Platform Owner Governance Console"
                >
                  <span>🛡️ Super Admin</span>
                </Link>
              )}
            </div>

            {/* Right: Actions / Auth Profiles */}
            {!isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className={`text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${
                    location.pathname === '/'
                      ? 'text-indigo-600 bg-indigo-50 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Public Tracking
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-xl shadow-xs text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-glow transition-all"
                >
                  Staff Portal Login
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-900 leading-none">
                    {user?.full_name || 'Staff User'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {user?.hub_name ? user.hub_name : user?.hub_id ? `Hub #${user.hub_id}` : 'General Network'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <StatusBadge status={user?.role} size="xs" showDot={false} />
                  </div>
                </div>

                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-100 to-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center font-bold text-xs shadow-xs">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>

                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-all"
                  title="Sign out of system"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Desktop Sidebar (Only when Authenticated) */}
        {isAuthenticated && (
          <aside className="hidden md:flex flex-col w-64 flex-shrink-0">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs sticky top-24 space-y-6">
              {/* User Station Overview Card */}
              <div className="p-3.5 bg-gradient-to-br from-indigo-50/80 via-slate-50 to-white rounded-xl border border-indigo-100/70 shadow-xs">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Stationed Facility
                </span>
                <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
                  {user?.hub_name || (user?.hub_id ? `Hub #${user.hub_id}` : 'System Network')}
                </p>
                <div className="mt-2.5">
                  <StatusBadge status={user?.role} size="xs" />
                </div>
              </div>

              {/* Main Hub Operations Navigation */}
              <div>
                <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Operations
                </p>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              {/* Admin Central Management (Manager Only) */}
              {isManager && (
                <div>
                  <div className="px-3 flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                      Management
                    </p>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md">
                      Manager
                    </span>
                  </div>
                  <nav className="space-y-1">
                    {adminNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                            }`
                          }
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.name}</span>
                        </NavLink>
                      );
                    })}
                  </nav>
                </div>
              )}

              {/* Quick Public Link */}
              <div className="pt-2 border-t border-slate-100">
                <Link
                  to="/"
                  className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5" />
                    Public Tracking Portal
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        )}

        {/* Dynamic Main Body Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={closeMobileMenu}
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl p-6 flex flex-col justify-between z-10 animate-fade-in">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                    <Package className="w-4 h-4" />
                  </div>
                  <span className="font-black text-slate-900 tracking-tight">CourierTrack</span>
                </div>
                <button
                  onClick={closeMobileMenu}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isAuthenticated && (
                <div className="p-3 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user?.full_name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{user?.hub_name || 'Assigned Hub'}</p>
                  <div className="mt-2">
                    <StatusBadge status={user?.role} size="xs" />
                  </div>
                </div>
              )}

              <nav className="space-y-1">
                {isAuthenticated ? (
                  <>
                    <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Operations
                    </p>
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={closeMobileMenu}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                              isActive
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`
                          }
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </NavLink>
                      );
                    })}

                    {isManager && (
                      <div className="pt-4 mt-4 border-t border-slate-100">
                        <p className="px-3 text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-2">
                          Management
                        </p>
                        {adminNavItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              onClick={closeMobileMenu}
                              className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                                  isActive
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`
                              }
                            >
                              <Icon className="w-4 h-4" />
                              <span>{item.name}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/"
                      onClick={closeMobileMenu}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`
                      }
                    >
                      <Search className="w-4 h-4" />
                      <span>Track Package</span>
                    </NavLink>
                    <NavLink
                      to="/login"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <User className="w-4 h-4" />
                      <span>Staff Portal Login</span>
                    </NavLink>
                  </>
                )}
              </nav>
            </div>

            {isAuthenticated && (
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    closeMobileMenu();
                    logout();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Modern Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p className="font-medium">
            © {new Date().getFullYear()} CourierTrack Multi-Hub Logistics Platform. Enterprise Edition.
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs animate-pulse"></span>
              Network Online: Localhost Active
            </span>
            <Link to="/" className="text-slate-500 hover:text-indigo-600 font-semibold transition">
              Customer Tracking
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
