import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { paymentService } from '../services/payments';
import { PAYMENT_POLLING_INTERVAL_MS } from '@condodaily/shared';

interface PixQRCodeProps {
  paymentId: string;
  qrCodeBase64: string | null;
  copyPaste: string | null;
  expiresAt: string | null;
  onPaymentApproved: () => void;
  onExpired?: () => void;
}

export function PixQRCode({
  paymentId,
  qrCodeBase64,
  copyPaste,
  expiresAt,
  onPaymentApproved,
  onExpired,
}: PixQRCodeProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>('PENDING');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Start polling payment status
    pollingRef.current = setInterval(async () => {
      try {
        const result = await paymentService.getPaymentStatus(paymentId);
        if (result.data?.status === 'APPROVED') {
          setStatus('APPROVED');
          onPaymentApproved();
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch {}
    }, PAYMENT_POLLING_INTERVAL_MS);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [paymentId]);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expirado');
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        onExpired?.();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiresAt]);

  const handleCopy = async () => {
    if (!copyPaste) return;
    await Clipboard.setStringAsync(copyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (status === 'APPROVED') {
    return (
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
        <Text style={styles.successText}>Pagamento confirmado!</Text>
        <Text style={styles.successSubtext}>Seu agendamento foi criado com sucesso</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pague com PIX</Text>
      <Text style={styles.subtitle}>
        Escaneie o QR Code ou copie o código PIX
      </Text>

      {qrCodeBase64 && (
        <View style={styles.qrContainer}>
          <Image
            source={{ uri: `data:image/png;base64,${qrCodeBase64}` }}
            style={styles.qrImage}
            resizeMode="contain"
          />
        </View>
      )}

      {copyPaste && (
        <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={20}
            color={copied ? COLORS.success : COLORS.primary}
          />
          <Text style={[styles.copyText, copied && styles.copiedText]}>
            {copied ? 'Código copiado!' : 'Copiar código PIX'}
          </Text>
        </TouchableOpacity>
      )}

      {expiresAt && (
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.timerText}>
            {timeLeft === 'Expirado' ? 'PIX expirado' : `Expira em ${timeLeft}`}
          </Text>
        </View>
      )}

      <View style={styles.statusContainer}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>Aguardando pagamento...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: FONTS.sizes.xl,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
    marginBottom: SPACING.lg,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: SPACING.md - 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    width: '100%',
    justifyContent: 'center',
  },
  copyText: {
    fontFamily: FONTS.semibold,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
  },
  copiedText: {
    color: COLORS.success,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  timerText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  successContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  successText: {
    fontFamily: FONTS.heading,
    fontSize: FONTS.sizes.xl,
    color: COLORS.success,
  },
  successSubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
});
