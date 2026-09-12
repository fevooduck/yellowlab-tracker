import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Plus, Search, Trash2, Edit, ArrowRight, ExternalLink } from 'lucide-react';
import ScoreBadge from '../components/ScoreBadge';
import DomainModal from '../components/DomainModal';

export default function DomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [domainToEdit, setDomainToEdit] = useState<any | null>(null);

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/domains');
      const data = await res.json();
      setDomains(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o domínio "${name}" e todas as suas URLs e análises?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/domains/${id}`, { method: 'DELETE' });
      if (res.ok) fetchDomains();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = domains.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-yellow-400" /> Domínios Monitorados
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie os domínios corporativos e suas páginas auditadas pelo Yellow Lab Tools.
          </p>
        </div>

        <button
          onClick={() => {
            setDomainToEdit(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-yellow-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Novo Domínio
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Buscar por host ou nome do domínio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-yellow-400"
        />
      </div>

      {/* Grid de Domínios */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Carregando domínios...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-slate-800/40 border border-dashed border-slate-700 rounded-3xl text-center">
          <Globe className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-white">Nenhum domínio encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between group shadow-sm hover:border-slate-600 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-xs font-mono font-bold text-yellow-400 truncate">
                    {d.name}
                  </span>
                  <ScoreBadge score={d.avgScore} size="sm" />
                </div>

                <Link
                  to={`/domains/${d.id}`}
                  className="text-base font-bold text-white hover:text-yellow-300 transition-colors block"
                >
                  {d.label}
                </Link>

                {d.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {d.description}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {d.totalUrls} URLs
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDomainToEdit(d);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                    title="Editar domínio"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id, d.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition-colors"
                    title="Excluir domínio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Link
                    to={`/domains/${d.id}`}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors"
                  >
                    Abrir <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DomainModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDomains}
        domainToEdit={domainToEdit}
      />
    </div>
  );
}
