// src/api/mpgs.ts — Functions called from native code

import { api } from './client';
import type { MpgsConfig, SessionResponse } from './types';

/**
 * GET /api/config
 * Returns MPGS configuration (baseUrl, merchantId, formVersion, enable3ds).
 */
export async function getConfig(): Promise<MpgsConfig> {
  return api.get<MpgsConfig>('/api/config');
}

/**
 * POST /api/session
 * Creates a new MPGS hosted session.
 */
export async function createSession(): Promise<SessionResponse> {
  return api.post<SessionResponse>('/api/session');
}

/**
 * POST /api/paypal/create
 * Creates a browser payment session for PayPal and returns interaction URLs.
 */
export async function createPayPalPayment(data: {
  amount: number | string;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<any> {
  return api.post<any>('/api/paypal/create', data);
}

/**
 * POST /api/paypal/capture
 * Validates and captures a completed PayPal transaction.
 */
export async function capturePayPalPayment(data: {
  orderId: string;
  transactionId: string;
}): Promise<any> {
  return api.post<any>('/api/paypal/capture', data);
}
