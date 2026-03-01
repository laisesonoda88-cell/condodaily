import { MercadoPagoConfig, Payment, PaymentRefund } from 'mercadopago';
import crypto from 'crypto';
import {
  PLATFORM_FEE_PERCENTAGE,
  INSURANCE_FEE_FIXED,
  MP_PIX_EXPIRATION_MINUTES,
  MP_BOLETO_EXPIRATION_DAYS,
} from '@condodaily/shared';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || '',
});

const paymentApi = new Payment(client);
const refundApi = new PaymentRefund(client);

interface CreatePixPaymentParams {
  amount: number;
  payerEmail: string;
  payerCpf: string;
  payerName: string;
  description: string;
  externalReference: string;
}

interface CreateCardPaymentParams {
  amount: number;
  cardToken: string;
  payerEmail: string;
  payerCpf: string;
  payerName: string;
  installments: number;
  description: string;
  externalReference: string;
}

interface CreateBoletoPaymentParams {
  amount: number;
  payerEmail: string;
  payerCpf: string;
  payerName: string;
  description: string;
  externalReference: string;
}

interface PixTransferParams {
  amount: number;
  pixKey: string;
  pixKeyType: string;
  description: string;
  externalReference: string;
}

export const mercadoPagoService = {
  async createPixPayment(params: CreatePixPaymentParams) {
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + MP_PIX_EXPIRATION_MINUTES);

    const response = await paymentApi.create({
      body: {
        transaction_amount: params.amount,
        description: params.description,
        payment_method_id: 'pix',
        external_reference: params.externalReference,
        payer: {
          email: params.payerEmail,
          first_name: params.payerName.split(' ')[0],
          last_name: params.payerName.split(' ').slice(1).join(' ') || '',
          identification: {
            type: 'CPF',
            number: params.payerCpf.replace(/\D/g, ''),
          },
        },
        date_of_expiration: expirationDate.toISOString(),
      },
    });

    return {
      mp_payment_id: String(response.id),
      status: mapMpStatus(response.status),
      pix_qr_code: response.point_of_interaction?.transaction_data?.qr_code ?? null,
      pix_qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
      pix_copy_paste: response.point_of_interaction?.transaction_data?.qr_code ?? null,
      expires_at: expirationDate.toISOString(),
      raw_response: JSON.stringify(response),
    };
  },

  async createCardPayment(params: CreateCardPaymentParams) {
    const response = await paymentApi.create({
      body: {
        transaction_amount: params.amount,
        token: params.cardToken,
        description: params.description,
        installments: params.installments,
        payment_method_id: 'visa', // MP auto-detects from token
        external_reference: params.externalReference,
        payer: {
          email: params.payerEmail,
          first_name: params.payerName.split(' ')[0],
          last_name: params.payerName.split(' ').slice(1).join(' ') || '',
          identification: {
            type: 'CPF',
            number: params.payerCpf.replace(/\D/g, ''),
          },
        },
      },
    });

    return {
      mp_payment_id: String(response.id),
      status: mapMpStatus(response.status),
      card_last_four: response.card?.last_four_digits ?? null,
      card_brand: response.payment_method_id ?? null,
      installments: response.installments ?? 1,
      raw_response: JSON.stringify(response),
    };
  },

  async createBoletoPayment(params: CreateBoletoPaymentParams) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + MP_BOLETO_EXPIRATION_DAYS);

    const response = await paymentApi.create({
      body: {
        transaction_amount: params.amount,
        description: params.description,
        payment_method_id: 'bolbradesco',
        external_reference: params.externalReference,
        payer: {
          email: params.payerEmail,
          first_name: params.payerName.split(' ')[0],
          last_name: params.payerName.split(' ').slice(1).join(' ') || '',
          identification: {
            type: 'CPF',
            number: params.payerCpf.replace(/\D/g, ''),
          },
        },
        date_of_expiration: dueDate.toISOString(),
      },
    });

    return {
      mp_payment_id: String(response.id),
      status: mapMpStatus(response.status),
      boleto_url: response.transaction_details?.external_resource_url ?? null,
      boleto_barcode: response.transaction_details?.barcode?.content ?? null,
      boleto_due_date: dueDate.toISOString().split('T')[0],
      raw_response: JSON.stringify(response),
    };
  },

  async getPaymentStatus(mpPaymentId: string) {
    const response = await paymentApi.get({ id: mpPaymentId });

    return {
      status: mapMpStatus(response.status),
      paid_at: response.date_approved ?? null,
      raw_response: JSON.stringify(response),
    };
  },

  async refundPayment(mpPaymentId: string, amount?: number) {
    const refundBody: Record<string, unknown> = {};
    if (amount) {
      refundBody.amount = amount;
    }

    const response = await refundApi.create({
      payment_id: mpPaymentId,
      body: refundBody,
    });

    return {
      refund_id: response.id,
      status: 'REFUNDED' as const,
      raw_response: JSON.stringify(response),
    };
  },

  async createPixTransfer(params: PixTransferParams) {
    // Mercado Pago PIX transfer via disbursement API
    // Uses the /v1/payments endpoint with pix transfer method
    const response = await paymentApi.create({
      body: {
        transaction_amount: params.amount,
        description: params.description,
        payment_method_id: 'pix',
        external_reference: params.externalReference,
        payer: {
          email: 'plataforma@condodaily.com.br',
        },
        point_of_interaction: {
          type: 'PIX_TRANSFER',
          transaction_data: {
            bank_info: {
              pix: {
                type: params.pixKeyType,
                id: params.pixKey,
              },
            },
          },
        },
      } as any,
    });

    return {
      mp_transfer_id: String(response.id),
      status: mapMpStatus(response.status),
      raw_response: JSON.stringify(response),
    };
  },

  verifyWebhookSignature(
    xSignature: string,
    xRequestId: string,
    dataId: string,
  ): boolean {
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (!webhookSecret) return false;

    const parts = xSignature.split(',');
    const ts = parts.find((p) => p.trim().startsWith('ts='))?.split('=')[1];
    const hash = parts.find((p) => p.trim().startsWith('v1='))?.split('=')[1];

    if (!ts || !hash) return false;

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expectedHash = crypto
      .createHmac('sha256', webhookSecret)
      .update(manifest)
      .digest('hex');

    // SECURITY: Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
    } catch {
      return false; // Different lengths = invalid
    }
  },
};

function mapMpStatus(status: string | undefined | null): string {
  if (!status) return 'PENDING';
  const mapping: Record<string, string> = {
    pending: 'PENDING',
    approved: 'APPROVED',
    authorized: 'AUTHORIZED',
    in_process: 'IN_PROCESS',
    in_mediation: 'IN_MEDIATION',
    rejected: 'REJECTED',
    cancelled: 'CANCELLED',
    refunded: 'REFUNDED',
    charged_back: 'CHARGED_BACK',
  };
  return mapping[status] || 'PENDING';
}
