#!/bin/bash
# ═══════════════════════════════════════════════════════════
# CondoDaily — Deploy Script (rodar no Mac local)
# ═══════════════════════════════════════════════════════════
# Uso:
#   cd ~/Desktop/CONODAILY
#   bash scripts/deploy.sh
#
# O que faz:
#   1. Copia o código para o servidor via rsync
#   2. SSHa no servidor e roda docker compose
# ═══════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuração ─────────────────────────────────────────
SERVER_IP="77.42.80.190"
SERVER_USER="root"
SERVER_DIR="/opt/condodaily"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "════════════════════════════════════════════"
echo "  CondoDaily — Deploy para Produção"
echo "════════════════════════════════════════════"
echo ""
echo "📍 Projeto local: $PROJECT_DIR"
echo "🖥  Servidor: $SERVER_USER@$SERVER_IP:$SERVER_DIR"
echo ""

# ─── 1. Verificar .env no servidor ───────────────────────
echo "🔍 [1/3] Verificando .env no servidor..."
if ! ssh "$SERVER_USER@$SERVER_IP" "test -f $SERVER_DIR/.env"; then
    echo ""
    echo "⚠  Arquivo .env NÃO encontrado no servidor!"
    echo "   Copiando template para o servidor..."
    scp "$PROJECT_DIR/deploy/.env.production" "$SERVER_USER@$SERVER_IP:$SERVER_DIR/.env"
    echo ""
    echo "❗ IMPORTANTE: Você precisa editar o .env no servidor ANTES de continuar:"
    echo "   ssh $SERVER_USER@$SERVER_IP"
    echo "   nano $SERVER_DIR/.env"
    echo ""
    echo "   Preencha todas as variáveis (DB_PASSWORD, JWT_SECRET, etc.)"
    echo "   Depois rode este script novamente."
    echo ""
    exit 1
fi
echo "   ✅ .env encontrado"

# ─── 2. Sincronizar código ───────────────────────────────
echo ""
echo "📦 [2/3] Sincronizando código com o servidor..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '*.pdf' \
    --exclude '*.png' \
    --exclude '*.dmg' \
    --exclude '*.rtf' \
    --exclude '*.html' \
    --exclude 'Docker.dmg' \
    --exclude '.claude/' \
    --exclude 'server/uploads/' \
    --exclude 'server/dist/' \
    --exclude 'packages/shared/dist/' \
    --exclude 'apps/' \
    --exclude 'condodaily-brand*.html' \
    --exclude '*.pdf' \
    --include 'deploy/www/***' \
    "$PROJECT_DIR/" "$SERVER_USER@$SERVER_IP:$SERVER_DIR/"

echo "   ✅ Código sincronizado"

# ─── 3. Build e deploy ───────────────────────────────────
echo ""
echo "🚀 [3/3] Fazendo build e deploy no servidor..."
ssh "$SERVER_USER@$SERVER_IP" bash -s << 'REMOTE_SCRIPT'
    cd /opt/condodaily

    echo "   🐳 Parando containers antigos..."
    docker compose down 2>/dev/null || true

    echo "   🔨 Construindo imagens..."
    docker compose up -d --build

    echo ""
    echo "   ⏳ Aguardando servidor ficar saudável..."
    sleep 15

    echo "   📊 Status dos containers:"
    docker compose ps

    echo ""
    echo "   🏥 Health check:"
    curl -sf http://localhost:3001/api/health 2>/dev/null && echo "" || echo "   ⚠ API ainda iniciando... aguarde 30s e teste novamente"
REMOTE_SCRIPT

echo ""
echo "════════════════════════════════════════════"
echo "  ✅ Deploy concluído!"
echo "════════════════════════════════════════════"
echo ""
echo "🌐 URLs:"
echo "   API:     https://api.condodaily.com.br/api/health"
echo "   Site:    https://condodaily.com.br"
echo ""
echo "📋 Comandos úteis (no servidor):"
echo "   ssh $SERVER_USER@$SERVER_IP"
echo "   cd $SERVER_DIR"
echo "   docker compose logs -f          # Ver logs"
echo "   docker compose restart server   # Reiniciar API"
echo "   docker compose down             # Parar tudo"
echo "   docker compose up -d --build    # Rebuild + restart"
echo ""
