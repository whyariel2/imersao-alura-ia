import { getDb } from './client.js';
import { runMigrations } from './migrator.js';

interface SeedStack {
  name: string;
  color: string;
}

interface SeedPhase {
  name: string;
  description: string;
  position: number;
}

interface SeedTask {
  phase: string;
  title: string;
  description: string;
  position: number;
  estimated_hours: number;
  stacks: string[];
}

export function runSeed(force = false): void {
  runMigrations();
  const db = getDb();

  const countTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
  if (countTasks.count > 0 && !force) {
    console.log('Database already has tasks. Skipping seed.');
    return;
  }

  console.log('Starting database seeding...');

  const stacks: SeedStack[] = [
    { name: 'Git & GitHub', color: '#f05032' },
    { name: 'HTML & CSS', color: '#e34f26' },
    { name: 'JavaScript', color: '#f7df1e' },
    { name: 'TypeScript', color: '#3178c6' },
    { name: 'Angular', color: '#dd0031' },
    { name: 'Node.js', color: '#339933' },
    { name: 'SQL & SQLite', color: '#003b57' },
    { name: 'Testes Automatizados', color: '#15c213' },
    { name: 'Docker & DevOps', color: '#2496ed' },
    { name: 'Arquitetura & Segurança', color: '#8e44ad' },
  ];

  const phases: SeedPhase[] = [
    { name: 'Fundamentos & Versionamento', description: 'Lógica, Git, GitHub e fluxo de colaboração profissional', position: 1 },
    { name: 'Desenvolvimento Front-end', description: 'HTML5 semântico, CSS moderno e JavaScript moderno ES6+', position: 2 },
    { name: 'Front-end com Angular', description: 'TypeScript, Standalone Components, Signals e State Management', position: 3 },
    { name: 'Back-end & APIs com Node.js', description: 'Runtime Node, Fastify, REST, Zod e arquitetura de software', position: 4 },
    { name: 'Banco de Dados & Modelagem', description: 'Modelagem relacional, SQLite, DDL, DML, índices e transações', position: 5 },
    { name: 'Qualidade, Testes & Boas Práticas', description: 'Testes unitários, TDD, Clean Code e segurança básica', position: 6 },
    { name: 'DevOps, Containers & Deploy', description: 'Docker, multi-stage builds, compose e noções de CI/CD', position: 7 },
    { name: 'FIAP - Fase 1', description: 'Conteúdos e projetos da pós-graduação FIAP Fase 1', position: 8 },
    { name: 'FIAP - Fase 2', description: 'Conteúdos e projetos da pós-graduação FIAP Fase 2', position: 9 },
    { name: 'FIAP - Fase 3', description: 'Conteúdos e projetos da pós-graduação FIAP Fase 3', position: 10 },
    { name: 'FIAP - Fase 4', description: 'Conteúdos e projetos da pós-graduação FIAP Fase 4', position: 11 },
    { name: 'FIAP - Fase 5', description: 'Conteúdos e projetos da pós-graduação FIAP Fase 5', position: 12 },
  ];

  const tasks: SeedTask[] = [
    // Fase 1: Fundamentos
    { phase: 'Fundamentos & Versionamento', title: 'Lógica de Programação: Algoritmos e Estruturas de Controle', description: 'Construção de pensamento algorítmico, variáveis e laços de repetição.', position: 1, estimated_hours: 8, stacks: ['JavaScript'] },
    { phase: 'Fundamentos & Versionamento', title: 'Git e GitHub: Controle e Compartilhamento de Código', description: 'Comandos git essenciais, branches, pull requests e resolução de conflitos.', position: 2, estimated_hours: 6, stacks: ['Git & GitHub'] },
    { phase: 'Fundamentos & Versionamento', title: 'Git Flow e Boas Práticas de Commits Semânticos', description: 'Convenções Conventional Commits, rebase e organização de repositórios.', position: 3, estimated_hours: 4, stacks: ['Git & GitHub'] },

    // Fase 2: Front-end Base
    { phase: 'Desenvolvimento Front-end', title: 'HTML5 e CSS3: Ambientes de Desenvolvimento e Estrutura Semântica', description: 'Tags semânticas, acessibilidade a11y básica e boas práticas estruturais.', position: 1, estimated_hours: 8, stacks: ['HTML & CSS'] },
    { phase: 'Desenvolvimento Front-end', title: 'CSS Moderno: Flexbox, Grid Layout e Design Responsivo', description: 'Criação de layouts adaptáveis para mobile e desktop sem frameworks.', position: 2, estimated_hours: 10, stacks: ['HTML & CSS'] },
    { phase: 'Desenvolvimento Front-end', title: 'Design Tokens e Variáveis CSS para Light e Dark Mode', description: 'Arquitetura de tokens, contraste WCAG AA e media queries prefers-color-scheme.', position: 3, estimated_hours: 6, stacks: ['HTML & CSS'] },
    { phase: 'Desenvolvimento Front-end', title: 'JavaScript para Web: Manipulação do DOM e Eventos', description: 'Seletores, escuta de eventos, delegação e lifecycle de elementos na tela.', position: 4, estimated_hours: 10, stacks: ['JavaScript'] },
    { phase: 'Desenvolvimento Front-end', title: 'JavaScript ES6+: Desestruturação, Spread, Módulos e Promises', description: 'Sintaxe moderna, async/await, closures e métodos de array imutáveis.', position: 5, estimated_hours: 10, stacks: ['JavaScript'] },
    { phase: 'Desenvolvimento Front-end', title: 'Consumo de APIs com Fetch API e Tratamento de Erros HTTP', description: 'Trabalho assíncrono com requisições HTTP, headers e interceptação de erros.', position: 6, estimated_hours: 6, stacks: ['JavaScript'] },

    // Fase 3: Front-end com Angular
    { phase: 'Front-end com Angular', title: 'TypeScript Fundamentos: Tipagem Estrita, Interfaces e Generics', description: 'Configuração do tsconfig, tipos utilitários, union types e tipagem estrita.', position: 1, estimated_hours: 8, stacks: ['TypeScript'] },
    { phase: 'Front-end com Angular', title: 'Angular: Começando com Standalone Components', description: 'Criação de componentes standalone, templates desacoplados e lifecycle hooks.', position: 2, estimated_hours: 10, stacks: ['Angular', 'TypeScript'] },
    { phase: 'Front-end com Angular', title: 'Angular: Gerenciamento de Estado Reativo com Signals', description: 'Uso de signal, computed, effect e migração para arquitetura zoneless.', position: 3, estimated_hours: 10, stacks: ['Angular', 'TypeScript'] },
    { phase: 'Front-end com Angular', title: 'Angular: Roteamento Avançado, Lazy Loading e Guards', description: 'Configuração de rotas aninhadas, lazy loading de componentes e proteção.', position: 4, estimated_hours: 8, stacks: ['Angular', 'TypeScript'] },
    { phase: 'Front-end com Angular', title: 'Angular: Formulários Reativos e Validações Customizadas', description: 'FormGroup, FormControl, validações síncronas e assíncronas tipadas.', position: 5, estimated_hours: 8, stacks: ['Angular', 'TypeScript'] },
    { phase: 'Front-end com Angular', title: 'Angular CDK: Implementando Drag and Drop e Interações', description: 'Uso do CDK DragDrop para reordenação de listas e cards visuais.', position: 6, estimated_hours: 6, stacks: ['Angular', 'TypeScript'] },

    // Fase 4: Back-end com Node.js
    { phase: 'Back-end & APIs com Node.js', title: 'Node.js: Arquitetura do Runtime, Event Loop e Módulos ESM', description: 'Funcionamento de threads, I/O não bloqueante e sistema de pacotes npm.', position: 1, estimated_hours: 8, stacks: ['Node.js'] },
    { phase: 'Back-end & APIs com Node.js', title: 'Fastify: Construindo APIs REST de Alta Performance', description: 'Rotas, plugins, hooks de ciclo de vida e serialização otimizada.', position: 2, estimated_hours: 10, stacks: ['Node.js', 'TypeScript'] },
    { phase: 'Back-end & APIs com Node.js', title: 'Validação de Schemas e Boundary de Dados com Zod', description: 'Definição de contratos estritos para body, query params e tipagem inferida.', position: 3, estimated_hours: 6, stacks: ['Node.js', 'TypeScript'] },
    { phase: 'Back-end & APIs com Node.js', title: 'Tratamento Global de Erros e Logs Estruturados', description: 'Middleware centralizado de erros, formatação RFC 7807 e logs JSON.', position: 4, estimated_hours: 6, stacks: ['Node.js', 'TypeScript'] },
    { phase: 'Back-end & APIs com Node.js', title: 'Arquitetura em Camadas: Controllers, Services e Repositories', description: 'Separação de responsabilidades e desacoplamento de lógica de negócio.', position: 5, estimated_hours: 8, stacks: ['Node.js', 'Arquitetura & Segurança'] },

    // Fase 5: Banco de Dados & Modelagem
    { phase: 'Banco de Dados & Modelagem', title: 'Modelagem de Dados Relacional e Normalização (1FN, 2FN, 3FN)', description: 'Entidades, relacionamentos 1:1, 1:N, N:N e diagramas ER.', position: 1, estimated_hours: 8, stacks: ['SQL & SQLite'] },
    { phase: 'Banco de Dados & Modelagem', title: 'SQL na Prática: DDL, DML, Chaves Estrangeiras e Constraints', description: 'Criação de tabelas com constraints NOT NULL, UNIQUE, CHECK e CASCADE.', position: 2, estimated_hours: 8, stacks: ['SQL & SQLite'] },
    { phase: 'Banco de Dados & Modelagem', title: 'Consultas Avançadas: JOINs, Subqueries, Agrupamento e Agregações', description: 'INNER JOIN, LEFT JOIN, GROUP BY, HAVING e funções SUM/COUNT/AVG.', position: 3, estimated_hours: 8, stacks: ['SQL & SQLite'] },
    { phase: 'Banco de Dados & Modelagem', title: 'Otimização com Índices e Plano de Execução (EXPLAIN QUERY PLAN)', description: 'Criação de índices para filtros de status/datas e análise de custo de busca.', position: 4, estimated_hours: 6, stacks: ['SQL & SQLite'] },
    { phase: 'Banco de Dados & Modelagem', title: 'SQLite com better-sqlite3: Modo WAL e Transações Atômicas', description: 'Operações síncronas de alta performance, Write-Ahead Logging e transactions.', position: 5, estimated_hours: 6, stacks: ['SQL & SQLite', 'Node.js'] },

    // Fase 6: Qualidade, Testes & Boas Práticas
    { phase: 'Qualidade, Testes & Boas Práticas', title: 'Princípios de Clean Code e SOLID Aplicados ao TypeScript', description: 'Responsabilidade única, funções puras e legibilidade de código sustentável.', position: 1, estimated_hours: 8, stacks: ['TypeScript', 'Arquitetura & Segurança'] },
    { phase: 'Qualidade, Testes & Boas Práticas', title: 'Testes Unitários com Vitest: Mocks, Spies e Asserções', description: 'Configuração do Vitest, asserções de igualdade, exceptions e coverage.', position: 2, estimated_hours: 8, stacks: ['Testes Automatizados', 'TypeScript'] },
    { phase: 'Qualidade, Testes & Boas Práticas', title: 'Desenvolvimento Guiado por Testes (TDD): Algoritmos Puros', description: 'Ciclo Red-Green-Refactor implementando algoritmos determinísticos de cálculo.', position: 3, estimated_hours: 8, stacks: ['Testes Automatizados', 'TypeScript'] },
    { phase: 'Qualidade, Testes & Boas Práticas', title: 'Segurança Básica em Aplicações Web: Sanitização e SQL Injection', description: 'Queries parametrizadas, proteção contra XSS e princípios de menor privilégio.', position: 4, estimated_hours: 6, stacks: ['Arquitetura & Segurança'] },

    // Fase 7: DevOps, Containers & Deploy
    { phase: 'DevOps, Containers & Deploy', title: 'Docker: Fundamentos de Containers, Imagens e Volumes', description: 'Isolamento de processos, imagens base Alpine e mapeamento de volumes.', position: 1, estimated_hours: 8, stacks: ['Docker & DevOps'] },
    { phase: 'DevOps, Containers & Deploy', title: 'Docker Multi-stage Builds: Otimização de Imagens para Produção', description: 'Separação de build e runtime, redução de tamanho e usuário non-root.', position: 2, estimated_hours: 6, stacks: ['Docker & DevOps'] },
    { phase: 'DevOps, Containers & Deploy', title: 'Docker Compose: Orquestração Local e Políticas de Restart', description: 'Configuração de serviços, binding seguro 127.0.0.1 e persistência local.', position: 3, estimated_hours: 6, stacks: ['Docker & DevOps'] },
    { phase: 'DevOps, Containers & Deploy', title: 'Integração Contínua (CI): Pipelines com GitHub Actions', description: 'Automação de linting, testes unitários e verificação de build no PR.', position: 4, estimated_hours: 6, stacks: ['Docker & DevOps', 'Git & GitHub'] },
  ];

  db.transaction(() => {
    // 1. Inserir Stacks
    const insertStack = db.prepare('INSERT OR IGNORE INTO stacks (name, color) VALUES (?, ?)');
    for (const stack of stacks) {
      insertStack.run(stack.name, stack.color);
    }

    // 2. Inserir Fases
    const insertPhase = db.prepare('INSERT INTO phases (name, description, position) VALUES (?, ?, ?)');
    for (const phase of phases) {
      insertPhase.run(phase.name, phase.description, phase.position);
    }

    // Mapeamentos de ID
    const stackMap = new Map<string, number>();
    const allStacks = db.prepare('SELECT id, name FROM stacks').all() as { id: number; name: string }[];
    for (const s of allStacks) {
      stackMap.set(s.name, s.id);
    }

    const phaseMap = new Map<string, number>();
    const allPhases = db.prepare('SELECT id, name FROM phases').all() as { id: number; name: string }[];
    for (const p of allPhases) {
      phaseMap.set(p.name, p.id);
    }

    // 3. Inserir Tasks (alura_url NULL conforme instrução estrita)
    const insertTask = db.prepare(`
      INSERT INTO tasks (phase_id, title, description, status, position, estimated_hours, due_date, pinned_due_date, alura_url)
      VALUES (?, ?, ?, 'todo', ?, ?, NULL, 0, NULL)
    `);

    const insertTaskStack = db.prepare('INSERT INTO task_stacks (task_id, stack_id) VALUES (?, ?)');

    for (const task of tasks) {
      const phaseId = phaseMap.get(task.phase);
      if (!phaseId) continue;

      const result = insertTask.run(phaseId, task.title, task.description, task.position, task.estimated_hours);
      const taskId = Number(result.lastInsertRowid);

      for (const stackName of task.stacks) {
        const stackId = stackMap.get(stackName);
        if (stackId) {
          insertTaskStack.run(taskId, stackId);
        }
      }
    }

    // 4. Inserir Configurações Padrão
    const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('weekly_capacity_hours', '10');
    insertSetting.run('theme', 'dark');
    insertSetting.run('start_date', new Date().toISOString().slice(0, 10));
  })();

  console.log(`Seed successfully completed! Inserted ${stacks.length} stacks, ${phases.length} phases, ${tasks.length} tasks and default settings.`);
}

if (process.argv.includes('--run')) {
  try {
    runSeed(true);
    process.exit(0);
  } catch (err) {
    console.error('Seed execution error:', err);
    process.exit(1);
  }
}
