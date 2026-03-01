import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

interface CardTokenizerProps {
  publicKey: string;
  amount: number;
  onTokenGenerated: (token: string, cardInfo: { lastFour: string; brand: string }) => void;
  onError: (error: string) => void;
}

export function CardTokenizer({
  publicKey,
  amount,
  onTokenGenerated,
  onError,
}: CardTokenizerProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://sdk.mercadopago.com/js/v2"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: transparent;
          padding: 8px;
        }
        .field-container {
          margin-bottom: 12px;
        }
        label {
          display: block;
          font-size: 14px;
          color: #1A2B3C;
          font-weight: 500;
          margin-bottom: 4px;
        }
        input, select {
          width: 100%;
          height: 48px;
          border: 1.5px solid #ECEFF1;
          border-radius: 12px;
          padding: 0 14px;
          font-size: 16px;
          color: #1A2B3C;
          background: #FFFFFF;
          outline: none;
          transition: border-color 0.2s;
        }
        input:focus, select:focus {
          border-color: #1B7A6E;
        }
        .row {
          display: flex;
          gap: 8px;
        }
        .row .field-container {
          flex: 1;
        }
        #btn-submit {
          width: 100%;
          height: 52px;
          background: #1B7A6E;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
        }
        #btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .error {
          color: #C62828;
          font-size: 12px;
          margin-top: 4px;
        }
        #error-msg {
          color: #C62828;
          font-size: 14px;
          text-align: center;
          margin-top: 8px;
          display: none;
        }
      </style>
    </head>
    <body>
      <form id="form-checkout">
        <div class="field-container">
          <label>Numero do cartao</label>
          <div id="form-checkout__cardNumber"></div>
        </div>
        <div class="row">
          <div class="field-container">
            <label>Validade</label>
            <div id="form-checkout__expirationDate"></div>
          </div>
          <div class="field-container">
            <label>CVV</label>
            <div id="form-checkout__securityCode"></div>
          </div>
        </div>
        <div class="field-container">
          <label>Nome no cartao</label>
          <input type="text" id="form-checkout__cardholderName" placeholder="Como aparece no cartao">
        </div>
        <div class="field-container">
          <label>CPF do titular</label>
          <input type="text" id="form-checkout__identificationNumber" placeholder="000.000.000-00" maxlength="14">
        </div>
        <div class="field-container">
          <label>Parcelas</label>
          <select id="form-checkout__installments">
            <option value="1">1x sem juros</option>
          </select>
        </div>
        <input type="hidden" id="form-checkout__identificationType" value="CPF">
        <button type="submit" id="btn-submit">Pagar</button>
        <div id="error-msg"></div>
      </form>

      <script>
        const mp = new MercadoPago('${publicKey}', { locale: 'pt-BR' });

        const cardForm = mp.cardForm({
          amount: '${amount.toFixed(2)}',
          iframe: true,
          form: {
            id: 'form-checkout',
            cardNumber: { id: 'form-checkout__cardNumber', placeholder: '0000 0000 0000 0000' },
            expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/AA' },
            securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
            cardholderName: { id: 'form-checkout__cardholderName' },
            identificationNumber: { id: 'form-checkout__identificationNumber' },
            identificationType: { id: 'form-checkout__identificationType' },
            installments: { id: 'form-checkout__installments' },
          },
          callbacks: {
            onFormMounted: () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mounted' }));
            },
            onSubmit: (event) => {
              event.preventDefault();
              const btn = document.getElementById('btn-submit');
              btn.disabled = true;
              btn.textContent = 'Processando...';

              const { token, lastFourDigits, paymentMethodId } = cardForm.getCardFormData();

              if (token) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'token',
                  data: {
                    token: token,
                    lastFour: lastFourDigits,
                    brand: paymentMethodId,
                  },
                }));
              } else {
                btn.disabled = false;
                btn.textContent = 'Pagar';
                document.getElementById('error-msg').style.display = 'block';
                document.getElementById('error-msg').textContent = 'Erro ao gerar token. Verifique os dados.';
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  message: 'Erro ao gerar token do cartao',
                }));
              }
            },
            onFetching: (resource) => {
              const btn = document.getElementById('btn-submit');
              btn.disabled = true;
              btn.textContent = 'Processando...';
              return () => {
                btn.disabled = false;
                btn.textContent = 'Pagar';
              };
            },
            onError: (error) => {
              document.getElementById('error-msg').style.display = 'block';
              document.getElementById('error-msg').textContent = 'Erro ao processar cartao.';
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: error.message || 'Erro ao processar cartao',
              }));
            },
          },
        });
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'mounted') {
        setLoading(false);
      } else if (message.type === 'token') {
        onTokenGenerated(message.data.token, {
          lastFour: message.data.lastFour,
          brand: message.data.brand,
        });
      } else if (message.type === 'error') {
        onError(message.message);
      }
    } catch {}
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando formulário seguro...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={[styles.webview, loading && styles.hidden]}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        originWhitelist={['*']}
      />
      <View style={styles.securityBadge}>
        <Text style={styles.securityText}>
          Seus dados de cartão são processados com segurança pelo Mercado Pago
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 420,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    minHeight: 380,
  },
  hidden: {
    height: 0,
    opacity: 0,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    zIndex: 1,
    gap: SPACING.md,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  securityBadge: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primarySubtle,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  securityText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
