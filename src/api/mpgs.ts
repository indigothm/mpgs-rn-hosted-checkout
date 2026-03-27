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
