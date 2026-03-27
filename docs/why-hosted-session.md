# Why Hosted Session over Native MPGS SDKs in React Native

MPGS offers native SDKs for [iOS](https://github.com/Mastercard-Gateway/gateway-ios-sdk) and [Android](https://github.com/Mastercard-Gateway/gateway-android-sdk) that provide native UI components for card collection and tokenization. This document explains why the **WebView-based Hosted Session** approach used in this project is a better fit for React Native apps, and where the trade-offs lie.

## Advantages of Hosted Session (WebView)

### Cross-platform code reuse

The Hosted Session integration is platform-agnostic. The same HTML/JS card form runs identically on iOS, Android, and web. In this project, the entire checkout UI is a single TypeScript template (`src/checkout/checkoutHtml.ts`) — one codebase, not two native wrappers.

With the native SDKs, you would need:

- A Swift/ObjC native module bridge for the iOS SDK
- A Kotlin/Java native module bridge for the Android SDK
- Separate maintenance, testing, and upgrade paths for each

### Single integration surface

Every payment flow — card capture, 3DS authentication, wallet handoff — talks to the same Node.js backend through the same set of REST endpoints. There is one place to debug, one set of API calls to audit, and one token format flowing through the system.

Native SDKs introduce a second integration surface per platform: the SDK talks directly to MPGS for tokenization, but you still need your backend for 3DS and payment execution. This means more moving parts and more places for things to diverge.

### Full feature coverage without SDK limitations

The Hosted Session JS library (`session.js`) is MPGS's primary web integration and receives updates first. It supports:

- Hosted fields (PCI-compliant iframes for card input)
- 3DS2 (frictionless + challenge flows)
- Session-based tokenization
- All card brands supported by the gateway

The native SDKs have historically lagged behind the JS library in feature support and version coverage. By using the Hosted Session, you're always on the same integration path as MPGS's web documentation and examples.

### Simpler Expo compatibility

This project runs on Expo. The WebView approach only requires `react-native-webview` — a well-supported, widely-used native module. Wrapping the MPGS native SDKs would require custom native modules with platform-specific build configuration (CocoaPods for iOS, Gradle for Android), adding friction to the Expo dev build process.

### PCI scope stays minimal

With Hosted Session, card data is entered into MPGS-hosted iframes. Card numbers never touch your JavaScript, your native code, or your backend. The native SDKs also keep you out of full PCI scope, but they do handle card data within your app's native process — the Hosted Session iframe isolation is a stricter boundary.

### Wallets are already native

The strongest argument for native SDKs — native wallet UX — doesn't apply here. Apple Pay and Google Pay are handled via `@rnw-community/react-native-payments` (W3C Payment Request API), which invokes the OS payment sheet directly. The encrypted device token goes straight to the backend. The native MPGS SDKs would just be another wrapper around the same OS APIs.

## Disadvantages of Hosted Session (WebView)

### Non-native card input UX

The card form lives inside a WebView. This means:

- Styling is CSS, not native UI components — it can look out of place
- Text input behaviour (autofill, keyboard handling, focus transitions) may feel slightly different from native fields
- WebView rendering adds a layer of overhead compared to native views

### WebView overhead and startup time

Loading `session.js` and initialising hosted field iframes takes time. There is a visible load/render delay when the checkout screen opens. Native SDKs render immediately since the UI is compiled into the app.

### Debugging is harder

Issues inside the WebView (JS errors, MPGS session failures, 3DS iframe problems) require WebView remote debugging. Native SDK issues surface through standard Xcode/Android Studio tooling, which is more familiar to mobile developers.

### Bridge complexity for two-way communication

The WebView and React Native communicate via `postMessage` / `onMessage`. This works, but it's a string-based protocol that requires manual serialization and message type handling. As flows get more complex (e.g., wallet clicks triggering native payment sheets, then posting results back), this bridge can become hard to follow.

### Dependency on WebView behaviour

`react-native-webview` wraps platform WebView engines (WKWebView on iOS, Chromium on Android). Differences in JavaScript execution, cookie handling, or iframe support between platforms can cause subtle bugs — especially in security-sensitive flows like 3DS challenges.

## Summary

| Concern | Hosted Session (WebView) | Native MPGS SDKs |
|---------|--------------------------|-------------------|
| Platforms from one codebase | iOS + Android + Web | iOS-only or Android-only |
| Integration surface | One (backend REST) | SDK + backend per platform |
| Expo compatibility | Simple (`react-native-webview`) | Custom native modules required |
| Card input UX | Web-based (CSS styled) | Fully native |
| PCI isolation | Iframe sandbox | In-process native views |
| Wallet payments | Same (OS payment sheet) | Same (OS payment sheet) |
| 3DS support | Full (via `session.js`) | Varies by SDK version |
| Startup performance | WebView load delay | Instant |
| Debugging | WebView remote debugging | Native IDE tooling |

For a React Native app — especially one running on Expo — the Hosted Session approach trades some card input polish for significantly simpler cross-platform integration and maintenance. The native SDKs make sense for pure-native iOS or Android apps where a single-platform investment is acceptable.
