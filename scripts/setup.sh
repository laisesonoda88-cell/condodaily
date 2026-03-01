#!/bin/bash
# ═══════════════════════════════════════════════════════════
# CondoDaily — Script de Setup para Desenvolvimento Local
# ═══════════════════════════════════════════════════════════
# Uso: ./scripts/setup.sh
#
# O que faz:
# 1. Verifica pré-requisitos (Node, Docker, npm)
# 2. Instala dependências
# 3. Sobe o banco de dados PostgreSQL (Docker)
# 4. Cria arquivo .env se não existir
# 5. Roda migrações e seed do banco
# 6. Mostra próximos passos

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}🏢 CondoDaily — Setup de Desenvolvimento${NC}"
echo "════════════════════════════════════════════"
echo ""

# ─── Pré-requisitos ────────────────────────────────────
echo -e "${BLUE}▸ Verificando pré-requisitos...${NC}"

check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}✗ $1 não encontrado. Instale: $2${NC}"
    exit 1
  fi
  echo -e "  ${GREEN}✓${NC} $1 $(eval "$3" 2>/dev/null || echo 'ok')"
}

check_command "node" "https://nodejs.org (v20+)" "node --version"
check_command "npm" "Incluído com Node.js" "npm --version"
check_command "docker" "https://docs.docker.com/get-docker/" "docker --version | cut -d' ' -f3"
echo ""

# Verificar versão do Node (mínimo 20)
NODE_MAJOR=$(node --version | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo -e "${RED}✗ Node.js 20+ necessário. Versão atual: $(node --version)${NC}"
  exit 1
fi

# ─── Dependências ──────────────────────────────────────
echo -e "${BLUE}▸ Instalando dependências (npm workspaces)...${NC}"
npm install
echo -e "  ${GREEN}✓${NC} Dependências instaladas"
echo ""

# ─── PostgreSQL via Docker ─────────────────────────────
echo -e "${BLUE}▸ Verificando PostgreSQL...${NC}"

DB_CONTAINER="condodaily-db"
DB_RUNNING=$(docker ps -q -f name="$DB_CONTAINER" 2>/dev/null || true)

if [ -n "$DB_RUNNING" ]; then
  echo -e "  ${GREEN}✓${NC} PostgreSQL já rodando ($DB_CONTAINER)"
else
  DB_EXISTS=$(docker ps -aq -f name="$DB_CONTAINER" 2>/dev/null || true)
  if [ -n "$DB_EXISTS" ]; then
    echo -e "  ${YELLOW}→${NC} Iniciando container existente..."
    docker start "$DB_CONTAINER"
  else
    echo -e "  ${YELLOW}→${NC} Criando container PostgreSQL..."
    docker run -d \
      --name "$DB_CONTAINER" \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=condodaily \
      -p 5432:5432 \
      postgres:16-alpine
    echo -e "  ${YELLOW}→${NC} Aguardando banco ficar pronto..."
    sleep 3
  fi
  echo -e "  ${GREEN}✓${NC} PostgreSQL rodando em localhost:5432"
fi
echo ""

# ─── Arquivo .env ──────────────────────────────────────
echo -e "${BLUE}▸ Configurando .env...${NC}"

ENV_FILE="server/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp server/.env.example "$ENV_FILE"
  echo -e "  ${GREEN}✓${NC} Criado $ENV_FILE a partir do template"
  echo -e "  ${YELLOW}⚠ Edite $ENV_FILE e preencha suas chaves (MP, Anthropic)${NC}"
else
  echo -e "  ${GREEN}✓${NC} $ENV_FILE já existe"
fi
echo ""

# ─── Migrações ─────────────────────────────────────────
echo -e "${BLUE}▸ Rodando migrações do banco (Drizzle)...${NC}"
cd server
npx drizzle-kit push 2>/dev/null && echo -e "  ${GREEN}✓${NC} Schema aplicado" || echo -e "  ${YELLOW}⚠ Falha na migração — verifique o DATABASE_URL no .env${NC}"
cd ..
echo ""

# ─── Seed (dados iniciais) ─────────────────────────────
echo -e "${BLUE}▸ Rodando seed (categorias e dados iniciais)...${NC}"
cd server
npx tsx src/db/seed-categories.ts 2>/dev/null && echo -e "  ${GREEN}✓${NC} Seed executado" || echo -e "  ${YELLOW}⚠ Seed falhou (pode já ter sido executado)${NC}"
cd ..
echo ""

# ─── Resultado ─────────────────────────────────────────
echo "════════════════════════════════════════════"
echo -e "${GREEN}✅ Setup concluído!${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo ""
echo "  1. Preencha as chaves no server/.env:"
echo "     - MP_ACCESS_TOKEN (Mercado Pago)"
echo "     - MP_PUBLIC_KEY"
echo "     - ANTHROPIC_API_KEY"
echo ""
echo "  2. Inicie o servidor backend:"
echo -e "     ${YELLOW}cd server && npx tsx src/app.ts${NC}"
echo ""
echo "  3. Inicie o app mobile:"
echo -e "     ${YELLOW}cd apps/mobile && npx expo start${NC}"
echo ""
echo "  4. Usuário de teste:"
echo "     Email: sindico@teste.com"
echo "     Senha: teste123"
echo ""
echo -e "${GREEN}🏢 Bom desenvolvimento!${NC}"
