"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORM_VERSION = exports.MERCHANT_ID = exports.BASE_URL = void 0;
exports.createSession = createSession;
exports.initiateAuthentication = initiateAuthentication;
exports.authenticatePayer = authenticatePayer;
exports.fetch3dsStatus = fetch3dsStatus;
exports.createTokenWithSession = createTokenWithSession;
exports.retrieveToken = retrieveToken;
exports.pay = pay;
exports.payWithGooglePay = payWithGooglePay;
// src/mpgs.ts
const axios_1 = __importDefault(require("axios"));
const rawBaseUrl = process.env.MPGS_BASE_URL || "https://test-tyro.mtf.gateway.mastercard.com";
exports.BASE_URL = rawBaseUrl.replace(/\/+$/, "");
exports.MERCHANT_ID = process.env.MPGS_MERCHANT_ID || "";
const API_PASSWORD = process.env.MPGS_API_PASSWORD || "";
const API_VERSION = process.env.MPGS_API_VERSION || "100";
exports.FORM_VERSION = process.env.MPGS_FORM_VERSION || "100";
if (!exports.MERCHANT_ID || !API_PASSWORD) {
    // Fail fast like the Python version would if config missing
    console.error("MPGS_MERCHANT_ID or MPGS_API_PASSWORD not set in environment");
}
function authConfig() {
    return {
        auth: {
            username: `merchant.${exports.MERCHANT_ID}`,
            password: API_PASSWORD,
        },
    };
}
// --- Session ---
async function createSession() {
    const url = `${exports.BASE_URL}/api/rest/version/${API_VERSION}/merchant/${exports.MERCHANT_ID}/session`;
    const res = await axios_1.default.post(url, {}, authConfig());
    return res.data;
}
// --- 3DS Authentication API ---
async function initiateAuthentication(orderId, transactionId, amount, currency, sessionId, browser = null, walletProvider = null) {
    const url = `${exports.BASE_URL}/api/rest/version/${API_VERSION}/merchant/${exports.MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;
    const payload = {
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
    const res = await axios_1.default.put(url, payload, authConfig());
    console.log("3DS Initiate Response:", res.status, res.data);
    return res.data;
}
async function authenticatePayer(orderId, transactionId, amount, currency, sessionId, browser = null) {
    const url = `${exports.BASE_URL}/api/rest/version/${API_VERSION}/merchant/${exports.MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;
    const payload = {
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
        const b = { ...browser };
        delete b.acceptHeader;
        delete b.userAgent;
        b["3DSecureChallengeWindowSize"] = "FULL_SCREEN";
        console.log("3DS Authenticate Browser:", b);
        payload.device = { browserDetails: b };
    }
    console.log("3DS Authenticate Request:", url, payload);
    const res = await axios_1.default.put(url, payload, {
        ...authConfig(),
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    });
    console.log("3DS Authenticate Response:", res.status, res.data);
    return res.data;
}
async function fetch3dsStatus(orderId, transactionId) {
    const url = `${exports.BASE_URL}/api/rest/version/${API_VERSION}/merchant/${exports.MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;
    const res = await axios_1.default.get(url, authConfig());
    return res; // Express handler uses status + data
}
// --- Tokenisation ---
async function createTokenWithSession(sessionId, customerId = null) {
    const url = `${exports.BASE_URL}/api/rest/version/${API_VERSION}/merchant/${exports.MERCHANT_ID}/token`;
    const payload = {
        session: { id: sessionId },
        sourceOfFunds: { type: "CARD" },
    };
    // If you later want to include customer:
    // if (customerId) {
    //   payload.customer = { id: customerId };
    // }
    console.log("Token Request:", payload);
    const res = await axios_1.default.post(url, payload, authConfig());
    console.log("Token Response:", res.status, res.data);
    return res.data;
}
async function retrieveToken(tokenId) {
    const url = `${exports.BASE_URL}/api/rest/version/${API_VERSION}/merchant/${exports.MERCHANT_ID}/token/${tokenId}`;
    console.log("Retrieve Token Request:", tokenId);
    const res = await axios_1.default.get(url, authConfig());
    console.log("Retrieve Token Response:", res.status, res.data);
    return res;
}
async function pay(orderId, transactionId, amount, currency, options = {}) {
    const { sessionId = null, token = null, devicePaymentToken = null, walletProvider = null, authenticationResult = null, } = options;
    const url = `${exports.BASE_URL}/api/rest/version/${API_VERSION}/merchant/${exports.MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;
    let sourceOfFunds;
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
    }
    else if (token) {
        sourceOfFunds = {
            type: "CARD",
            token,
        };
    }
    else {
        sourceOfFunds = { type: "CARD" };
    }
    const payload = {
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
    const res = await axios_1.default.put(url, payload, authConfig());
    console.log("PAY Response:", res.status, res.data);
    return res.data;
}
async function payWithGooglePay(orderId, transactionId, amount, currency, devicePaymentToken) {
    const url = `${exports.BASE_URL}/api/rest/version/${API_VERSION}/merchant/${exports.MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`;
    const payload = {
        apiOperation: "PAY",
        order: {
            amount,
            currency,
            walletProvider: "GOOGLE_PAY",
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
    console.log("GPay PAY Request:", payload);
    const res = await axios_1.default.put(url, payload, authConfig());
    console.log("GPay PAY Response:", res.status, res.data);
    return res.data;
}
