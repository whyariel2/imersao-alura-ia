# DOCKER.md - Guia de Execução em Containers

Este guia orienta a execução segura e local do **DevPath** via Docker e Docker Compose.

---

## 1. Pré-requisitos
- **Docker Engine** (versão 24+ ou Docker Desktop atualizado)
- **Docker Compose** (versão 2+)

---

## 2. Comandos Principais

### Subir a Aplicação (Primeira Execução ou Segundo Plano)
```bash
docker compose up -d
```
O build multi-stage será realizado com Node.js 26.13.0 LTS em Alpine Linux, compilando o frontend Angular e o backend Fastify e executando como usuário não-root (`node`).

### Visualizar Logs em Tempo Real
```bash
docker compose logs -f study-flow
```

### Parar o Container (sem perder dados)
```bash
docker compose down
```

### Reconstruir a Imagem (após alterações no código)
```bash
docker compose up --build -d
```

---

## 3. Persistência de Dados (Onde ficam os dados?)

Os dados do SQLite são persistidos de forma segura no volume nomeado do Docker:
- **Volume:** `studyflow_data`
- **Caminho interno no container:** `/app/data`
- **Arquivo do banco:** `/app/data/studyflow.sqlite`

Mesmo se o container for destruído via `docker compose down`, os dados de suas tarefas e horas de estudo permanecem intactos.

Para inspecionar o volume no Docker:
```bash
docker volume inspect studyflow_data
```

---

## 4. Segurança Local: Como Verificar que a Porta NÃO está Exposta na Rede

Por design de segurança estrita para aplicação local e mono-usuário:
- O `docker-compose.yml` publica a porta exclusivamente no loopback local: `127.0.0.1:3000:3000`.
- Outros dispositivos na sua rede Wi-Fi/Ethernet não conseguem acessar o app.

### Como Auditar:
1. Verifique a saída do Docker Compose:
   ```bash
   docker compose ps
   ```
   A coluna `PORTS` deve exibir explicitamente:
   `127.0.0.1:3000->3000/tcp` (e **NUNCA** `0.0.0.0:3000->3000/tcp`).

2. Verifique via socket no Linux/macOS:
   ```bash
   ss -tulpn | grep 3000
   # ou
   netstat -an | grep 3000
   ```
   O listener deve estar atrelado estritamente a `127.0.0.1:3000`.
