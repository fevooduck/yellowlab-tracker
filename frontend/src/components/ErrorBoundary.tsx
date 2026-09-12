import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Rede de segurança global: se qualquer componente lançar uma exceção durante
 * o render (ex: dado inesperado da API, propriedade undefined), o React por
 * padrão desmonta a árvore inteira e a tela fica em branco, sem nenhum aviso.
 * Este ErrorBoundary captura isso e mostra uma mensagem explicando o erro,
 * em vez de deixar a aplicação travar silenciosamente.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erro não tratado na interface:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800/80 border border-rose-500/30 rounded-3xl p-8 text-center space-y-4 shadow-xl">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
            <h1 className="text-lg font-bold text-white">Algo deu errado</h1>
            <p className="text-xs text-slate-400">
              Ocorreu um erro inesperado ao carregar esta tela. Isso pode acontecer se o
              registro foi excluído ou se a resposta da API mudou.
            </p>
            <p className="text-[11px] font-mono text-rose-300 bg-slate-900/60 rounded-xl p-3 break-words text-left">
              {this.state.error.message}
            </p>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
