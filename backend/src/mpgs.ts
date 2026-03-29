// src/mpgs.ts
import dotenv from "dotenv";
dotenv.config(); // <-- load .env before touching process.env
console.log("MPGS MERCHANT_ID at load time:", process.env.MPGS_MERCHANT_ID);

import axios from "axios";

const rawBaseUrl =
  process.env.MPGS_BASE_URL || "https://test-tyro.mtf.gateway.mastercard.com";

export const BASE_URL = rawBaseUrl.replace(/\/+$/, "");
export const MERCHANT_ID = process.env.MPGS_MERCHANT_ID || "";
const API_PASSWORD = process.env.MPGS_API_PASSWORD || "";
const API_VERSION = process.env.MPGS_API_VERSION || "100";
export const FORM_VERSION = process.env.MPGS_FORM_VERSION || "100";

if (!MERCHANT_ID || !API_PASSWORD) {
  // Fail fast like the Python version would if config missing
  console.error("MPGS_MERCHANT_ID or MPGS_API_PASSWORD not set in environment");
}

function authConfig() {
  return {
    auth: {
      username: `merchant.${MERCHANT_ID}`,
      password: API_PASSWORD,
    },
  };
}

// Types for clarity – you can tighten these later if you want
export interface BrowserDetails {
  acceptHeader?: string;
  userAgent?: string;
  [key: string]: any; // keep loose for now (MPGS browser fields are flexible)
}

export interface AuthenticationResult {
  [key: string]: any;
}

// --- Session ---

export async function createSession(): Promise<any> {
  const url = `${BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/session`;
  const res = await axios.post(url, {}, authConfig());
  return res.data;
}

// --- 3DS Authentication API ---

export async function initiateAuthentication(
  orderId: string,
  transactionId: string,
  amount: string | number,
  currency: string,
  sessionId: string,
  browser: BrowserDetails | null = null,
  walletProvider: string | null = null
): Promise<any> {
  const url = `${BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;

  const payload: any = {
    apiOperation: "INITIATE_AUTHENTICATION",
    order: {
      currency,
    },
    session: {
      id: sessionId,
    },
    sourceOfFunds: {
      type: "CARD",
    },
    authentication: {
      acceptVersions: "3DS2,3DS1",
      channel: "PAYER_BROWSER",
      purpose: "PAYMENT_TRANSACTION",
    },
  };

  if (walletProvider) {
    payload.order.walletProvider = walletProvider;
  }

  console.log("3DS Initiate Request:", payload);
  const res = await axios.put(url, payload, authConfig());
  console.log("3DS Initiate Response:", res.status, res.data);
  return res.data;
}

export async function authenticatePayer(
  orderId: string,
  transactionId: string,
  amount: string | number,
  currency: string,
  sessionId: string,
  browser: BrowserDetails | null = null
): Promise<any> {
  const url = `${BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;

  const payload: any = {
    apiOperation: "AUTHENTICATE_PAYER",
    session: {
      id: sessionId,
    },
    order: {
      amount,
      currency,
    },
  };

  if (browser) {
    const b: any = { ...browser };
    delete b.acceptHeader;
    delete b.userAgent;
    b["3DSecureChallengeWindowSize"] = "FULL_SCREEN";
    console.log("3DS Authenticate Browser:", b);
    payload.device = { browserDetails: b };
  }

  console.log("3DS Authenticate Request:", url, payload);
  const res = await axios.put(url, payload, {
    ...authConfig(),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  console.log("3DS Authenticate Response:", res.status, res.data);
  return res.data;
}

export async function fetch3dsStatus(
  orderId: string,
  transactionId: string
): Promise<any> {
  const url = `${BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;
  const res = await axios.get(url, authConfig());
  return res; // Express handler uses status + data
}

// --- Tokenisation ---

export async function createTokenWithSession(
  sessionId: string,
  customerId: string | null = null
): Promise<any> {
  const url = `${BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/token`;
  const payload: any = {
    session: { id: sessionId },
    sourceOfFunds: { type: "CARD" },
  };

  // If you later want to include customer:
  // if (customerId) {
  //   payload.customer = { id: customerId };
  // }

  console.log("Token Request:", payload);
  const res = await axios.post(url, payload, authConfig());
  console.log("Token Response:", res.status, res.data);
  return res.data;
}

export async function retrieveToken(
  tokenId: string
): Promise<any> {
  const url = `${BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/token/${tokenId}`;
  console.log("Retrieve Token Request:", tokenId);
  const res = await axios.get(url, authConfig());
  console.log("Retrieve Token Response:", res.status, res.data);
  return res;
}

// --- Pay ---

interface PayOptions {
  sessionId?: string | null;
  token?: string | null;
  devicePaymentToken?: string | null;
  walletProvider?: string | null;
  authenticationResult?: AuthenticationResult | null;
}

export async function pay(
  orderId: string,
  transactionId: string,
  amount: string | number,
  currency: string,
  options: PayOptions = {}
): Promise<any> {
  const {
    sessionId = null,
    token = null,
    devicePaymentToken = null,
    walletProvider = null,
    authenticationResult = null,
  } = options;

  const url = `${BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;

  let sourceOfFunds: any;

  if (devicePaymentToken) {
    sourceOfFunds = {
      type: "CARD",
      provided: {
        card: {
          devicePayment: {
            paymentToken: devicePaymentToken,
          },
        },
      },
    };
  } else if (token) {
    sourceOfFunds = {
      type: "CARD",
      token,
    };
  } else {
    sourceOfFunds = { type: "CARD" };
  }

  const payload: any = {
    apiOperation: "PAY",
    order: {
      amount: String(amount),
      currency,
    },
    sourceOfFunds,
  };

  if (sessionId) {
    payload.session = { id: sessionId };
  }
  if (walletProvider) {
    payload.order.walletProvider = walletProvider;
  }
  if (authenticationResult) {
    payload.authentication = authenticationResult;
  }

  console.log("PAY Request:", payload);
  const res = await axios.put(url, payload, authConfig());
  console.log("PAY Response:", res.status, res.data);
  return res.data;
}

export async function payWithDevicePayment(
  orderId: string,
  transactionId: string,
  amount: string | number,
  currency: string,
  devicePaymentToken: string,
  walletProvider: "GOOGLE_PAY" | "APPLE_PAY" = "GOOGLE_PAY"
): Promise<any> {
  const url = `${BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;

  const payload = {
    apiOperation: "PAY",
    order: {
      amount,
      currency,
      walletProvider,
    },
    sourceOfFunds: {
      type: "CARD",
      provided: {
        card: {
          devicePayment: {
            paymentToken: devicePaymentToken,
          },
        },
      },
    },
  };

  console.log(`${walletProvider} PAY Request:`, payload);
  const res = await axios.put(url, payload, authConfig());
  console.log(`${walletProvider} PAY Response:`, res.status, res.data);
  return res.data;
}

// --- Browser Payments (PayPal) ---

export async function initiateBrowserPayment(
  orderId: string,
  transactionId: string,
  amount: string | number,
  currency: string,
  returnUrl: string,
  cancelUrl: string
): Promise<any> {
  const url = `${BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;

  const payload: any = {
    apiOperation: "INITIATE_BROWSER_PAYMENT",
    browserPayment: {
      operation: "PAY",
      paypal: {
        displayShippingAddress: false,
        overrideShippingAddress: false,
      },
    },
    interaction: {
      returnUrl,
      cancelUrl,
    },
    order: {
      amount: String(amount),
      currency,
    },
  };

  console.log("Browser Payment Request:", payload);
  const res = await axios.put(url, payload, authConfig());
  console.log("Browser Payment Response:", res.status, res.data);
  return res.data;
}

export async function retrieveTransaction(
  orderId: string,
  transactionId: string
): Promise<any> {
  const url = `${BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;
  console.log("Retrieve Transaction Request:", url);
  const res = await axios.get(url, authConfig());
  console.log("Retrieve Transaction Response:", res.status, res.data);
  return res.data;
}

/** @deprecated Use payWithDevicePayment instead */
export const payWithGooglePay = payWithDevicePayment;
