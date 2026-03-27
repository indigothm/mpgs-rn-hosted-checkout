"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = require("crypto");
const db_1 = require("./db");
const mpgs_1 = require("./mpgs");
dotenv_1.default.config({ path: path_1.default.join(__dirname, "..", ".env") });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, "../../frontend")));
// Initialize SQLite DB
(0, db_1.initDb)();
// GET /api/config
app.get("/api/config", (req, res) => {
    res.json({
        baseUrl: mpgs_1.BASE_URL,
        merchantId: mpgs_1.MERCHANT_ID,
        formVersion: mpgs_1.FORM_VERSION,
        enable3ds: (process.env.ENABLE_3DS || "true").toLowerCase() === "true",
    });
});
// POST /api/session
app.post("/api/session", async (req, res, next) => {
    try {
        const data = await (0, mpgs_1.createSession)();
        res.status(201).json(data);
    }
    catch (err) {
        next(err);
    }
});
// 3DS INITIATE
app.post("/api/3ds/initiate", async (req, res, next) => {
    try {
        const result = await (0, mpgs_1.initiateAuthentication)(req.body.orderId, req.body.transactionId || req.body.orderId, req.body.amount, req.body.currency, req.body.sessionId, req.body.browser, req.body.walletProvider);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// 3DS AUTHENTICATE
app.post("/api/3ds/authenticate", async (req, res, next) => {
    try {
        const result = await (0, mpgs_1.authenticatePayer)(req.body.orderId, req.body.transactionId || req.body.orderId, req.body.amount, req.body.currency, req.body.sessionId, req.body.browser);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/3ds/status
app.get("/api/3ds/status", async (req, res, next) => {
    try {
        const axiosRes = await (0, mpgs_1.fetch3dsStatus)(req.query.orderId, req.query.transactionId || req.query.orderId);
        res.status(axiosRes.status).json(axiosRes.data);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/tokenize
app.post("/api/tokenize", async (req, res, next) => {
    try {
        const result = await (0, mpgs_1.createTokenWithSession)(req.body.sessionId, req.body.customerId);
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/pay
app.post("/api/pay", async (req, res, next) => {
    try {
        const orderId = req.body.orderId || (0, crypto_1.randomUUID)();
        const txnId = req.body.transactionId || orderId;
        const result = await (0, mpgs_1.pay)(orderId, txnId, req.body.amount, req.body.currency, {
            sessionId: req.body.sessionId,
            token: req.body.token,
            devicePaymentToken: req.body.devicePaymentToken,
            walletProvider: req.body.walletProvider,
            authenticationResult: req.body.authentication,
        });
        await (0, db_1.upsertOrder)(orderId, parseFloat(req.body.amount), req.body.currency, result.result, JSON.stringify(result));
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/pay/google
app.post("/api/pay/google", async (req, res, next) => {
    try {
        const result = await (0, mpgs_1.payWithGooglePay)(req.body.orderId, req.body.transactionId || req.body.orderId, req.body.amount, req.body.currency, req.body.devicePaymentToken);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/token/:tokenId
app.get("/api/token/:tokenId", async (req, res, next) => {
    try {
        const axiosRes = await (0, mpgs_1.retrieveToken)(req.params.tokenId);
        res.status(axiosRes.status).json(axiosRes.data);
    }
    catch (err) {
        next(err);
    }
});
// Fallback → serve SPA index.html
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../../frontend/index.html"));
});
// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    const status = err.response?.status || 500;
    const body = err.response?.data || { error: "Internal server error" };
    res.status(status).json(body);
});
app.listen(PORT, () => {
    console.log(`Node backend listening on http://localhost:${PORT}`);
});
