import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Truck,
  Shield,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const defaultDestination = window.location.port === '5173' ? '/super-admin' : '/dashboard';
  const from = location.state?.from?.pathname || defaultDestination;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Authentication failed. Please verify your credentials.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  const isPlatformOwnerPortal = window.location.port === '5173';

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-md w-full space-y-6 bg-white p-7 sm:p-9 rounded-2xl border border-slate-200/90 shadow-lg relative overflow-hidden">
        {/* Top Gradient Accent Bar */}
        <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${isPlatformOwnerPortal ? 'from-purple-600 via-indigo-600 to-blue-600' : 'from-indigo-600 via-blue-500 to-indigo-700'}`} />

        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr ${isPlatformOwnerPortal ? 'from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-300' : 'from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-300'} mb-4`}>
            {isPlatformOwnerPortal ? <Shield className="w-7 h-7" /> : <Package className="w-7 h-7" />}
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {isPlatformOwnerPortal ? 'Platform Owner Console Login' : 'Carrier ERP Portal Login'}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            {isPlatformOwnerPortal
              ? 'Super root administrative access for cross-carrier dispute arbitration and tenant governance'
              : 'Authorized access to hub operations, sorting scans, and dispatching linehaul manifests'}
          </p>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-700 text-xs sm:text-sm animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-bold">Authentication Failed</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@courier.com"
                required
                className="block w-full pl-10 pr-4 py-2.5 sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="block w-full pl-10 pr-4 py-2.5 sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying Identity...
                </>
              ) : (
                <>
                  <span>Sign In to Station</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Demo Credentials Box */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
            Multi-Tenant Demo Roles (1-Click Fill)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillCredentials('superadmin@courier.com', 'password123')}
              className="p-2.5 text-left rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-100/50 transition flex flex-col group shadow-xs col-span-1 sm:col-span-2"
            >
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="text-purple-900">🛡️ Super Root Admin</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-200 text-purple-900 rounded font-black">
                  PLATFORM OWNER
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 font-mono">
                superadmin@courier.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('rajesh.kumar@courier.com', 'password123')}
              className="p-2.5 text-left rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition flex flex-col group shadow-xs"
            >
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>DTDC Admin</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold">
                  DTDC
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 truncate font-mono">
                rajesh.kumar@courier.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('bluedart.admin@courier.com', 'password123')}
              className="p-2.5 text-left rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition flex flex-col group shadow-xs"
            >
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>Blue Dart Admin</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">
                  BLUEDART
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 truncate font-mono">
                bluedart.admin@courier.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('delhivery.admin@courier.com', 'password123')}
              className="p-2.5 text-left rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition flex flex-col group shadow-xs"
            >
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>Delhivery Admin</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">
                  DELHIVERY
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 truncate font-mono">
                delhivery.admin@courier.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('fedex.admin@courier.com', 'password123')}
              className="p-2.5 text-left rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition flex flex-col group shadow-xs"
            >
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>FedEx Admin</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-bold">
                  FEDEX
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 truncate font-mono">
                fedex.admin@courier.com
              </span>
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-3 font-mono">
            Default password: <strong className="text-slate-600">password123</strong>
          </p>
        </div>

        <div className="text-center pt-2">
          {window.location.port === '5173' ? (
            <Link
              to="/"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              ← Return to Public Package Tracking
            </Link>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400">
              🔒 Carrier Operations ERP Station &bull; Authorized Personnel Only
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
