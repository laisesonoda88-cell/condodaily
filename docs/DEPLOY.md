# CondoDaily — Guia de Deploy e Conexão do Domínio

## Visão Geral da Infraestrutura

```
                    Internet
                       │
              ┌────────┴────────┐
              │   DNS (Registro.br / Cloudflare)
              │   condodaily.com.br → IP do servidor
              │   api.condodaily.com.br → IP do servidor
              └────────┬────────┘
                       │
              ┌────────┴────────┐
              │   Caddy (porta 80/443)
              │   SSL automático (Let's Encrypt)
              │   Reverse proxy
              └──┬──────────┬───┘
                 │          │
    ┌────────────┴┐    ┌───┴────────────┐
    │  Landing    │    │  Fastify API   │
    │  Page       │    │  (porta 3001)  │
    │  /privacy   │    │                │
    │  /terms     │    │  .well-known/  │
    └─────────────┘    └───┬────────────┘
                           │
                  ┌────────┴────────┐
                  │  PostgreSQL 16  │
                  │  (porta 5432)   │
                  └─────────────────┘
```

---

## Passo 1: Contratar um VPS

Recomendação (custo-benefício para Brasil):

| Provedor       | Plano           | Preço   | Observação                    |
|---------------|-----------------|---------|-------------------------------|
| **Hetzner**    | CX22 (2 vCPU)  | €4/mês  | Melhor preço, datacenter EU   |
| **DigitalOcean** | Basic (2 vCPU) | $12/mês | Datacenter São Paulo          |
| **Vultr**      | Cloud (2 vCPU)  | $12/mês | Datacenter São Paulo          |
| **AWS Lightsail** | 2 GB          | $10/mês | Datacenter São Paulo          |

**Requisitos mínimos**: 2 vCPU, 2 GB RAM, 40 GB SSD, Ubuntu 22.04+

---

## Passo 2: Configurar DNS do Domínio

No painel do registrador do domínio (Registro.br, GoDaddy, Cloudflare):

```
Tipo    Nome                   Valor              TTL
─────   ────────────────────   ────────────────   ────
A       condodaily.com.br      IP_DO_SERVIDOR     3600
A       www                    IP_DO_SERVIDOR     3600
A       api                    IP_DO_SERVIDOR     3600
```

> ⚠️ Após alterar o DNS, pode levar até 24h para propagar. Use `dig api.condodaily.com.br` para verificar.

---

## Passo 3: Preparar o Servidor

```bash
# Conectar ao servidor
ssh root@IP_DO_SERVIDOR

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Instalar Docker Compose plugin
apt install docker-compose-plugin -y

# Criar usuário de deploy (segurança — não usar root)
adduser deploy
usermod -aG docker deploy

# Logar como deploy
su - deploy

# Clonar repositório
git clone https://github.com/SEU_USUARIO/condodaily.git
cd condodaily
```

---

## Passo 4: Configurar Variáveis de Ambiente

```bash
# Copiar template
cp deploy/.env.production .env

# Editar com suas credenciais
nano .env
```

**Gerar segredos:**
```bash
# JWT_SECRET (64 chars):
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ENCRYPTION_KEY (32 bytes hex):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# DB_PASSWORD (32 chars):
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## Passo 5: Subir Tudo

```bash
# Build e start (primeira vez — pode levar 2-3 min)
docker compose up -d --build

# Ver logs
docker compose logs -f

# Verificar se tudo subiu
docker compose ps
```

**O que acontece automaticamente:**
1. ✅ PostgreSQL inicia e fica healthy
2. ✅ Fastify compila e inicia
3. ✅ Caddy detecta os domínios no Caddyfile
4. ✅ Caddy solicita certificado SSL ao Let's Encrypt
5. ✅ HTTPS funciona em segundos

---

## Passo 6: Rodar Migrações do Banco

```bash
# Entrar no container do server
docker compose exec server sh

# Rodar migrações do Drizzle
npx drizzle-kit push

# Rodar seed (categorias, dados iniciais)
node dist/db/seed.js

# Sair
exit
```

---

## Passo 7: Verificar

```bash
# API respondendo?
curl https://api.condodaily.com.br/api/health

# Deep links (Apple)
curl https://condodaily.com.br/.well-known/apple-app-site-association

# Deep links (Android)
curl https://condodaily.com.br/.well-known/assetlinks.json

# Landing page
curl https://condodaily.com.br

# Privacidade
curl https://condodaily.com.br/privacy/

# SSL válido?
curl -vI https://api.condodaily.com.br 2>&1 | grep "SSL certificate"
```

---

## Manutenção

### Atualizar o app (novo deploy)
```bash
cd condodaily
git pull
docker compose up -d --build
```

### Ver logs de erro
```bash
# Server
docker compose logs server --tail 100

# Caddy (proxy/SSL)
docker compose logs caddy --tail 100

# Banco
docker compose logs db --tail 100
```

### Backup do banco
```bash
# Fazer backup
docker compose exec db pg_dump -U postgres condodaily > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker compose exec -T db psql -U postgres condodaily < backup_20260301.sql
```

### Renovação SSL
Automática! Caddy renova os certificados sozinho. Zero manutenção.

### Reiniciar tudo
```bash
docker compose restart
```

### Parar tudo (sem perder dados)
```bash
docker compose down
# Volumes (banco + uploads) são preservados
```

---

## Troubleshooting

| Problema | Causa provável | Solução |
|----------|---------------|---------|
| SSL não funciona | DNS não propagou | Esperar 24h, verificar com `dig` |
| 502 Bad Gateway | Server não iniciou | `docker compose logs server` |
| Banco não conecta | Senha errada no .env | Verificar DB_PASSWORD |
| Deep links não funcionam | Arquivo .well-known não serve | Verificar com curl + Content-Type |
| Upload falha | Permissão do volume | `docker compose exec server ls -la uploads/` |

---

## Custos Estimados (Mensal)

| Item | Custo |
|------|-------|
| VPS (2 vCPU, 2 GB) | R$50-70/mês |
| Domínio (.com.br) | R$40/ano ≈ R$3/mês |
| Mercado Pago | 0% (cobra do comprador) |
| Anthropic API | ~R$20-50/mês (por uso) |
| **Total** | **~R$80-130/mês** |
