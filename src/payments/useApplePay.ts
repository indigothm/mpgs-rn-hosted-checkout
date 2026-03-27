// src/payments/useApplePay.ts — Apple Pay placeholder
//
// Apple Pay is NOT yet implemented. This hook returns { available: false } for now.
//
// To implement Apple Pay, you will need:
//
// 1. Apple Developer Merchant ID
//    - Register a Merchant ID in the Apple Developer portal
//    - Create a Payment Processing Certificate
//
// 2. Domain verification with Apple
//    - Verify your domain in the Apple Developer portal
//
// 3. MPGS configuration
//    - Upload the Apple Pay certificate to MPGS
//    - Enable Apple Pay in your MPGS merchant profile
//
// 4. React Native library
//    - Install `react-native-payments` or `@stripe/stripe-react-native` (Apple Pay support)
//    - Or use `expo-apple-pay` if/when it becomes available
//
// 5. Backend endpoint
//    - Use the same /api/pay endpoint with:
//      - walletProvider: "APPLE_PAY"
//      - sourceOfFunds.provided.card.devicePayment.paymentToken: <Apple Pay token>
//
// 6. Flow:
//    - Check ApplePay.canMakePayments()
//    - Present Apple Pay sheet with payment request
//    - On authorization, extract the payment token
//    - POST token to backend /api/pay
//    - Navigate to confirmation/error based on result

export function useApplePay() {
  return {
    available: false as const,
    loading: false,
    requestPayment: async () => {
      return { success: false, error: 'Apple Pay is not yet implemented' };
    },
  };
}
