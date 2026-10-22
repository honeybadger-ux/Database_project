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
  Building,
  PlusCircle,
  Activity,
  Layers,
} from 'lucide-react';

export const CourierErpLayout = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCourierAdmin = user?.role === 'COURIER_ADMIN';
  const isManager = ['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER'].includes(user?.role);
  const canRegister = ['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER', 'CLERK'].includes(user?.role);

  const navItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Consignments', to: '/parcels', icon: Package },
    { name: 'Linehauls', to: '/shipments', icon: Truck },
  ];

  const adminNavItems = [
    { name: 'Hubs', to: '/admin/hubs', icon: Building2 },
    { name: 'Staff', to: '/admin/employees', icon: Users },
    { name: 'Intelligence', to: '/admin/analytics', icon: BarChart3 },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const carrierTitle = user?.courier_name || 'Carrier Partner';

  const getInitials = (name) => {
    if (!name) return 'OP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500/15 selection:text-indigo-900">
      {/* Top Enterprise Command Header */}
      <header className="sticky top-0 z-40 bg-[#0f172a] border-b border-slate-800 text-slate-200 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Left: Mobile Toggle & Carrier Partner Brand */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                type="button"
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link to="/dashboard" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-500 transition-colors">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold tracking-tight text-white leading-none">
                      {carrierTitle}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      ERP
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                    Operations Console
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            {isAuthenticated && (
              <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center max-w-2xl">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isActive
                            ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow-xs'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}

                {isManager && (
                  <>
                    <div className="h-4 w-px bg-slate-800 mx-1" />
                    {adminNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) =>
                            `px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                              isActive
                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`
                          }
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </NavLink>
                      );
                    })}
                  </>
                )}
              </nav>
            )}

            {/* Right: Station Context & Profile Menu */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  {/* Station Badge */}
                  {user.hub_name && (
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
                      <Building className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-medium truncate max-w-[140px]">{user.hub_name}</span>
                    </div>
                  )}

                  {/* User Profile Pill */}
                  <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300 font-mono">
                      {getInitials(user.full_name)}
                    </div>
                    <div className="hidden md:flex flex-col text-left">
                      <span className="text-xs font-semibold text-white leading-tight">
                        {user.full_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  {/* Sign Out Button */}
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Sign Out of ERP"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all"
                >
                  Staff Sign In
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-[#0f172a] px-4 py-3 space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
              Operations
            </div>
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <item.icon className="w-4 h-4 text-indigo-400" />
                <span>{item.name}</span>
              </Link>
            ))}

            {isManager && (
              <>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 pt-2 pb-1">
                  Management & Intelligence
                </div>
                {adminNavItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                  >
                    <item.icon className="w-4 h-4 text-indigo-400" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </>
            )}

            {isAuthenticated && (
              <div className="pt-2 border-t border-slate-800 mt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main ERP Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Clean Operations Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{carrierTitle} Logistics ERP</span>
            <span>&bull;</span>
            <span className="text-emerald-600 font-medium">Tenant Isolated</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Authorized personnel only &bull; Internal carrier ledger
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CourierErpLayout;
