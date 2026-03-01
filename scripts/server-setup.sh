#!/bin/bash
# ═══════════════════════════════════════════════════════════
# CondoDaily — Server Setup (Hetzner Ubuntu 24.04)
# ═══════════════════════════════════════════════════════════
# Rodar UMA VEZ no servidor novo:
#   ssh root@77.42.80.190
#   bash server-setup.sh
# ═══════════════════════════════════════════════════════════

set -euo pipefail

echo "════════════════════════════════════════════"
echo "  CondoDaily — Configurando servidor..."
echo "════════════════════════════════════════════"

# ─── 1. Atualizar sistema ────────────────────────────────
echo ""
echo "📦 [1/5] Atualizando sistema..."
apt update && apt upgrade -y

# ─── 2. Instalar Docker ──────────────────────────────────
echo ""
echo "🐳 [2/5] Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "   ✅ Docker instalado: $(docker --version)"
else
    echo "   ✅ Docker já instalado: $(docker --version)"
fi

# ─── 3. Instalar Docker Compose plugin ───────────────────
echo ""
echo "🔧 [3/5] Verificando Docker Compose..."
if docker compose version &> /dev/null; then
    echo "   ✅ Docker Compose: $(docker compose version)"
else
    echo "   ❌ Docker Compose não encontrado. Instalando..."
    apt install -y docker-compose-plugin
    echo "   ✅ Docker Compose: $(docker compose version)"
fi

# ─── 4. Configurar firewall ──────────────────────────────
echo ""
echo "🔒 [4/5] Configurando firewall..."
if command -v ufw &> /dev/null; then
    ufw allow OpenSSH
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 443/udp  # HTTP/3 (QUIC)
    echo "y" | ufw enable 2>/dev/null || true
    ufw status
    echo "   ✅ Firewall configurado"
else
    echo "   ⚠ ufw não encontrado, pulando firewall"
fi

# ─── 5. Criar diretório do projeto ───────────────────────
echo ""
echo "📁 [5/5] Criando diretório do projeto..."
mkdir -p /opt/condodaily
echo "   ✅ /opt/condodaily criado"

# ─── Configurar swap (4GB) ───────────────────────────────
echo ""
echo "💾 Configurando swap (4GB)..."
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "   ✅ Swap 4GB ativado"
else
    echo "   ✅ Swap já existe"
fi

# ─── Configurar timezone ─────────────────────────────────
echo ""
echo "🕐 Configurando timezone..."
timedatectl set-timezone America/Sao_Paulo
echo "   ✅ Timezone: $(timedatectl show --property=Timezone --value)"

echo ""
echo "════════════════════════════════════════════"
echo "  ✅ Servidor configurado com sucesso!"
echo "════════════════════════════════════════════"
echo ""
echo "Próximo passo: No seu Mac, rodar:"
echo "  cd ~/Desktop/CONODAILY"
echo "  bash scripts/deploy.sh"
echo ""
