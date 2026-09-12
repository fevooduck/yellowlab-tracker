# Backlog — próximas melhorias

Continuação do levantamento de melhorias feito em 2026-09-12 (uso 100% local, sem deploy — por isso autenticação, CORS restrito e CI/CD não entram aqui). Itens ✅ já foram implementados; os demais estão detalhados para retomar em qualquer sessão futura sem precisar rediagnosticar.

## Feito

- ✅ **Fila global de concorrência de auditorias** + healthcheck do `app` — [PR #1](https://github.com/fevooduck/yellowlab-tracker/pull/1) (v1.1.0 em diante).
- ✅ **Retry/backoff no Puppeteer** + **relatórios em disco** (em vez de expurgo no banco — decisão trocada em conversa: `.gitignore` já previa `ylt_reports/`) — [PR #2](https://github.com/fevooduck/yellowlab-tracker/pull/2), v1.1.0.

## Próximo item recomendado

### 1. Toasts + hook `useApi` (junta os itens de UI e reduz duplicação)

**Por quê:** `alert()`/`confirm()` nativos do browser aparecem em `UrlsPage.tsx`, `UrlDetailPage.tsx`, `DomainsPage.tsx`, `DomainDetailPage.tsx` — quebram a identidade visual escura da ferramenta e bloqueiam a thread. Ao mesmo tempo, `DashboardPage.tsx:17`, `DomainsPage.tsx:16` e `UrlsPage.tsx:15` ainda têm o padrão de `fetch` sem checar `res.ok` antes de usar a resposta (mesma classe de bug já corrigida em `DomainDetailPage`/`UrlDetailPage` — aqui o impacto é menor porque são listas com fallback `Array.isArray`, mas erros reais da API ficam escondidos do usuário). As 5 páginas e os 3 modais (`DomainModal`, `UrlModal`, `BatchUrlModal`) reimplementam o mesmo boilerplate de loading/error/fetch.

**Abordagem sugerida:**
1. Criar `frontend/src/hooks/useApi.ts` (ou `useFetch.ts`) que encapsula fetch + checagem de `res.ok` + estados de `loading`/`error`/`data`, reutilizável nas páginas e nos modais.
2. Criar um componente leve de toast (`frontend/src/components/Toast.tsx` + um contexto/hook `useToast()`) — não precisa de lib externa, o design system já é autoral.
3. Trocar `alert()` por `toast.error(...)` e `confirm()` por um modal de confirmação simples (reaproveitar o padrão visual dos modais existentes) nos 4 arquivos citados acima.
4. Migrar `DashboardPage`, `DomainsPage`, `UrlsPage` para o novo hook, resolvendo o `res.ok` que falta nelas de forma sistemática.

**Arquivos principais:** `frontend/src/pages/*.tsx`, `frontend/src/components/{DomainModal,UrlModal,BatchUrlModal}.tsx`, novo `frontend/src/hooks/useApi.ts`, novo `frontend/src/components/Toast.tsx`.

**Esforço:** médio (toca em várias telas, mas cada mudança é mecânica).

**Como validar:** navegar pelas telas provocando os erros de propósito (URL duplicada, exclusão, domínio inexistente) e confirmar que não aparece mais `alert()`/`confirm()` nativo; testar as 3 páginas de listagem com o backend fora do ar (`docker compose stop app` só o backend, se der pra isolar, ou simular erro) e confirmar que mostra erro em vez de tela quebrada/vazia sem explicação.

---

## Backlog (ordem sugerida após o item acima)

### 2. Scripts de seed e backup/restore do banco

**Por quê:** hoje, pra popular dados de teste ou tirar um snapshot antes de mexer em algo arriscado, a alternativa é escrever um script ad hoc na mão (como fizemos manualmente pra gerar os screenshots do README e pra restaurar os dados da Nestlé depois de um `down -v` acidental). Um script formal evita repetir esse trabalho e evita acidentes.

**Abordagem sugerida:**
- `backend/src/cli/seed.ts` (rodável via `npm run seed`): cria um domínio fictício + algumas URLs + relatórios mock (reaproveitar a estrutura de `rules`/`scoreProfiles` que já usamos manualmente na sessão de screenshots).
- `scripts/db-backup.sh` / `scripts/db-restore.sh` (ou `npm run db:backup` / `db:restore`): usar `pg_dump`/`pg_restore` via `docker compose exec db`, salvando em `backups/*.sql` (adicionar ao `.gitignore`).

**Arquivos principais:** novo `backend/src/cli/seed.ts`, novos scripts em `scripts/`, `backend/package.json`/`package.json` (novos comandos npm), `.gitignore`.

**Esforço:** baixo-médio.

**Como validar:** rodar `npm run seed` e `npm run db:backup`/`db:restore` do zero (banco vazio) e confirmar que populam/restauram corretamente; `docker compose down -v && docker compose up -d && npm run db:restore -- <arquivo>` deve devolver os dados.

### 3. Logs estruturados

**Por quê:** `ylt-runner.ts` usa `console.log`/`console.error` com emoji, apesar do Fastify já expor um logger Pino configurado (`logger: true` em `server.ts`). Isso dificulta filtrar/depurar localmente (ex: `docker compose logs app | grep` fica menos previsível misturando os dois formatos).

**Abordagem sugerida:** passar o logger do Fastify (ou uma instância Pino standalone, já que `ylt-runner.ts` não tem acesso direto à instância do Fastify) para as funções de auditoria, substituindo os `console.log`/`console.error`.

**Arquivos principais:** `backend/src/lib/ylt-runner.ts`, `backend/src/server.ts`.

**Esforço:** baixo.

**Como validar:** rodar uma auditoria e conferir que os logs saem no mesmo formato JSON estruturado do resto do Fastify.

### 4. Paginação em `GET /api/urls` e `GET /api/domains`

**Por quê:** hoje essas rotas retornam tudo de uma vez, incluindo `reports`/`urls` aninhados. Só vira um problema real se o dev cadastrar centenas/milhares de URLs — não é urgente no uso típico atual, mas é uma armadilha de escala se a ferramenta crescer em uso.

**Abordagem sugerida:** adicionar `take`/`skip` (ou cursor) nas duas rotas, com parâmetros de query opcionais (`?limit=&offset=`), mantendo o comportamento atual como default quando não informado.

**Arquivos principais:** `backend/src/routes/urls.ts`, `backend/src/routes/domains.ts`, telas de listagem no frontend (`UrlsPage.tsx`, `DomainsPage.tsx`) para consumir a paginação.

**Esforço:** médio (toca em contrato de API + frontend).

**Como validar:** popular >100 URLs (via seed do item 2) e confirmar que a listagem não trafega tudo de uma vez.

### 5. Validação de host da URL cadastrada (nota de baixa prioridade)

**Por quê:** `backend/src/routes/urls.ts` aceita qualquer string como URL (só prefixa `https://` se faltar o protocolo) e ela vai direto para o Puppeteer, que roda com `--no-sandbox`. Em produção multi-usuário isso seria SSRF grave; em uso 100% local, onde só o próprio dev cadastra URLs na própria máquina, o risco prático é baixo — mas vale documentar/considerar caso a ferramenta um dia deixe de ser só local.

**Abordagem sugerida (se for implementar):** checar o host resolvido antes de disparar o Puppeteer, recusando IPs privados/loopback/link-local (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`) a menos que uma env var explícita libere (`ALLOW_LOCAL_AUDIT_TARGETS=true`), pra não quebrar quem quiser propositalmente auditar algo na rede local.

**Esforço:** baixo, mas só vale a pena se o contexto de uso mudar.

---

## Como continuar

Pegar o item recomendado (Toasts + `useApi`), abrir uma branch (`feat/...`), implementar, validar conforme a seção de cada item, bump de versão (`CHANGELOG.md` + os três `package.json`) e abrir PR — mesmo fluxo usado nas PRs #1 e #2.
