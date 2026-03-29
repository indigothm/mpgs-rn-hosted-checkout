# MPGS Tyro Sample — Demo Summary

## Running the demo

```bash
cd references/mpgs-tyro-sample-main/backend-node
PORT=3001 npm start
```

Open **http://localhost:3001** in a browser.

> Port 5000 is blocked by macOS AirPlay Receiver, so use 3001.

Credentials are in `.env` (already created from `links.txt`):
- Merchant ID: `TESTGYG`
- Gateway: `https://test-tyro.mtf.gateway.mastercard.com`
- API version: `100`

---

## What the demo covers

### 1. Hosted Session (card capture)
MPGS's `session.js` injects iframe-based fields for card number, expiry, CVV, and name on card. Raw card data never touches the backend — only a session ID is exchanged.

### 2. EMV 3-D Secure (3DS2)
Full browser-based 3DS flow on every card payment:
1. `INITIATE_AUTHENTICATION` — tells MPGS what card/session to authenticate
2. `AUTHENTICATE_PAYER` — runs the 3DS2 protocol; may return frictionless (instant) or a challenge
3. If challenged, an iframe overlay is shown and the backend is polled every 2 s until the status is `Y` (authenticated) or fails
4. The resulting `authentication.transactionId` is forwarded to the `PAY` call

3DS can be disabled via `ENABLE_3DS=false` in `.env`.

### 3. PAY transaction
A `PUT` to the MPGS order/transaction endpoint with `apiOperation: PAY`. Supports three funding source modes:
- **Session** — standard hosted session card
- **Token** — stored card token (used on future payments without 3DS)
- **Device payment token** — wallet-sourced token (Google/Apple Pay)

### 4. Tokenisation
If the user checks "Save card", the session is tokenised via `POST /token` before the PAY call. The token is stored for future use. When 3DS is active the PAY still uses the session (not the token), because MPGS requires the authenticated funding source to match.

### 5. Google Pay (Web)
Uses the Google Pay JS API with `PAYMENT_GATEWAY` tokenisation pointing at `gateway: "mpgs"`. On authorisation the encrypted `devicePaymentToken` is sent to `/api/pay/google`, which passes it to MPGS as `sourceOfFunds.provided.card.devicePayment.paymentToken` with `order.walletProvider = "GOOGLE_PAY"`. No 3DS step — Google handles authentication.

### 6. Apple Pay (placeholder)
Button present but shows an alert explaining the setup steps (domain verification, Apple Pay certificates in MPGS). The backend handler is the same pattern as Google Pay.

### 7. Webhook receiver
`POST /webhooks/mpgs` accepts MPGS event notifications and persists payloads to a local SQLite database (`orders.db`).

---

## Backend API surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/config` | Returns `baseUrl`, `merchantId`, `formVersion`, `enable3ds` |
| POST | `/api/session` | Creates a new MPGS Hosted Session |
| POST | `/api/3ds/initiate` | `INITIATE_AUTHENTICATION` |
| POST | `/api/3ds/authenticate` | `AUTHENTICATE_PAYER` |
| GET | `/api/3ds/status` | Polls 3DS transaction status |
| POST | `/api/tokenize` | Creates a card token from a session |
| GET | `/api/token/:tokenId` | Retrieves token details |
| POST | `/api/pay` | `PAY` — session, token, or device payment token |
| POST | `/api/pay/google` | Google Pay specific `PAY` shortcut |

---

## Test cards

Use standard MPGS sandbox test cards, e.g.:
- Mastercard (frictionless 3DS): `5123456789012346`, expiry any future date, CVV `100`
- Cards that trigger a 3DS challenge will show the challenge iframe overlay
