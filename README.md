# CondoDaily

Marketplace de serviços para condomínios. Conecta síndicos/administradoras a profissionais qualificados.

## Requisitos

- **Node.js** 20+ (recomendado 22)
- **Docker** (para o banco PostgreSQL)
- **Expo CLI**: `npm install -g eas-cli`
- **Xcode** (iOS) ou **Android Studio** (Android) para build local

## Setup Rápido (Automático)

```bash
# Roda tudo automaticamente: instala deps, sobe DB, configura .env, roda migrations
./scripts/setup.sh
```

## Setup Manual (Passo a Passo)

```bash
# 1. Instalar dependências (raiz do monorepo)
npm install

# 2. Subir o banco de dados
docker start condodaily-db || docker run -d --name condodaily-db \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=condodaily -p 5432:5432 postgres:16-alpine

# 3. Configurar variáveis de ambiente do servidor
cp server/.env.example server/.env
# Editar server/.env com seus valores

# 4. Rodar migrations e seed
cd server
npx drizzle-kit push
npx tsx src/db/seed-categories.ts
cd ..

# 5. Iniciar servidor (porta 3001)
cd server && npx tsx src/app.ts

# 6. Em outro terminal, iniciar app mobile
cd apps/mobile && npx expo start
```

## Estrutura do Projeto

```
├── apps/mobile/           # React Native + Expo (SDK 54)
│   ├── app/               # Telas (Expo Router file-based)
│   │   ├── (auth)/        # Login, registro, onboarding
│   │   ├── (contratante)/ # Telas do síndico/contratante
│   │   └── (profissional)/# Telas do profissional
│   ├── components/        # Componentes reutilizáveis
│   ├── constants/         # Tema, cores, tipografia
│   ├── services/          # Chamadas API (axios)
│   └── stores/            # Estado global (Zustand)
│
├── server/                # Backend Fastify 5 + TypeScript
│   ├── src/
│   │   ├── app.ts         # Entry point
│   │   ├── db/            # Schema Drizzle + migrations
│   │   ├── modules/       # Rotas por domínio
│   │   │   ├── auth/      # Login, registro, refresh token
│   │   │   ├── bookings/  # Agendamentos
│   │   │   ├── condos/    # Condomínios + análise IA
│   │   │   ├── payments/  # Mercado Pago + wallet
│   │   │   ├── penalties/ # Sistema de multas
│   │   │   ├── reviews/   # Avaliações
│   │   │   └── users/     # Profissionais + perfis
│   │   └── services/      # Serviços (MP, notificações, crypto, IA)
│   └── Dockerfile         # Build de produção
│
├── packages/shared/       # Constantes e tipos compartilhados
├── deploy/                # Arquivos de deploy
│   ├── Caddyfile          # Reverse proxy + SSL automático
│   ├── .env.production    # Template de variáveis de produção
│   └── www/               # Landing page, privacidade, termos
├── scripts/
│   └── setup.sh           # Setup automático para novos devs
├── docs/
│   ├── DEPLOY.md          # Guia completo de deploy em VPS
│   └── STORE_CHECKLIST.md # Checklist para App Store + Google Play
└── docker-compose.yml     # PostgreSQL + servidor + Caddy (SSL)
```

## Comandos do Dia a Dia

| Comando | O que faz |
|---------|-----------|
| `npm run dev:server` | Inicia servidor com hot-reload (tsx watch) |
| `npm run dev:mobile` | Inicia Expo dev server |
| `cd server && npm run db:generate` | Gera migration após mudar schema.ts |
| `cd server && npm run db:migrate` | Aplica migrations pendentes |
| `cd server && npm run db:studio` | Abre Drizzle Studio (UI do banco) |
| `cd server && npx tsc --noEmit` | Verifica tipos do servidor |
| `cd apps/mobile && npx tsc --noEmit` | Verifica tipos do mobile |

## Publicação nas Lojas

### Pré-requisitos (uma vez só)

1. **Conta Expo (EAS)**
   ```bash
   npx eas login
   cd apps/mobile && npx eas project:init
   ```
   Copie o `projectId` gerado para `app.json` → `extra.eas.projectId` e `updates.url`.

2. **Apple Developer Account** (iOS)
   - Criar App ID em [developer.apple.com](https://developer.apple.com)
   - Criar app no [App Store Connect](https://appstoreconnect.apple.com)
   - Preencher no `eas.json` → `submit.production.ios`:
     - `appleId`: seu email Apple
     - `ascAppId`: ID numérico do App Store Connect
     - `appleTeamId`: Team ID (encontra em developer.apple.com → Membership)

3. **Google Play Console** (Android)
   - Criar app no [Google Play Console](https://play.google.com/console)
   - Configuração → API Access → Criar service account
   - Baixar JSON key e salvar como `apps/mobile/google-services-key.json`

4. **Mercado Pago**
   - Pegar a chave pública de produção em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
   - Configurar no EAS: `eas secret:create --name EXPO_PUBLIC_MP_PUBLIC_KEY --value SUA_CHAVE`

### Build e Submissão

```bash
cd apps/mobile

# Build para as lojas (iOS + Android)
npx eas build --platform all --profile production

# Submeter para revisão
npx eas submit --platform ios --profile production
npx eas submit --platform android --profile production
```

### Atualização OTA (sem rebuild)

Para mudanças que não alteram código nativo (só JS/TS):

```bash
cd apps/mobile
npx eas update --branch production --message "descrição da mudança"
```

## Deploy em Produção

👉 **Guia completo**: [`docs/DEPLOY.md`](docs/DEPLOY.md)
👉 **Checklist das lojas**: [`docs/STORE_CHECKLIST.md`](docs/STORE_CHECKLIST.md)

```bash
# 1. Copiar e preencher variáveis
cp deploy/.env.production .env
nano .env

# 2. Build e rodar tudo (Caddy + API + DB)
docker compose up --build -d

# 3. Ver logs
docker compose logs -f
```

A stack de produção inclui:
- **Caddy** — Reverse proxy com SSL automático (Let's Encrypt)
- **Fastify** — API em Node.js 22 Alpine
- **PostgreSQL 16** — Banco de dados

### Variáveis de Ambiente Obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Segredo JWT (mínimo 32 caracteres) |
| `ENCRYPTION_KEY` | Chave AES-256 (mínimo 32 caracteres) |
| `MP_ACCESS_TOKEN` | Token de acesso Mercado Pago |
| `MP_WEBHOOK_SECRET` | Segredo para validar webhooks MP |
| `ANTHROPIC_API_KEY` | API key Claude (análise de documentos) |

## Segurança

O servidor possui:
- **@fastify/helmet** — Headers de segurança (HSTS, X-Frame-Options, etc.)
- **@fastify/rate-limit** — 100 req/min global, 10 req/min em auth
- **JWT com refresh token rotation** — Tokens single-use com blacklist
- **IDOR protection** — Todos os endpoints verificam ownership
- **Zod validation** — Todas as entradas são validadas
- **Path traversal guard** — Upload de documentos validado
- **Idempotência** — Header `Idempotency-Key` em pagamentos
- **HMAC timing-safe** — Verificação de webhook

## Usuários de Teste (Seed)

| Email | Senha | Role |
|-------|-------|------|
| `contratante@teste.com` | `teste123` | CONTRATANTE |
| `profissional@teste.com` | `teste123` | PROFISSIONAL |

## Cores do App

| Cor | Hex | Uso |
|-----|-----|-----|
| Primary | `#1B7A6E` | Botões, headers, destaques |
| Secondary | `#F5A623` | Alertas, badges, CTAs |
| Dark | `#1A2B3C` | Texto principal |

## Contato

- **Dona do projeto**: Laise Rabelo
- **Domínio**: condodaily.com.br
- **Suporte**: contato@condodaily.com.br
