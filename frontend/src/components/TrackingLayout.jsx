import React from 'react';
import { Link } from 'react-router-dom';
import { Package, ShieldAlert, Truck, CheckCircle2, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const TrackingLayout = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const isSuperAdmin = isAuthenticated && user?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-500/15 selection:text-blue-900">
      {/* Public Customer Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                  Courier<span className="text-blue-600">Track</span>
                </span>
                <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400 mt-1">
                  Unified Parcel Tracking Network
                </span>
              </div>
            </Link>

            {/* Carrier Network Trust Badges */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Multi-Carrier Live Gateway</span>
              </div>

              {isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <Link
                    to="/super-admin"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                    title="Platform Governance Console"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    <span>Platform Console</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">CourierTrack Aggregator</span>
            <span>&bull;</span>
            <span>Integrated with DTDC, Blue Dart, Delhivery & FedEx</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>256-Bit SSL Secured</span>
            <span>&bull;</span>
            <span>Real-time Carrier Webhooks</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TrackingLayout;
