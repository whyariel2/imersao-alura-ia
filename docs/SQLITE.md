# SQLITE.md - Guia do Banco SQLite

## 1. Schema Completo (DDL)

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
  position INTEGER NOT NULL,
  estimated_hours REAL NOT NULL DEFAULT 0,
  due_date TEXT,
  pinned_due_date INTEGER NOT NULL DEFAULT 0,
  alura_url TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_stacks (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  stack_id INTEGER NOT NULL REFERENCES stacks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, stack_id)
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  hours REAL NOT NULL CHECK(hours > 0),
  note TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_phase_position ON tasks(phase_id, position);
CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_task_id ON study_sessions(task_id);
```

---

## 2. Como Rodar Migrations e Seed

### Executar Migrações Automaticamente
As migrações são executadas automaticamente na inicialização da aplicação (função `runMigrations()` do arquivo `backend/src/db/migrator.ts`).

### Executar Seed Manualmente
Para popular o banco com as 33 tasks pedagógicas e fases FIAP vazias:
```bash
npm run db:seed
# ou diretamente via tsx:
npx tsx backend/src/db/seed.ts --run
```

---

## 3. Como Inspecionar o Banco

### Via CLI SQLite Local (desenvolvimento)
```bash
sqlite3 data/studyflow.sqlite
```

Comandos úteis dentro do prompt do SQLite:
```sql
-- Listar tabelas
.tables

-- Ver estrutura de uma tabela
.schema tasks

-- Visualização em colunas legíveis
.mode column
.headers on

-- Consultar tarefas com horas gastas derivadas
SELECT t.id, t.title, t.status, t.estimated_hours, COALESCE(SUM(s.hours), 0) AS spent_hours
FROM tasks t
LEFT JOIN study_sessions s ON s.task_id = t.id
GROUP BY t.id
LIMIT 10;
```

### Inspecionar no Container Docker
```bash
docker compose exec study-flow sqlite3 /app/data/studyflow.sqlite ".tables"
```

---

## 4. Como Fazer Backup

### Método 1: Cópia Direta do Arquivo (desenvolvimento local)
Com a aplicação parada ou em modo WAL, copie o arquivo `.sqlite`:
```bash
cp data/studyflow.sqlite data/backup_$(date +%Y%m%d_%H%M%S).sqlite
```

### Método 2: Backup do Volume Docker (produção)
Para extrair um backup do volume gerenciado pelo Docker Compose:
```bash
docker compose cp study-flow:/app/data/studyflow.sqlite ./backup_studyflow.sqlite
```

### Método 3: Backup Online via SQLite VACUUM INTO (sem travar)
Gera uma cópia consistente mesmo durante o funcionamento do app:
```bash
sqlite3 data/studyflow.sqlite "VACUUM INTO 'data/backup_online.sqlite';"
```
