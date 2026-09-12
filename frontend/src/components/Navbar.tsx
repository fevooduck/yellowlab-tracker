import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Globe, Link2, Zap } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700/60 sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-yellow-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="font-extrabold text-white text-base tracking-tight leading-none flex items-center gap-1.5">
                YellowLab <span className="text-yellow-400 font-bold">Tracker</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                Arquitetura Front-End
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-4">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive('/') && location.pathname === '/'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Activity className="w-4 h-4" /> Visão Geral
            </Link>
            <Link
              to="/domains"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive('/domains')
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Globe className="w-4 h-4" /> Domínios
            </Link>
            <Link
              to="/urls"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive('/urls')
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Link2 className="w-4 h-4" /> URLs
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Porta 3020 (WSL)
          </span>
        </div>
      </div>
    </header>
  );
}
