import { useCallback, useState } from 'react';

interface UseApiResult<T> {
  data: T | null;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  loading: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  /** Executa o fetch, valida `res.ok` e já atualiza `data`/`error`/`loading`. Lança o erro (com a mensagem da API quando disponível) para quem quiser reagir (ex: mostrar um toast). */
  request: (input: RequestInfo, init?: RequestInit) => Promise<T>;
}

/**
 * Encapsula o padrão repetido de fetch + checagem de `res.ok` + estados de
 * loading/error/data usado nas páginas e modais do app.
 */
export function useApi<T = any>(initialData: T | null = null): UseApiResult<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (input: RequestInfo, init?: RequestInit): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(input, init);

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // Resposta sem corpo JSON (ex: 204) — segue sem quebrar.
      }

      if (!res.ok) {
        const message = body?.error || body?.message || `Erro na requisição (HTTP ${res.status})`;
        throw new Error(message);
      }

      setData(body);
      return body as T;
    } catch (err: any) {
      const message = err?.message || 'Falha de conexão com o servidor.';
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, setData, loading, error, setError, request };
}
