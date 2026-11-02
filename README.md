# DevPath - Gerenciador de Plano de Estudos Full Stack

Aplicação pessoal, 100% local e mono-usuário (sem necessidade de login), desenvolvida para planejar e gerenciar os estudos da **pós-graduação FIAP + cursos Alura** rumo à formação de desenvolvedor Full Stack.

---

## 🚀 Stack Tecnológica

- **Frontend:** Angular (v21 LTS), TypeScript strict, Standalone Components, Signals, Reactive Forms, CSS Custom Properties (Design Tokens para tema Light/Dark), Drag & Drop com CDK.
- **Backend:** Node.js LTS, Fastify, better-sqlite3 (Modo WAL), Zod para validação em runtime.
- **Banco de Dados:** SQLite com migrações versionadas e integridade referencial ativa.
- **Testes:** Vitest com suíte completa para API e algoritmo determinístico de reagendamento de prazos.
- **Containerização:** Dockerfile multi-stage com usuário non-root e Docker Compose com binding estrito a `127.0.0.1`.

---

## 💻 Como Rodar em Desenvolvimento (Sem Docker)

### 1. Pré-requisitos
- **Node.js 26 LTS**
- **npm** (v10 ou superior)

### 2. Instalação das Dependências
```bash
npm install
```

### 3. Configuração de Variáveis de Ambiente
O projeto já conta com fallbacks seguros para todas as variáveis. Se desejar customizar:
```bash
cp .env.example .env
```

### 4. Inicializar o Banco e Seed de Tarefas
O banco SQLite (`data/studyflow.sqlite`) e as 33 tarefas iniciais de aprendizado Full Stack são criados automaticamente ao iniciar o backend. Se desejar forçar a execução manual do seed:
```bash
npm run db:seed
```

### 5. Iniciar a Aplicação
```bash
npm run dev
```
Acesse a aplicação no navegador em: **`http://localhost:3000`**

Para rodar apenas o backend com live reload:
```bash
npm run backend:dev
```

---

## 🧪 Como Executar os Testes Automatizados

O projeto conta com testes unitários e de integração cobrindo o algoritmo puro de reagendamento, integridade de horas e endpoints da API:

```bash
# Execução simples
npm run test

# Execução detalhada (verbose)
npx vitest run --reporter=verbose
```

---

## 📚 Documentações Detalhadas

- **[docs/SQLITE.md](docs/SQLITE.md):** Schema DDL completo, índices, comandos úteis do SQLite CLI e rotinas de backup.
- **[docs/database.md](docs/database.md):** Diagrama relacional, especificação de tabelas e regras de derivação de `spent_hours`.
- **[docs/DOCKER.md](docs/DOCKER.md):** Instruções do Docker Compose, persistência de volume e auditoria da porta local restrita a `127.0.0.1`.
