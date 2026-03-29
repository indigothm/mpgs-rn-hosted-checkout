import path from "path";
import express, { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

import { initDb, upsertOrder } from "./db";
import {
  BASE_URL,
  MERCHANT_ID,
  FORM_VERSION,
  createSession,
  initiateAuthentication,
  authenticatePayer,
  fetch3dsStatus,
  createTokenWithSession,
  retrieveToken,
  pay,
  payWithDevicePayment,
  initiateBrowserPayment,
  retrieveTransaction,
} from "./mpgs";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../../web-reference")));

// Initialize SQLite DB
initDb();

// GET /api/config
app.get("/api/config", (req: Request, res: Response) => {
  res.json({
    baseUrl: BASE_URL,
    merchantId: MERCHANT_ID,
    formVersion: FORM_VERSION,
    enable3ds: (process.env.ENABLE_3DS || "true").toLowerCase() === "true",
  });
});

// POST /api/session
app.post("/api/session", async (req, res, next) => {
  try {
    const data = await createSession();
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// 3DS INITIATE
app.post("/api/3ds/initiate", async (req, res, next) => {
  try {
    const result = await initiateAuthentication(
      req.body.orderId,
      req.body.transactionId || req.body.orderId,
      req.body.amount,
      req.body.currency,
      req.body.sessionId,
      req.body.browser,
      req.body.walletProvider
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 3DS AUTHENTICATE
app.post("/api/3ds/authenticate", async (req, res, next) => {
  try {
    const result = await authenticatePayer(
      req.body.orderId,
      req.body.transactionId || req.body.orderId,
      req.body.amount,
      req.body.currency,
      req.body.sessionId,
      req.body.browser
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/3ds/status
app.get("/api/3ds/status", async (req, res, next) => {
  try {
    const axiosRes = await fetch3dsStatus(
      req.query.orderId as string,
      (req.query.transactionId as string) || (req.query.orderId as string)
    );
    res.status(axiosRes.status).json(axiosRes.data);
  } catch (err) {
    next(err);
  }
});

// POST /api/tokenize
app.post("/api/tokenize", async (req, res, next) => {
  try {
    const result = await createTokenWithSession(req.body.sessionId, req.body.customerId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/pay
app.post("/api/pay", async (req, res, next) => {
  try {
    const orderId = req.body.orderId || randomUUID();
    const txnId = req.body.transactionId || orderId;

    const result = await pay(orderId, txnId, req.body.amount, req.body.currency, {
      sessionId: req.body.sessionId,
      token: req.body.token,
      devicePaymentToken: req.body.devicePaymentToken,
      walletProvider: req.body.walletProvider,
      authenticationResult: req.body.authentication,
    });

    await upsertOrder(
      orderId,
      parseFloat(req.body.amount),
      req.body.currency,
      result.result,
      JSON.stringify(result)
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/pay/google — Wallet PAY (Google Pay & Apple Pay)
app.post("/api/pay/google", async (req, res, next) => {
  try {
    const result = await payWithDevicePayment(
      req.body.orderId,
      req.body.transactionId || req.body.orderId,
      req.body.amount,
      req.body.currency,
      req.body.devicePaymentToken,
      req.body.walletProvider || "GOOGLE_PAY"
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/token/:tokenId
app.get("/api/token/:tokenId", async (req, res, next) => {
  try {
    const axiosRes = await retrieveToken(req.params.tokenId);
    res.status(axiosRes.status).json(axiosRes.data);
  } catch (err) {
    next(err);
  }
});

// POST /api/paypal/create
app.post("/api/paypal/create", async (req, res, next) => {
  try {
    const orderId = req.body.orderId || randomUUID();
    const txnId = req.body.transactionId || orderId;

    const result = await initiateBrowserPayment(
      orderId,
      txnId,
      req.body.amount,
      req.body.currency,
      req.body.returnUrl,
      req.body.cancelUrl
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/paypal/capture
app.post("/api/paypal/capture", async (req, res, next) => {
  try {
    const { orderId, transactionId } = req.body;
    // Retrieve the transaction from MPGS to confirm it was successful
    const result = await retrieveTransaction(orderId, transactionId);

    // Save to DB (assuming success if result.result === "SUCCESS")
    let amount = 0;
    let currency = "";
    if (result.order) {
      amount = parseFloat(result.order.amount);
      currency = result.order.currency;
    }

    await upsertOrder(
      orderId,
      amount,
      currency,
      result.result,
      JSON.stringify(result)
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Fallback → serve SPA index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../web-reference/index.html"));
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  const status = err.response?.status || 500;
  const body = err.response?.data || { error: "Internal server error" };
  res.status(status).json(body);
});

app.listen(PORT, () => {
  console.log(`Node backend listening on http://localhost:${PORT}`);
});
