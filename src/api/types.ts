// src/api/types.ts — TypeScript interfaces for backend API shapes

export interface MpgsConfig {
  baseUrl: string;
  merchantId: string;
  formVersion: string;
  enable3ds: boolean;
}

export interface SessionResponse {
  session: {
    id: string;
    updateStatus: string;
    version: string;
  };
  merchant: string;
  result: string;
  successIndicator: string;
}

export interface PayResponse {
  result: string;
  order?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    totalAuthorizedAmount: number;
    totalCapturedAmount: number;
    totalRefundedAmount: number;
  };
  response?: {
    acquirerCode: string;
    acquirerMessage: string;
    gatewayCode: string;
  };
  transaction?: {
    id: string;
    type: string;
    amount: number;
    currency: string;
  };
  sourceOfFunds?: {
    provided?: {
      card?: {
        brand: string;
        expiry: string;
        fundingMethod: string;
        number: string;
        scheme: string;
      };
    };
    type: string;
  };
}

export interface BrowserDetails {
  acceptHeader: string;
  javaEnabled: boolean;
  language: string;
  screenHeight: number;
  screenWidth: number;
  timeZone: number;
  colorDepth: number;
  userAgent: string;
}
