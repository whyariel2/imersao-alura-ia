# Documentação do Banco de Dados - DevPath

## 1. Visão Geral
O banco de dados utiliza **SQLite** no modo WAL (*Write-Ahead Logging*) com integridade referencial ativa (`foreign_keys = ON`). O design segue normalização relacional com fonte única de verdade para horas de estudo.

---

## 2. Diagrama Entidade-Relacionamento (ASCII)

```
┌──────────────┐          ┌───────────────────────────────────────────────┐
│    PHASES    │ 1      N │                     TASKS                     │
├──────────────┼──────────┼───────────────────────────────────────────────┤
│ id (PK)      │          │ id (PK)                                       │
│ name         │          │ phase_id (FK -> phases.id ON DELETE CASCADE)  │
│ description  │          │ title                                         │
│ position     │          │ description                                   │
└──────────────┘          │ status ('todo' | 'in_progress' | 'done')      │
                          │ position                                      │
                          │ estimated_hours                               │
                          │ due_date                                      │
                          │ pinned_due_date (0 | 1)                       │
                          │ alura_url (NULL por padrão)                   │
                          │ completed_at                                  │
                          │ created_at                                    │
                          │ updated_at                                    │
                          └──────┬───────────────────────┬────────────────┘
                                 │ 1                   1 │
                                 │ N                   N │
              ┌──────────────────┴────────┐   ┌──────────┴───────────────┐
              │        TASK_STACKS        │   │      STUDY_SESSIONS      │
              ├───────────────────────────┤   ├──────────────────────────┤
              │ task_id (PK, FK -> tasks) │   │ id (PK)                  │
              │ stack_id (PK, FK -> stacks│   │ task_id (FK -> tasks)    │
              └─────────────┬─────────────┘   │ date (YYYY-MM-DD)        │
                            │ N               │ hours (> 0)              │
                            │ 1               │ note                     │
                     ┌──────┴──────┐          └──────────────────────────┘
                     │   STACKS    │
                     ├─────────────┤
                     │ id (PK)     │          ┌──────────────────────────┐
                     │ name (UQ)   │          │         SETTINGS         │
                     │ color       │          ├──────────────────────────┤
                     └─────────────┘          │ key (PK)                 │
                                              │ value                    │
                                              └──────────────────────────┘
```

---

## 3. Especificação das Tabelas

### `stacks`
Categorias e tecnologias (ex: JavaScript, Angular, Node.js).
- `id` (INTEGER, PK, Autoincrement)
- `name` (TEXT, UNIQUE, NOT NULL): Nome da stack.
- `color` (TEXT, NOT NULL): Código hexadecimal para badges/chips na UI.

### `phases`
Módulos pedagógicos e blocos acadêmicos (ex: Fundamentos Web, Front-end, FIAP - Fase 1).
- `id` (INTEGER, PK, Autoincrement)
- `name` (TEXT, NOT NULL): Título da fase.
- `description` (TEXT): Descrição dos objetivos da fase.
- `position` (INTEGER, NOT NULL): Ordem de exibição.

### `tasks`
Unidade de estudo (curso ou projeto prático).
- `id` (INTEGER, PK, Autoincrement)
- `phase_id` (INTEGER, NOT NULL, FK -> `phases.id` ON DELETE CASCADE)
- `title` (TEXT, NOT NULL): Nome do curso/tarefa.
- `description` (TEXT): Resumo do conteúdo.
- `status` (TEXT, NOT NULL, DEFAULT `'todo'`): `'todo'`, `'in_progress'`, `'done'`.
- `position` (INTEGER, NOT NULL): Posição de ordenação dentro da fase.
- `estimated_hours` (REAL, NOT NULL, DEFAULT 0): Carga horária estimada.
- `due_date` (TEXT): Data limite calculada pelo algoritmo ou fixada (YYYY-MM-DD).
- `pinned_due_date` (INTEGER, NOT NULL, DEFAULT 0): Booleano (1 = data fixada pelo usuário, não recalculada).
- `alura_url` (TEXT): Link da aula/curso (mantido `NULL` no seed).
- `completed_at` (TEXT): Data/hora de conclusão.
- `created_at` (TEXT, NOT NULL, DEFAULT `datetime('now')`)
- `updated_at` (TEXT, NOT NULL, DEFAULT `datetime('now')`)

### `task_stacks` (N:N)
Associação entre tasks e stacks.
- `task_id` (INTEGER, NOT NULL, FK -> `tasks.id` ON DELETE CASCADE)
- `stack_id` (INTEGER, NOT NULL, FK -> `stacks.id` ON DELETE CASCADE)
- Primary Key: `(task_id, stack_id)`

### `study_sessions`
Registro pontual de estudos. **Fonte da verdade das horas**.
- `id` (INTEGER, PK, Autoincrement)
- `task_id` (INTEGER, NOT NULL, FK -> `tasks.id` ON DELETE CASCADE)
- `date` (TEXT, NOT NULL): Data da sessão (YYYY-MM-DD).
- `hours` (REAL, NOT NULL, CHECK `hours > 0`): Quantidade de horas dedicadas.
- `note` (TEXT): Anotações de aprendizado.

### `settings`
Chave-valor para preferências do usuário e parâmetros do sistema.
- `key` (TEXT, PK): Identificador (`weekly_capacity_hours`, `theme`, `start_date`).
- `value` (TEXT, NOT NULL): Valor serializado em string.

---

## 4. Regras de Derivação e Integridade

1. **`spent_hours` derivado:**
   - O campo `spent_hours` de uma task **nunca é armazenado fisicamente**.
   - É obtido dinamicamente via consulta com agregação:
   ```sql
   SELECT t.*, COALESCE(SUM(s.hours), 0) AS spent_hours
   FROM tasks t
   LEFT JOIN study_sessions s ON s.task_id = t.id
   GROUP BY t.id;
   ```
2. **Índices de Performance:**
   - `idx_tasks_status` em `tasks(status)`
   - `idx_tasks_due_date` em `tasks(due_date)`
   - `idx_tasks_phase_position` em `tasks(phase_id, position)`
   - `idx_study_sessions_date` em `study_sessions(date)`
   - `idx_study_sessions_task_id` em `study_sessions(task_id)`
