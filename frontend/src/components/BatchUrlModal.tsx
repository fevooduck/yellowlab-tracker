import React, { useState } from 'react';
import { X, Layers, AlertCircle, CheckCircle, FileCode } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  domainId: number;
  domainName: string;
  onOpenSitemap?: () => void;
}

export default function BatchUrlModal({
  isOpen,
  onClose,
  onSuccess,
  domainId,
  domainName,
  onOpenSitemap,
}: Props) {
  const [urlsText, setUrlsText] = useState('');
  const [category, setCategory] = useState('Geral');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ createdCount: number; skippedCount: number } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/urls/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId,
          urlsText,
          category,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao importar URLs');

      setResult({
        createdCount: data.createdCount,
        skippedCount: data.skippedCount,
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Layers className="w-5 h-5 text-yellow-400" />
            Importação em Massa de URLs ({domainName})
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {result.createdCount} URLs cadastradas com sucesso! ({result.skippedCount} ignoradas por duplicidade)
            </div>
          )}

          {onOpenSitemap && (
            <div className="p-3 bg-slate-900/60 border border-slate-700/80 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <FileCode className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>Prefere resgatar as URLs do site automaticamente?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSitemap();
                }}
                className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg text-xs shrink-0 transition-colors"
              >
                Do Sitemap XML
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Lista de URLs (uma por linha) *
            </label>
            <textarea
              rows={8}
              required
              placeholder={`https://${domainName}/\nhttps://${domainName}/categoria/roupas\nhttps://${domainName}/produto/tenis-corrida\nhttps://${domainName}/carrinho`}
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 text-xs font-mono resize-none leading-relaxed"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Cole múltiplos links separados por quebra de linha. URLs duplicadas serão ignoradas automaticamente.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Categoria Padrão para o Lote
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-yellow-400 text-sm"
            >
              <option value="Geral">Geral</option>
              <option value="Home">Home</option>
              <option value="Categoria">Categoria (PLP)</option>
              <option value="Produto">Produto (PDP)</option>
              <option value="Carrinho">Carrinho</option>
              <option value="Checkout">Checkout</option>
              <option value="Landing Page">Landing Page</option>
              <option value="Institucional">Institucional</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-yellow-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Processando Lote...' : 'Importar URLs'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
