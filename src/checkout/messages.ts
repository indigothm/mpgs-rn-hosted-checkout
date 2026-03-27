// src/checkout/messages.ts — WebView ↔ Native message types

export type WebViewMessage =
  | { type: 'PAYMENT_RESULT'; result: 'SUCCESS' | 'FAILED'; data: any }
  | { type: 'ERROR'; message: string }
  | { type: 'LOG'; message: string };

/**
 * Parse a raw postMessage string into a typed WebViewMessage.
 * Returns null if the message is not a valid JSON or not one of our message types.
 */
export function parseWebViewMessage(raw: string): WebViewMessage | null {
  try {
    const msg = JSON.parse(raw);
    if (msg && typeof msg.type === 'string') {
      return msg as WebViewMessage;
    }
    return null;
  } catch {
    return null;
  }
}
