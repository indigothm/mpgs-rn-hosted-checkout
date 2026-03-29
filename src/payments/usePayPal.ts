// src/payments/usePayPal.ts — PayPal (Browser Payment) Template
//
// Please check the MPGS documentation for full implementation details:
// https://tyro.gateway.mastercard.com/api/documentation/integrationGuidelines/supportedFeatures/pickAdditionalPaymentMethods/paypal.html?locale=en_US
//

import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { createPayPalPayment, capturePayPalPayment } from '../api/mpgs';

export function usePayPal() {
  const [loading, setLoading] = useState(false);

  const requestPayment = async (amount: number, currency: string) => {
    setLoading(true);
    try {
      const returnUrl = Linking.createURL('/paypal/return');
      const cancelUrl = Linking.createURL('/paypal/cancel');

      // 1. Create payment session on backend
      const createRes = await createPayPalPayment({
        amount,
        currency,
        returnUrl,
        cancelUrl,
      });

      // Get redirect URL from response
      const redirectUrl = createRes?.browserPayment?.interaction?.redirectUrl;
      if (!redirectUrl) {
        throw new Error('Could not retrieve PayPal redirect URL from gateway.');
      }

      // 2. Open WebBrowser for secure authentication
      const browserResult = await WebBrowser.openAuthSessionAsync(redirectUrl, returnUrl);

      // Check result type
      if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
        return { success: false, error: 'Payment was cancelled.' };
      }

      if (browserResult.type === 'success' && browserResult.url) {
        // 3. Finalize and capture payment
        // Extract the original order and txn IDs from the create response
        // Note: The backend generated these IDs and passed them to MPGS
        const returnedOrderId = createRes.order?.id || createRes.orderId;
        const returnedTxnId = createRes.transaction?.id || createRes.transactionId;

        if (!returnedOrderId || !returnedTxnId) {
             throw new Error('Missing transaction IDs, cannot capture payment.');
        }

        const captureRes = await capturePayPalPayment({
          orderId: returnedOrderId,
          transactionId: returnedTxnId,
        });

        if (captureRes.result === 'SUCCESS') {
           return { success: true };
        } else {
           return { success: false, error: 'Payment capture failed.' };
        }
      }

      return { success: false, error: 'Unknown browser result' };

    } catch (error: any) {
      return { success: false, error: error.message || 'Payment failed' };
    } finally {
      setLoading(false);
    }
  };

  return {
    available: true,
    loading,
    requestPayment,
  };
}

