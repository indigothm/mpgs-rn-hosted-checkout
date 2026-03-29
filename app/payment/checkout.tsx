// app/payment/checkout.tsx — WebView checkout modal

import React, { useCallback, useRef } from 'react';
import { StyleSheet, View, Alert, BackHandler } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getCheckoutHtml } from '../../src/checkout/checkoutHtml';
import { parseWebViewMessage } from '../../src/checkout/messages';
import { useApplePay } from '../../src/payments/useApplePay';
import { useGooglePay } from '../../src/payments/useGooglePay';
import { usePayPal } from '../../src/payments/usePayPal';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    baseUrl: string;
    merchantId: string;
    formVersion: string;
    sessionId: string;
    backendUrl: string;
    amount: string;
    currency: string;
    enable3ds: string;
  }>();

  const applePay = useApplePay();
  const googlePay = useGooglePay();
  const payPal = usePayPal();

  const webViewRef = useRef<WebView>(null);

  const html = getCheckoutHtml({
    baseUrl: params.baseUrl ?? '',
    merchantId: params.merchantId ?? '',
    formVersion: params.formVersion ?? '',
    sessionId: params.sessionId ?? '',
    backendUrl: params.backendUrl ?? '',
    amount: params.amount ?? '10.00',
    currency: params.currency ?? 'AUD',
    enable3ds: params.enable3ds === 'true',
    isExpoGo,
  });

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const msg = parseWebViewMessage(event.nativeEvent.data);
      if (!msg) return;

      switch (msg.type) {
        case 'PAYMENT_RESULT':
          if (msg.result === 'SUCCESS') {
            router.replace({
              pathname: '/payment/confirmation',
              params: {
                orderId: msg.data?.order?.id ?? '',
                amount: params.amount ?? '',
                currency: params.currency ?? '',
                gatewayCode: msg.data?.response?.gatewayCode ?? 'APPROVED',
                resultJson: JSON.stringify(msg.data),
              },
            });
          } else {
            router.replace({
              pathname: '/payment/error',
              params: {
                message: `Payment was not successful`,
                gatewayCode: msg.data?.gatewayCode ?? msg.data?.raw?.result ?? 'DECLINED',
              },
            });
          }
          break;

        case 'ERROR':
          router.replace({
            pathname: '/payment/error',
            params: {
              message: msg.message,
            },
          });
          break;

        case 'LOG':
          // Optional: forward WebView logs to console for debugging
          console.log('[WebView]', msg.message);
          break;

        case 'WALLET_CLICKED':
          (async () => {
             const { provider } = msg;
             let result: any;
             const config = {
               baseUrl: params.baseUrl ?? '',
               merchantId: params.merchantId ?? '',
               formVersion: params.formVersion ?? '',
               enable3ds: params.enable3ds === 'true'
             };
          
             if (provider === 'APPLE_PAY') {
               result = await applePay.requestPayment(params.amount ?? '', params.currency ?? '', config);
             } else if (provider === 'GOOGLE_PAY') {
               result = await googlePay.requestPayment(params.amount ?? '', params.currency ?? '', config);
             } else if (provider === 'PAYPAL') {
               result = await payPal.requestPayment(parseFloat(params.amount ?? '0'), params.currency ?? 'AUD');
             }
             
             if (!result) return;
             
             if (result.success) {
               router.replace({
                 pathname: '/payment/confirmation',
                 params: {
                   orderId: result.data?.order?.id ?? '',
                   amount: params.amount ?? '',
                   currency: params.currency ?? '',
                   gatewayCode: result.data?.response?.gatewayCode ?? 'APPROVED',
                   resultJson: JSON.stringify(result.data),
                 },
               });
             } else {
                if (result.error === 'Cancelled by user') return; // Do nothing
                router.replace({
                  pathname: '/payment/error',
                  params: {
                    message: result.error ?? 'Wallet payment failed',
                  },
                });
             }
          })();
          break;
      }
    },
    [router, params.amount, params.currency, params.baseUrl, params.merchantId, params.formVersion, params.enable3ds, applePay, googlePay, payPal]
  );

  // Handle Android back button during 3DS challenge
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Cancel Payment?',
          'Are you sure you want to cancel this payment?',
          [
            { text: 'Continue Payment', style: 'cancel' },
            {
              text: 'Cancel',
              style: 'destructive',
              onPress: () => router.back(),
            },
          ]
        );
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [router])
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: params.backendUrl ?? '' }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        mixedContentMode="always"
        allowUniversalAccessFromFileURLs
        allowFileAccessFromFileURLs
        onMessage={handleMessage}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error:', nativeEvent);
          router.replace({
            pathname: '/payment/error',
            params: { message: 'WebView failed to load. Please try again.' },
          });
        }}
        // Don't block any navigation — needed for MPGS iframes and 3DS
        onShouldStartLoadWithRequest={() => true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  webview: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
