// Type declarations for modules without types

declare module 'react-native-google-pay' {
  interface TokenizationSpecification {
    type: 'PAYMENT_GATEWAY';
    gateway: string;
    gatewayMerchantId: string;
  }

  interface CardPaymentMethod {
    tokenizationSpecification: TokenizationSpecification;
    allowedCardNetworks: readonly string[];
    allowedCardAuthMethods: readonly string[];
  }

  interface Transaction {
    totalPrice: string;
    totalPriceStatus: 'FINAL' | 'ESTIMATED';
    currencyCode: string;
  }

  interface RequestData {
    cardPaymentMethod: CardPaymentMethod;
    transaction: Transaction;
    merchantName?: string;
    environment?: 'TEST' | 'PRODUCTION';
  }

  const GooglePay: {
    ENVIRONMENT_TEST: number;
    ENVIRONMENT_PRODUCTION: number;
    setEnvironment(environment: number): Promise<void>;
    isReadyToPay(requestData: RequestData): Promise<boolean>;
    requestPayment(requestData: RequestData): Promise<string>;
  };

  export default GooglePay;
}
