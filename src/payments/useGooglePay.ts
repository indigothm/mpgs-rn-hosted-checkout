// src/payments/useGooglePay.ts — Native Google Pay hook
//
// Uses react-native-google-pay to request payment with MPGS gateway tokenization.
// The token is sent to the backend via /api/pay/google.
//
// NOTE: This requires a development build (not Expo Go) since it uses native modules.
// Install: npx expo install react-native-google-pay

import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { api } from '../api/client';
import type { MpgsConfig, PayResponse } from '../api/types';

interface GooglePayResult {
  success: boolean;
  data?: PayResponse;
  error?: string;
}

export function useGooglePay() {
  const [loading, setLoading] = useState(false);

  const available = Platform.OS === 'android';

  const requestPayment = useCallback(
    async (
      amount: string,
      currency: string,
      config: MpgsConfig
    ): Promise<GooglePayResult> => {
      if (!available) {
        return { success: false, error: 'Google Pay is only available on Android' };
      }

      setLoading(true);

      try {
        // Dynamic import to avoid crashes on iOS where the module doesn't exist
        const { default: GooglePay } = await import('react-native-google-pay');

        const requestData = {
          cardPaymentMethod: {
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY' as const,
              gateway: 'mpgs',
              gatewayMerchantId: config.merchantId,
            },
            allowedCardNetworks: ['VISA', 'MASTERCARD'] as const,
            allowedCardAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'] as const,
          },
          transaction: {
            totalPrice: amount,
            totalPriceStatus: 'FINAL' as const,
            currencyCode: currency,
          },
          merchantName: 'MPGS Checkout',
          environment: 'TEST' as const,
        };

        // Check if Google Pay is available
        await GooglePay.setEnvironment(GooglePay.ENVIRONMENT_TEST);
        const isReady = await GooglePay.isReadyToPay(requestData);

        if (!isReady) {
          setLoading(false);
          return { success: false, error: 'Google Pay is not available on this device' };
        }

        // Request payment
        const token = await GooglePay.requestPayment(requestData);

        // Send token to backend
        const orderId = `GPay-${Date.now()}`;
        const result = await api.post<PayResponse>('/api/pay/google', {
          orderId,
          transactionId: orderId,
          amount,
          currency,
          devicePaymentToken: token,
          walletProvider: 'GOOGLE_PAY',
        });

        setLoading(false);
        return { success: result.result === 'SUCCESS', data: result };
      } catch (error: any) {
        setLoading(false);

        // User cancelled
        if (error?.code === 'CANCELED' || error?.message?.includes('cancel')) {
          return { success: false, error: 'Cancelled by user' };
        }

        return { success: false, error: error.message || 'Google Pay failed' };
      }
    },
    [available]
  );

  return { available, loading, requestPayment };
}
