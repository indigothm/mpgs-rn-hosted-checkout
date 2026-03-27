// src/payments/usePayPal.ts — PayPal placeholder
//
// PayPal is NOT yet implemented. This hook returns { available: false } for now.
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
//    - Open a WebView pointing to that URL
//    - Monitor onNavigationStateChange for the return/cancel URLs
//    - On return: call /api/paypal/capture
//    - On cancel: navigate back
//    - Post result to native via postMessage
//
// 3. MPGS configuration:
//    - Enable PayPal in your MPGS merchant profile
//    - Configure PayPal credentials in MPGS dashboard
//
// 4. Payment request structure:
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
    available: false as const,
    loading: false,
    requestPayment: async () => {
      return { success: false, error: 'PayPal is not yet implemented' };
    },
  };
}
