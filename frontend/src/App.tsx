import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import DomainsPage from './pages/DomainsPage';
import DomainDetailPage from './pages/DomainDetailPage';
import UrlsPage from './pages/UrlsPage';
import UrlDetailPage from './pages/UrlDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/domains" element={<DomainsPage />} />
            <Route path="/domains/:domainId" element={<DomainDetailPage />} />
            <Route path="/urls" element={<UrlsPage />} />
            <Route path="/urls/:urlId" element={<UrlDetailPage />} />
          </Routes>
        </main>
        <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 no-print">
          YellowLab Tracker — Diagnóstico de Arquitetura Front-End para Equipes de Desenvolvimento
        </footer>
      </div>
    </BrowserRouter>
  );
}
