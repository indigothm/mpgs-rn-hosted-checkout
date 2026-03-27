# MPGS React Native Hosted Checkout

<p align="center">
  <img src="screenshots/checkout.png" width="300" alt="Checkout Screen" />
  &nbsp; &nbsp; &nbsp;
  <img src="screenshots/3ds.png" width="300" alt="3DS Authentication Challenge" />
</p>

A React Native Expo app integrating Mastercard Payment Gateway Services (MPGS) Hosted Session checkout. Card payments (including 3DS authentication) run inside a WebView, with native screens for order entry, confirmation, and errors.

## Features

- **Card payments** — MPGS Hosted Session with hosted fields (card number, expiry, CVV, name)
- **3DS authentication** — Full 3DS2 flow (frictionless + challenge) inside the WebView
- **Google Pay** — Native hook ready for Android dev builds
- **Apple Pay** — Placeholder (requires Apple Developer setup)
- **PayPal** — Placeholder (requires backend endpoints)

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Expo CLI** — installed globally or via `npx`
- **Xcode** (for iOS) or **Android Studio** (for Android)
- MPGS sandbox credentials (merchant ID + API password)

## Quick Start

### 1. Install dependencies

```bash
# React Native app
npm install

# Backend
cd backend && npm install
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MPGS sandbox credentials
```

### 3. Start the backend

```bash
cd backend
PORT=3001 npm start
```

The backend runs on `http://localhost:3001`.

### 4. Run the app

Since the app uses `react-native-webview` (a native module), it requires a **development build** — Expo Go won't work.

```bash
# iOS (requires Xcode)
npx expo run:ios

# Android (requires Android Studio)
npx expo run:android
```

Alternatively, to start the Metro bundler (if you already have a dev build installed):

```bash
npx expo start --dev-client
```

### 5. Test a payment

1. Enter an amount (default: $10.00)
2. Tap **Pay with Card**
3. Fill in the test card details (see [Test Cards](#test-cards))
4. Tap **Pay** — the 3DS flow will run
5. You should see the **Payment Successful** screen

## Test Cards

| Card | Number | Expiry | CVV | 3DS Behaviour |
|------|--------|--------|-----|---------------|
| Mastercard (No 3DS / Frictionless) | `5123456789012346` | Any future date | `100` | 3DS passes silently |
| Mastercard (3DS Challenge) | `5123450000000008` | Any future date | Any 3 digits | Triggers 3DS challenge |

## Project Structure

```
├── app/                       # React Native (Expo Router)
│   ├── _layout.tsx            # Root Stack navigator
│   ├── index.tsx              # Order screen
│   └── payment/
│       ├── _layout.tsx        # Payment sub-stack (modal)
│       ├── checkout.tsx       # WebView checkout
│       ├── confirmation.tsx   # Success screen
│       └── error.tsx          # Error screen
├── src/
│   ├── api/                   # Backend API client
│   ├── checkout/              # WebView HTML generator + messages
│   ├── components/            # Reusable UI components
│   ├── constants/             # Config + feature flags
│   └── payments/              # Payment hooks (Google/Apple/PayPal)
├── backend/                   # Node.js Express backend
│   ├── src/
│   │   ├── server.ts          # API routes
│   │   ├── mpgs.ts            # MPGS gateway integration
│   │   └── db.ts              # SQLite order storage
│   ├── .env.example           # Environment template
│   └── package.json
└── web-reference/             # Reference web frontend (browser-based)
    ├── index.html             # Hosted Session web UI
    ├── checkout.js            # Card + 3DS + PAY flow
    └── wallets.js             # Google Pay / Apple Pay (web)
```

## Architecture

The app uses a **WebView-centric** approach for card payments:

1. **Native** calls `getConfig()` + `createSession()` to get MPGS config and a session ID
2. **Native** navigates to the WebView checkout screen, passing config as params
3. **WebView** loads a self-contained HTML page that:
   - Loads MPGS `session.js` from the gateway CDN
   - Renders hosted card input fields (PCI-compliant iframes)
   - Runs the full 3DS flow (initiate → authenticate → challenge polling → pay)
   - Posts the result back to native via `window.ReactNativeWebView.postMessage()`
4. **Native** receives the result and navigates to confirmation or error

This minimises the bridge complexity — the WebView handles the entire payment flow and only posts the final result.

## Running on a Physical Device

When running on a physical device, `localhost` won't work. Update `src/constants/config.ts` to point to your machine's LAN IP:

```ts
export const API_BASE_URL = 'http://192.168.x.x:3001';
```

## Backend API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/config` | Returns `baseUrl`, `merchantId`, `formVersion`, `enable3ds` |
| POST | `/api/session` | Creates a new MPGS Hosted Session |
| POST | `/api/3ds/initiate` | `INITIATE_AUTHENTICATION` |
| POST | `/api/3ds/authenticate` | `AUTHENTICATE_PAYER` |
| GET | `/api/3ds/status` | Polls 3DS transaction status |
| POST | `/api/tokenize` | Creates a card token from a session |
| POST | `/api/pay` | `PAY` — session, token, or device payment token |
| POST | `/api/pay/google` | Google Pay `PAY` shortcut |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MPGS_BASE_URL` | MPGS gateway URL (sandbox: `https://test-tyro.mtf.gateway.mastercard.com`) |
| `MPGS_MERCHANT_ID` | Your MPGS merchant ID |
| `MPGS_API_PASSWORD` | Your MPGS API password |
| `MPGS_API_VERSION` | MPGS API version (e.g. `100`) |
| `MPGS_FORM_VERSION` | Hosted Session form version |
| `ENABLE_3DS` | Enable 3DS authentication (`true`/`false`) |

## MPGS Documentation

- [Hosted Session Integration Guide](https://tyro.gateway.mastercard.com/api/documentation/integrationGuidelines/hostedSession/integrationModelHostedSession.html?locale=en_US)
- [API Reference](https://tyro.gateway.mastercard.com/api/documentation/apiDocumentation/rest-json/version/latest/apiReference.html?locale=en_US)
- [Test & Go Live](https://tyro.gateway.mastercard.com/api/documentation/integrationGuidelines/supportedFeatures/testAndGoLive.html?locale=en_US)

## Web Reference Frontend

The `web-reference/` folder contains the original browser-based checkout UI. Run it via the backend:

```bash
cd backend && PORT=3001 npm start
# Open http://localhost:3001 in a browser
```

This is useful for comparing behaviour against the React Native implementation.

## License

Private — not for redistribution.
