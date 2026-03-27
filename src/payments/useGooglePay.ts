import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
// @ts-ignore
import { PaymentRequest } from '@rnw-community/react-native-payments';
import { api } from '../api/client';
import type { MpgsConfig, PayResponse } from '../api/types';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

interface GooglePayResult {
  success: boolean;
  data?: PayResponse;
  error?: string;
}

export function useGooglePay() {
  const [loading, setLoading] = useState(false);
  const available = Platform.OS === 'android' && !isExpoGo;

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
        const METHOD_DATA = [
          {
            supportedMethods: 'android-pay',
            data: {
              supportedNetworks: ['visa', 'masterCard', 'amex'],
              currencyCode: currency,
              countryCode: 'US', // Update according to your merchant region
              merchantIdentifier: config.merchantId,
              environment: 'TEST', // Change to 'PRODUCTION' for live
              gatewayConfig: {
                gateway: 'mpgs',
                gatewayMerchantId: config.merchantId,
              },
            },
          },
        ];

        const DETAILS = {
          id: `GPay-${Date.now()}`,
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

        const canMakePayment = await pr.canMakePayment();
        if (!canMakePayment) {
          setLoading(false);
          return { success: false, error: 'Google Pay is not configured or available on this device' };
        }

        const paymentResponse = await pr.show();
        const token = (paymentResponse as any).details?.paymentToken;

        const orderId = `GPay-${Date.now()}`;
        const result = await api.post<PayResponse>('/api/pay/google', {
          orderId,
          transactionId: orderId,
          amount,
          currency,
          devicePaymentToken: typeof token === 'string' ? token : JSON.stringify(token),
          walletProvider: 'GOOGLE_PAY',
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
        if (error?.message?.toLowerCase().includes('cancel')) {
          return { success: false, error: 'Cancelled by user' };
        }
        return { success: false, error: error.message || 'Google Pay failed' };
      }
    },
    [available]
  );

  return { available, loading, requestPayment };
}
