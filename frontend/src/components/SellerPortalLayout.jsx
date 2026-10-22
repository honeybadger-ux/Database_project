import React from 'react';
import { useSellerAuth } from '../context/SellerAuthContext';
import {
  Layers,
  Building,
  Key,
  LogOut,
  ShieldCheck,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';

export const SellerPortalLayout = ({ children }) => {
  const { seller, logout, isAuthenticated } = useSellerAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-emerald-500/15 selection:text-emerald-900">
      {/* Merchant Console Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                    Omni<span className="text-emerald-600">Ship</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Merchant Console
                  </span>
                </div>
                <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400 mt-1">
                  Multi-Carrier Aggregator & Rate Optimization Engine
                </span>
              </div>
            </div>

            {/* Right: Authenticated Merchant Profile & Security Badges */}
            {isAuthenticated && seller && (
              <div className="flex items-center gap-4">
                {/* Encryption Status Badge */}
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>256-Bit Encrypted B2B Session</span>
                </div>

                {/* Merchant Identity Card */}
                <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    <Building className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {seller.company_name}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="font-mono text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200 text-[10px]">
                        API Key: ••••••••
                      </span>
                      {seller.city && <span>&bull; {seller.city}</span>}
                    </div>
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                  title="Sign out of merchant account"
                >
                  <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Merchant Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">OmniShip Aggregator</span>
            <span>&bull;</span>
            <span className="text-emerald-700 font-medium">B2B Merchant Tenant Protected</span>
          </div>
          <div>Bank-grade encryption &bull; JWT Scoped API Tokens &bull; Live Carrier Dispatches</div>
        </div>
      </footer>
    </div>
  );
};

export default SellerPortalLayout;
