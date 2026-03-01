#!/bin/bash
# ═══════════════════════════════════════════════════════════
# CondoDaily — Deploy Script (rodar no Mac local)
# ═══════════════════════════════════════════════════════════
# Uso:
#   cd ~/Desktop/CONODAILY
#   bash scripts/deploy.sh
#
# O que faz:
#   1. Faz git push local
#   2. SSHa no servidor, faz git pull, rebuild e deploy
# ═══════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuração ─────────────────────────────────────────
SERVER_IP="77.42.80.190"
SERVER_USER="root"
SERVER_DIR="/opt/condodaily"
REPO_URL="https://github.com/laisesonoda88-cell/condodaily.git"

echo "════════════════════════════════════════════"
echo "  CondoDaily — Deploy para Produção"
echo "════════════════════════════════════════════"
echo ""

# ─── 1. Push local ────────────────────────────────────────
echo "📤 [1/3] Verificando se há commits para enviar..."
if git status --porcelain | grep -q .; then
    echo "   ⚠ Há alterações não commitadas. Commite antes de fazer deploy."
    git status --short
    exit 1
fi
git push origin main 2>/dev/null && echo "   ✅ Push feito" || echo "   ✅ Já está atualizado"

# ─── 2. Clone/Pull no servidor ───────────────────────────
echo ""
echo "📦 [2/3] Atualizando código no servidor..."
ssh "$SERVER_USER@$SERVER_IP" bash -s <<REMOTE_PULL
    if [ ! -d "$SERVER_DIR/.git" ]; then
        echo "   📥 Primeira vez: clonando repositório..."
        rm -rf "$SERVER_DIR"
        git clone "$REPO_URL" "$SERVER_DIR"
    else
        echo "   📥 Atualizando repositório..."
        cd "$SERVER_DIR"
        git fetch origin
        git reset --hard origin/main
    fi
REMOTE_PULL
echo "   ✅ Código atualizado no servidor"

# ─── 3. Verificar .env e Build ────────────────────────────
echo ""
echo "🚀 [3/3] Build e deploy..."
ssh "$SERVER_USER@$SERVER_IP" bash -s <<'REMOTE_BUILD'
    cd /opt/condodaily

    # Verificar .env
    if [ ! -f .env ]; then
        echo ""
        echo "   ⚠  Arquivo .env NÃO encontrado!"
        echo "   Copiando template..."
        cp deploy/.env.production .env
        echo ""
        echo "   ❗ EDITE o .env antes de continuar:"
        echo "      nano /opt/condodaily/.env"
        echo ""
        echo "   Depois rode: bash scripts/deploy.sh"
        exit 1
    fi

    echo "   ✅ .env encontrado"

    echo "   🐳 Parando containers antigos..."
    docker compose down 2>/dev/null || true

    echo "   🔨 Construindo imagens (pode levar 2-3 min)..."
    docker compose up -d --build

    echo ""
    echo "   ⏳ Aguardando servidor ficar saudável..."
    sleep 15

    echo "   📊 Status dos containers:"
    docker compose ps

    echo ""
    echo "   🏥 Health check:"
    curl -sf http://localhost:3001/api/health 2>/dev/null && echo "" || echo "   ⚠ API ainda iniciando... aguarde 30s e teste"

    echo ""
    echo "   🧹 Limpando imagens antigas..."
    docker image prune -f 2>/dev/null || true
REMOTE_BUILD

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
