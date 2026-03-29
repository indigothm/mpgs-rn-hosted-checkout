// src/constants/config.ts — App configuration constants

import { Platform } from 'react-native';

/**
 * Backend base URL.
 * On Android emulator, localhost maps to 10.0.2.2.
 * On iOS simulator, localhost works directly.
 * On a physical device, use your machine's LAN IP (e.g. http://192.168.x.x:3001).
 */
export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3001',
  default: 'http://localhost:3001',
});

/** Feature flags */
export const FEATURES = {
  GOOGLE_PAY_ENABLED: Platform.OS === 'android',
  APPLE_PAY_ENABLED: false, // Placeholder — requires Apple Developer setup
  PAYPAL_ENABLED: true,    // Enabled with backend endpoints
} as const;
