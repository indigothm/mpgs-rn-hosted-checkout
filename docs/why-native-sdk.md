# Why Native MPGS SDKs over Hosted Session in React Native

This is the counterpart to [why-hosted-session.md](./why-hosted-session.md). It makes the case for using the MPGS native SDKs ([iOS](https://github.com/Mastercard-Gateway/gateway-ios-sdk), [Android](https://github.com/Mastercard-Gateway/gateway-android-sdk)) instead of the WebView-based Hosted Session approach, and where that choice falls short.

## Advantages of Native MPGS SDKs

### Fully native card input experience

Card fields are real native text inputs — `UITextField` on iOS, `EditText` on Android. This means:

- System autofill and saved card suggestions work out of the box
- Keyboard behaviour, focus transitions, and accessibility are handled by the OS
- Input feels indistinguishable from any other screen in the app
- No WebView load flash or iframe rendering delay

For apps where checkout UX is a competitive differentiator, this matters.

### No WebView dependency

Removing the WebView from the payment flow eliminates an entire class of issues:

- No `react-native-webview` version compatibility concerns
- No WKWebView vs Chromium behavioural differences across platforms
- No iframe sandboxing quirks affecting 3DS challenge rendering
- No `postMessage` bridge to maintain for native/web communication

The payment flow stays entirely within the native runtime.

### Faster checkout startup

Native SDK UI renders immediately — there is no network fetch for `session.js`, no iframe initialisation, and no WebView engine spin-up. On lower-end devices, this can be a noticeable difference (hundreds of milliseconds to seconds).

### Standard native debugging

When something breaks, you debug it in Xcode or Android Studio with breakpoints, native stack traces, and network inspectors. No need for WebView remote debugging, `console.log` via `onMessage`, or inspecting injected JavaScript.

### SDK-managed tokenization

The native SDKs handle the card-to-token exchange directly with MPGS. This is a tighter integration — the SDK manages the session lifecycle, validates card input locally before sending, and returns a token. With Hosted Session, you rely on the WebView JS context to call `updateSessionFromForm()` and parse the response, with error handling split across the bridge.

### Potentially better security review optics

Some security audits and compliance reviews look more favourably on native SDK integrations than WebView-based ones. While both approaches keep you out of full PCI scope, the argument that "card data never enters a WebView JavaScript context" can be easier to make with native SDKs — the data stays in compiled native code managed by the gateway vendor.

## Disadvantages of Native MPGS SDKs

### Separate integration per platform

The iOS SDK is Swift/ObjC. The Android SDK is Kotlin/Java. In a React Native app, this means:

- Writing and maintaining a native module bridge for each platform
- Two sets of build configuration (CocoaPods + Gradle)
- Two sets of SDK upgrades to track independently
- Platform-specific bugs that don't reproduce on the other side

You effectively double your payment integration surface.

### Expo friction

Expo development builds require custom native modules to be configured via plugins or bare workflow. Wrapping third-party native SDKs that weren't designed for React Native adds setup complexity — especially around autolinking, dependency conflicts, and EAS Build configuration.

### No web support

If your React Native app also targets web (via Expo Web or React Native Web), the native SDKs don't help. You'd still need the Hosted Session approach for the web target, meaning you maintain two completely separate card capture implementations.

### SDK feature lag

The MPGS Hosted Session JS library is the primary integration path and tends to receive feature updates and new API version support first. The native SDKs may lag behind on:

- New API versions
- 3DS2 specification updates
- New card brand support
- New payment features

You're relying on Mastercard's native SDK team to keep pace with the gateway team.

### 3DS still needs your backend

The native SDKs handle card collection and tokenization, but the 3DS authentication flow (initiate, authenticate, challenge, poll) still runs through your backend and MPGS REST API. The SDK doesn't replace the 3DS integration — you need that backend infrastructure regardless.

### Wallets don't benefit

Apple Pay and Google Pay invoke OS-level payment sheets. The native MPGS SDKs wrap the same `PKPaymentAuthorizationController` (iOS) and `PaymentsClient` (Android) APIs that any React Native payment library already wraps. There is no wallet-specific advantage to using the MPGS SDK over a library like `react-native-payments`.

## Summary

| Concern | Native MPGS SDKs | Hosted Session (WebView) |
|---------|-------------------|--------------------------|
| Card input UX | Fully native | Web-based (CSS styled) |
| WebView dependency | None | Required |
| Checkout startup speed | Instant | WebView + JS load delay |
| Debugging | Native IDE tooling | WebView remote debugging |
| Tokenization | SDK-managed | JS bridge to `session.js` |
| Platform coverage | iOS-only or Android-only | iOS + Android + Web |
| Integration effort in RN | Native module per platform | Single WebView component |
| Expo compatibility | Custom native modules | Simple (`react-native-webview`) |
| 3DS handling | Still needs backend | Still needs backend |
| Wallet payments | Same (OS payment sheet) | Same (OS payment sheet) |
| Feature update cadence | Follows native SDK releases | Follows `session.js` releases |

The native SDKs are the right choice for pure-native iOS or Android apps where checkout UX polish, startup speed, and native tooling access justify the per-platform investment. In React Native — especially with Expo and web targets — the integration cost is harder to justify given that the core advantages (wallets, 3DS) don't change.
