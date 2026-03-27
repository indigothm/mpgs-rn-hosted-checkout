// src/payments/usePayPal.ts — PayPal (Browser Payment) Template
//
// Please check the MPGS documentation for full implementation details:
// https://tyro.gateway.mastercard.com/api/documentation/integrationGuidelines/supportedFeatures/pickAdditionalPaymentMethods/paypal.html?locale=en_US
//
// To implement PayPal via MPGS, you will need:
//
// 1. Backend endpoints:
//    - POST /api/paypal/create
//      - Calls MPGS INITIATE_BROWSER_PAYMENT with browserPayment.paypal
//      - Returns a redirect URL from MPGS
//    - POST /api/paypal/capture
//      - Calls MPGS to capture/confirm the PayPal payment after redirect
//
// 2. Frontend flow (WebView-based):
//    - Call /api/paypal/create to get the PayPal redirect URL
//    - Open a WebView (or in-app browser) pointing to that URL
//    - Monitor onNavigationStateChange or Deep Links for the return/cancel URLs
//    - On return: call /api/paypal/capture
//    - On cancel: navigate back
//    - Post result to native via postMessage
//
// 3. MPGS configuration:
//    - Enable PayPal in your MPGS merchant profile
//    - Configure PayPal credentials in MPGS dashboard
//
// 4. Payment request structure (for backend):
//    {
//      apiOperation: "INITIATE_BROWSER_PAYMENT",
//      browserPayment: {
//        operation: "PAY",
//        paypal: {
//          displayShippingAddress: false,
//          overrideShippingAddress: false,
//        },
//      },
//      interaction: {
//        returnUrl: "https://your-domain.com/paypal/return",
//        cancelUrl: "https://your-domain.com/paypal/cancel",
//      },
//      order: { amount, currency },
//    }

export function usePayPal() {
  return {
    available: false,
    loading: false,
    requestPayment: async () => {
      // Direct users to to the documentation
      return { success: false, error: 'Please check the MPGS documentation for PayPal implementation details.' };
    },
  };
}
