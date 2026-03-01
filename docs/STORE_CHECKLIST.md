# CondoDaily — Checklist de Publicação nas Lojas

## Pré-requisitos Gerais

- [ ] Servidor em produção funcionando (`https://api.condodaily.com.br/api/health`)
- [ ] Deep links verificados (`/.well-known/apple-app-site-association` e `assetlinks.json`)
- [ ] Política de privacidade web (`https://condodaily.com.br/privacy`)
- [ ] Termos de uso web (`https://condodaily.com.br/terms`)
- [ ] Conta Expo criada (`https://expo.dev/signup`) — owner: `condodaily`
- [ ] EAS CLI instalado: `npm install -g eas-cli`
- [ ] Projeto vinculado: `cd apps/mobile && eas project:init`

---

## 📱 Apple App Store (iOS)

### Conta Apple Developer
- [ ] Conta Apple Developer ativa ($99/ano) — `https://developer.apple.com/enroll/`
- [ ] Aceitar os termos no Apple Developer Portal
- [ ] Criar um **App ID** no portal (bundle ID: `br.com.condodaily.app`)

### EAS + Credenciais
- [ ] Preencher no `apps/mobile/eas.json`:
  ```json
  "submit": {
    "production": {
      "ios": {
        "appleId": "seu-apple-id@email.com",
        "ascAppId": "ID_DO_APP_NO_APPSTORECONNECT",
        "appleTeamId": "TEAM_ID"
      }
    }
  }
  ```
- [ ] Preencher no `apps/mobile/app.json`:
  ```json
  "extra": { "eas": { "projectId": "ID_DO_EAS_PROJECT" } }
  ```
- [ ] Atualizar `TEAM_ID_AQUI` no `apple-app-site-association`

### App Store Connect
- [ ] Criar app no [App Store Connect](https://appstoreconnect.apple.com)
- [ ] Preencher informações básicas:
  - Nome: `CondoDaily`
  - Subtitle: `Serviços para Condomínios`
  - Categoria primária: `Business`
  - Categoria secundária: `Lifestyle`
- [ ] Adicionar descrição (português):
  ```
  CondoDaily conecta condomínios a profissionais de manutenção qualificados.

  Para Síndicos e Administradoras:
  • Cadastre seu condomínio e faça upload da convenção
  • A IA analisa o documento e recomenda serviços
  • Agende limpeza, jardinagem, manutenção e mais
  • Controle checklist de manutenções obrigatórias
  • Pague com PIX, cartão ou boleto via Mercado Pago

  Para Profissionais:
  • Cadastre-se e faça o quiz de qualificação
  • Receba agendamentos de condomínios da sua região
  • Faça check-in por geolocalização
  • Receba via PIX direto na sua conta

  Segurança e Transparência:
  • Taxa de 5% + R$5 de seguro por serviço
  • Multa de 30% para cancelamento tardio ou no-show
  • Avaliação mútua após cada serviço
  • Regra anti-habitualidade (máx 3 serviços/profissional/mês)
  ```
- [ ] Adicionar palavras-chave: `condomínio, manutenção, limpeza, síndico, serviços, profissional, jardinagem, elétrica`
- [ ] URL de privacidade: `https://condodaily.com.br/privacy`
- [ ] URL de suporte: `https://condodaily.com.br`

### Screenshots (OBRIGATÓRIO)
Necessárias para dois tamanhos:
- [ ] iPhone 6.7" (1290×2796) — iPhone 15 Pro Max
- [ ] iPhone 6.5" (1284×2778) — iPhone 14 Plus
- [ ] iPad 12.9" (2048×2732) — se `supportsTablet: true`

**Telas recomendadas (5-8 screenshots):**
1. Tela de login/onboarding
2. Tela de seleção de condomínio
3. Dashboard com recomendações de serviços
4. Checklist de manutenções
5. Busca de profissionais + perfil
6. Agendamento com estimativa inteligente
7. Tela de pagamento
8. Dashboard do profissional

### Build & Submit
```bash
cd apps/mobile

# Build de produção
eas build --platform ios --profile production

# Enviar para App Store Connect
eas submit --platform ios --profile production
```

### Review da Apple (checklist de aprovação)
- [ ] App não trava ou crasha
- [ ] Login funciona (fornecer conta demo no review notes)
- [ ] Pagamentos usam In-App Purchase OU serviço físico fora do app ✅ (nosso caso — serviços de manutenção são físicos, Mercado Pago é aceito)
- [ ] Localização tem justificativa clara (check-in/check-out de serviços)
- [ ] Privacidade marcada corretamente no App Privacy questionnaire
- [ ] NSUserTrackingUsageDescription NÃO necessário (não usamos tracking)

**Review Notes (para o reviewer da Apple):**
```
Demo account:
Email: sindico@teste.com
Password: teste123

This app connects condominium administrators with maintenance
professionals. Location is used for service check-in/check-out.
Payments are for physical services (not digital goods) and
processed via Mercado Pago.
```

---

## 🤖 Google Play Store (Android)

### Conta Google Play
- [ ] Conta Google Play Developer ativa ($25 taxa única) — `https://play.google.com/console/signup`
- [ ] Aceitar os termos

### EAS + Credenciais
- [ ] Criar service account no Google Cloud Console:
  1. Ir para [Google Cloud Console](https://console.cloud.google.com)
  2. Criar projeto (ou usar existente)
  3. IAM > Service Accounts > Create
  4. Dar permissão "Service Account User"
  5. Criar chave JSON → salvar como `apps/mobile/google-services-key.json`
  6. No Google Play Console: Setup > API Access > vincular service account
- [ ] Preencher no `apps/mobile/eas.json`:
  ```json
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-services-key.json",
        "track": "internal"
      }
    }
  }
  ```
- [ ] Atualizar `SHA256_FINGERPRINT_AQUI` no `assetlinks.json`
  ```bash
  # Pegar o fingerprint do keystore EAS:
  eas credentials --platform android
  # Ou do keystore local:
  keytool -list -v -keystore upload-keystore.jks | grep SHA256
  ```

### Google Play Console
- [ ] Criar app no [Google Play Console](https://play.google.com/console)
- [ ] Preencher:
  - Nome: `CondoDaily`
  - Descrição curta: `Conecte seu condomínio a profissionais de manutenção qualificados`
  - Descrição completa: (mesma da App Store acima)
  - Categoria: `Business`
- [ ] Classificação de conteúdo: preencher questionário (sem violência, sem conteúdo adulto)
- [ ] Data safety questionnaire:
  - Coleta localização: Sim (check-in/check-out)
  - Coleta nome, email, telefone: Sim (cadastro)
  - Dados financeiros coletados: Não (Mercado Pago processa)
  - Dados compartilhados: Sim (com profissionais contratados)
  - Criptografia em trânsito: Sim (HTTPS)

### Screenshots (OBRIGATÓRIO)
- [ ] Mínimo 2 screenshots por device type
- [ ] Phone: 1080×1920 ou similar (16:9)
- [ ] Tablet 7": 1200×1920 (opcional mas recomendado)
- [ ] Tablet 10": 1800×2560 (opcional mas recomendado)

### Build & Submit
```bash
cd apps/mobile

# Build de produção (gera .aab)
eas build --platform android --profile production

# Enviar para Google Play (track: internal primeiro)
eas submit --platform android --profile production
```

### Tracks de lançamento
1. **Internal testing** — só para sua equipe (precisa adicionar emails)
2. **Closed testing** — convidar beta testers
3. **Open testing** — qualquer pessoa pode testar
4. **Production** — loja pública

**Recomendação:** Comece com Internal → Closed → Production (pular Open)

Para mudar para produção depois:
```json
// eas.json → submit.production.android
"track": "production"
```

---

## 🔄 Após Publicação

### OTA Updates (sem passar pela loja)
Para correções de bugs e melhorias pequenas (sem mudanças nativas):
```bash
cd apps/mobile
eas update --branch production --message "Correção do bug X"
```

### Nova Versão (com mudanças nativas)
1. Atualizar `version` no `app.json` (ex: "1.0.0" → "1.1.0")
2. Build + Submit novamente
3. Esperar review das lojas

### Monitoramento
- **Expo Updates**: `https://expo.dev` — ver OTA deploys
- **App Store Connect**: vendas, crashs, reviews
- **Google Play Console**: ANR, crashes, reviews
- **Server**: `docker compose logs server --tail 100`

---

## Timeline Típica

| Etapa | Tempo |
|-------|-------|
| Preparar contas (Apple + Google) | 1-3 dias |
| Criar screenshots | 1 dia |
| Preencher metadados das lojas | 1 dia |
| Build + Submit | 30 min |
| Review da Apple | 1-7 dias (média 2 dias) |
| Review do Google | 1-3 dias (média 1 dia) |
| **Total estimado** | **~1-2 semanas** |
