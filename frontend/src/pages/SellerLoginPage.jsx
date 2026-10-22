import React, { useState } from 'react';
import { useSellerAuth } from '../context/SellerAuthContext';
import {
  Layers,
  Key,
  Lock,
  Mail,
  Building,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const SellerLoginPage = () => {
  const { login } = useSellerAuth();
  const [authMode, setAuthMode] = useState('email'); // 'email' | 'api_key'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoMerchants = [
    {
      name: 'Amazon India',
      email: 'ops-fulfillment@amazon.in',
      password: 'password123',
      sub: 'Bangalore Cluster &bull; High Volume',
    },
    {
      name: 'Flipkart Internet',
      email: 'ekart-merchant@flipkart.com',
      password: 'password123',
      sub: 'Ekart Logistics Integration',
    },
    {
      name: 'Meesho Supply Chain',
      email: 'seller-ops@meesho.com',
      password: 'password123',
      sub: 'Tier-2/3 Regional Coverage',
    },
    {
      name: 'Myntra Fashion',
      email: 'merchant-hub@myntra.com',
      password: 'password123',
      sub: 'Express Apparel Delivery',
    },
  ];

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'email') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both merchant email and password');
        }
        await login({ email: email.trim(), password });
      } else {
        if (!apiKey.trim()) {
          throw new Error('Please enter your live merchant API key');
        }
        await login({ api_key: apiKey.trim() });
      }
    } catch (err) {
      console.error('Merchant sign-in failed', err);
      const detail = err.response?.data?.detail || err.message || 'Authentication failed';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (merchant) => {
    setError('');
    setLoading(true);
    setEmail(merchant.email);
    setPassword(merchant.password);
    try {
      await login({ email: merchant.email, password: merchant.password });
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Demo login failed';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-emerald-500/15 selection:text-emerald-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-4">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          Omni<span className="text-emerald-600">Ship</span> Merchant Portal
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Multi-Carrier Shipping Aggregator & Dynamic Rate Comparison Engine
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200">
          {/* Method Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('email');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                authMode === 'email'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('api_key');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                authMode === 'api_key'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live API Key
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'email' ? (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Merchant Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ops@merchant.com"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50/50 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50/50 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Production API Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk_live_..."
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 font-mono border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Authenticating Tenant...</span>
              ) : (
                <>
                  <span>Sign In to Merchant Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1-Click Demo Merchant Access
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {demoMerchants.map((merchant) => (
                <button
                  key={merchant.email}
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin(merchant)}
                  className="w-full p-2.5 text-left border border-slate-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                      {merchant.name}
                    </span>
                    <span
                      className="text-[11px] text-slate-500"
                      dangerouslySetInnerHTML={{ __html: merchant.sub }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                    Sign in &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Tenant Scoped Security &bull; Passwords bcrypt-hashed &bull; Signed JWTs</span>
        </div>
      </div>
    </div>
  );
};

export default SellerLoginPage;
