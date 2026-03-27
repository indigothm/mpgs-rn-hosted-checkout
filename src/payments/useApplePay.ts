import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
// @ts-ignore
import { PaymentRequest } from '@rnw-community/react-native-payments';
import { api } from '../api/client';
import type { MpgsConfig, PayResponse } from '../api/types';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

interface ApplePayResult {
  success: boolean;
  data?: PayResponse;
  error?: string;
}

export function useApplePay() {
  const [loading, setLoading] = useState(false);
  const available = Platform.OS === 'ios' && !isExpoGo;

  const requestPayment = useCallback(
    async (
      amount: string,
      currency: string,
      _config: MpgsConfig
    ): Promise<ApplePayResult> => {
      if (!available) {
        return { success: false, error: 'Apple Pay is only available on iOS' };
      }

      setLoading(true);

      try {
        const METHOD_DATA = [
          {
            supportedMethods: 'apple-pay',
            data: {
              merchantIdentifier: 'merchant.com.yourdomain', // Replace with your Apple Merchant ID
              supportedNetworks: ['visa', 'masterCard', 'amex'],
              countryCode: 'US', // Update according to your merchant region
              currencyCode: currency,
            },
          },
        ];

        const DETAILS = {
          id: `APPay-${Date.now()}`,
          displayItems: [
            {
              label: 'Order Total',
              amount: { currency, value: amount },
            },
          ],
          total: {
            label: 'Merchant',
            amount: { currency, value: amount },
          },
        };

        const pr = new PaymentRequest(METHOD_DATA as any, DETAILS);

        // Check availability
        const canMakePayment = await pr.canMakePayment();
        if (!canMakePayment) {
          setLoading(false);
          return { success: false, error: 'Apple Pay is not configured or available on this device' };
        }

        // Display sheet and authorize
        const paymentResponse = await pr.show();

        // The token needs to be decoded/reformatted if using standard MPGS,
        // but MPGS provides explicit D&D for passing the stringified PKPayment token.
        const token = (paymentResponse as any).details?.paymentToken;

        // Post to backend
        const orderId = `APPay-${Date.now()}`;
        const result = await api.post<PayResponse>('/api/pay/google', {
          orderId,
          transactionId: orderId,
          amount,
          currency,
          // MPGS requires the base64 encoded token or the raw string depending on APM configuration
          devicePaymentToken: typeof token === 'string' ? token : JSON.stringify(token),
          walletProvider: 'APPLE_PAY',
        });

        if (result.result === 'SUCCESS') {
          await paymentResponse.complete('success' as any);
          setLoading(false);
          return { success: true, data: result };
        } else {
          await paymentResponse.complete('fail' as any);
          setLoading(false);
          return { success: false, error: 'Payment declined by gateway' };
        }

      } catch (error: any) {
        setLoading(false);

        // User cancelled
        if (error?.message?.toLowerCase().includes('cancel')) {
          return { success: false, error: 'Cancelled by user' };
        }

        return { success: false, error: error.message || 'Apple Pay failed' };
      }
    },
    [available]
  );

  return { available, loading, requestPayment };
}
