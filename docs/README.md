# Documentação - DevPath

## Visão Geral
O **DevPath** é um gerenciador de estudos pessoal e local para acompanhar a pós-graduação da FIAP e cursos da Alura na trilha Full Stack.

## Execução em Desenvolvimento (Sem Docker)

1. **Instalar pacotes:**
   ```bash
   npm install
   ```

2. **Banco e Migrações:**
   O arquivo SQLite (`data/studyflow.sqlite`) e o seed são provisionados automaticamente na primeira inicialização.
   Para rodar o seed manualmente:
   ```bash
   npm run db:seed
   ```

3. **Iniciar Servidor Dev:**
   ```bash
   npm run dev
   ```
   Acesse: `http://localhost:3000`

4. **Rodar Testes com Vitest:**
   ```bash
   npm run test
   ```

## Guias Adicionais
- [SQLITE.md](SQLITE.md) - DDL, consultas, inspeção e backup
- [DOCKER.md](DOCKER.md) - Execução com Docker Compose
- [database.md](database.md) - Modelagem de dados e derivações
