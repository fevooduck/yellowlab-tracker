# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versionamento em [SemVer](https://semver.org/lang/pt-BR/). A versão vive em `package.json` (raiz, `backend/` e `frontend/`, sempre em sincronia) e cada PR que sobe pra `master` deve vir com uma entrada aqui.

## [Unreleased]

## [1.1.1] - 2026-09-12

### Added
- `BACKLOG.md`: plano detalhado dos itens de melhoria ainda não implementados (toasts/hook `useApi`, seed/backup, logs estruturados, paginação, validação de host), para retomar em qualquer sessão futura.

## [1.1.0] - 2026-09-12

### Added
- Retry automático (`AUDIT_MAX_RETRIES`, `AUDIT_RETRY_DELAY_MS`) quando uma auditoria falha por motivo transitório (rede, crash pontual do Chromium).
- O JSON completo de cada auditoria agora é salvo em disco (`ylt_reports/`), não mais no Postgres — o banco guarda só os scores resumidos e o caminho do arquivo (`YellowLabReport.reportPath`). Excluir uma URL/domínio também limpa os relatórios em disco.
- `CHANGELOG.md` e versionamento SemVer a partir desta versão.

### Changed
- `YellowLabReport.reportJson` agora é opcional no schema do Prisma (mantido só como fallback de leitura para relatórios gravados antes desta versão).

## [1.0.0] - 2026-09-12

Baseline consolidada da ferramenta antes do versionamento formal começar:

- Build Docker corrigido (`scripts/` copiado antes do `npm install`, necessário para o `postinstall` do backend).
- Migrations do Prisma aplicadas automaticamente no boot do container.
- Healthcheck do Postgres no `docker-compose.yml` com `depends_on: condition: service_healthy`.
- Timeout de auditoria do YellowLabTools ajustado de 30s para 90s (sites reais levam 50-110s).
- Tela em branco corrigida ao abrir um domínio/URL inexistente (fetch sem checar `res.ok`) + `ErrorBoundary` global.
- Screenshots da plataforma adicionados ao README (`docs/screenshots/`).
- Fila global de concorrência de auditorias (`MAX_CONCURRENT_AUDITS`, padrão 1 — testado e comprovadamente mais estável que 2 num ambiente Docker/WSL2 local) e healthcheck do serviço `app`.
