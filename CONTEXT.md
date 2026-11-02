# CONTEXT.md - DevPath (Plano de Estudos Full Stack)

## 1. Visão Geral do Projeto
Aplicação pessoal, 100% local, de usuário único e sem sistema de autenticação/login. O objetivo é gerenciar e acompanhar o plano de estudos para transição/evolução para desenvolvedor Full Stack, unindo a grade curricular da pós-graduação FIAP com cursos complementares da plataforma Alura.

- **Idioma da UI:** Português (pt-BR).
- **Código e identificadores:** Inglês (`camelCase` para variáveis/funções, `PascalCase` para componentes/tipos).
- **Ambiente:** Localhost (127.0.0.1:3000), conteinerizado via Docker.

---

## 2. Arquitetura do Monorepo

```
/
├── Dockerfile              # Multi-stage build (Angular build -> Backend TS build -> Alpine runner)
├── docker-compose.yml      # 1 serviço, porta 127.0.0.1:3000:3000, volume nomeado SQLite
├── CONTEXT.md              # Contexto de arquitetura e decisões técnicas
├── package.json            # Scripts de orquestração do monorepo (build, dev, test)
├── /backend                # API Fastify + SQLite
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts       # Servidor Fastify, registro de rotas e static file serving
│       ├── db/             # Conexão better-sqlite3, migrations runner e seeds
│       │   ├── client.ts
│       │   ├── migrations/ # Arquivos .sql numerados (ex: 001_initial_schema.sql)
│       │   └── seed.ts     # Seed com grade Full Stack e fases FIAP
│       ├── routes/         # Rotas REST (/api/tasks, /api/sessions, /api/metrics, /api/settings)
│       ├── schemas/        # Schemas de validação Zod para payloads e query params
│       ├── services/       # Regras de negócio e algoritmo de reagendamento (pure function)
│       └── tests/          # Testes unitários e de integração (Vitest)
├── /frontend               # SPA Angular LTS Standalone
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts
│       ├── index.html
│       ├── styles.css      # Design tokens (variáveis CSS para temas light/dark)
│       └── app/
│           ├── components/ # Componentes compartilhados e telas
│           ├── models/     # Interfaces TypeScript de domínio
│           ├── services/   # Clientes HTTP e signals de estado
│           └── routes.ts   # Rotas com lazy loading
└── /docs                   # Documentação prática
    ├── README.md           # Guia de execução local em desenvolvimento
    ├── SQLITE.md           # DDL, migrações, inspeção e backup do SQLite
    └── DOCKER.md           # Pré-requisitos, lifecycle de containers e segurança de rede
```

---

## 3. Decisões Técnicas e Stack

### 3.1 Backend
- **Runtime:** Node.js (v26 LTS).
- **Framework Web:** Fastify (alta performance, tipagem nativa e baixo overhead).
- **Banco de Dados:** SQLite gerenciado via `better-sqlite3` (síncrono, performático, ideal para app local mono-usuário).
- **Validação:** Zod em 100% dos endpoints para garantir tipos estritos no boundary da API.
- **Testes:** Vitest para cobertura do algoritmo de reagendamento e rotas da API.

### 3.2 Frontend
- **Framework:** Angular (última LTS), standalone components, signals (`signal`, `computed`, `effect`) e lazy routes.
- **Estilo:** CSS puro com variáveis customizadas (Design Tokens) para alternância Light/Dark (`data-theme`), sem bibliotecas pesadas de terceiros (como Material ou Bootstrap).
- **Drag & Drop:** `@angular/cdk/drag-drop` para reordenação de tasks dentro da fase.
- **Gráficos:** SVG puro desenhado diretamente no template Angular, sem bibliotecas externas.

### 3.3 Banco de Dados & Integridade
- **Fonte da verdade de horas:** Tabela `study_sessions(id, task_id, date, hours, note)`.
- **Horas gastas (`spent_hours`):** Valor sempre derivado via soma das sessões de estudo da task. Nunca duplicado ou dessincronizado.
- **Migrations:** Arquivos SQL puros numerados sequencialmente (ex: `001_initial_schema.sql`).
- **Seed:** ~30 a 40 tasks ordenadas pedagogicamente para formação Full Stack, mais fases reservadas para pós FIAP. Campo `alura_url` gerado como `NULL` e nome do curso em `title`.

---

## 4. Regras de Negócio Chave

1. **Reajuste Automático de Prazos (Reschedule Engine):**
   - Função pura, determinística e desacoplada do banco.
   - Entradas: lista de tasks pendentes (`status != 'done'`), `weekly_capacity_hours` e data de referência (`today`).
   - Calcula `remaining_hours = max(0, estimated_hours - spent_hours)`.
   - Distribui as horas em dias úteis/capacidade diária calculada a partir da capacidade semanal.
   - Tasks com `pinned_due_date = true` preservam sua data; se a projeção estourar o prazo fixado, a task recebe a flag `at_risk: true`.
   - Disparado automaticamente ao concluir/reabrir task, registrar nova sessão, reordenar ou alterar a capacidade semanal.

2. **Métricas e Painéis:**
   - **Horas semanais:** Soma das sessões realizadas de segunda a domingo vs `weekly_capacity_hours`.
   - **Stacks desenvolvidas:** Ranking de horas acumuladas agrupadas por stack.

---

## 5. Diretrizes de Segurança e Container
- **Isolamento de Rede:** Porta `3000` publicada exclusivamente em `127.0.0.1:3000` via `docker-compose.yml`.
- **CORS:** Desativado (serviço na mesma origem; backend Fastify serve os assets estáticos do Angular em `/` e a API em `/api`).
- **Usuário Não-Root:** O container Docker executa como usuário `node` (UID/GID 1000).
- **Persistência:** Volume nomeado `sqlite_data` mapeado para `/app/data`.
