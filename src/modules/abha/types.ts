import { ABHALink } from '../../shared/types';

/**
 * ABHA Link Status
 */
export type ABHALinkStatus = 'pending' | 'linked' | 'failed';

/**
 * Initiate ABHA Link Request
 * Step 1: User provides ABHA number to initiate linking
 */
export interface InitiateLinkRequest {
  abha_number: string;
}

export interface InitiateLinkResponse {
  success: boolean;
  message: string;
  link_id?: string;
  // In development, return mock OTP for testing
  otp?: string;
}

/**
 * Verify ABHA Link Request
 * Step 2: User verifies with OTP sent to ABHA-registered mobile
 */
export interface VerifyLinkRequest {
  link_id: string;
  otp: string;
}

export interface VerifyLinkResponse {
  success: boolean;
  message: string;
  abha_link?: ABHALink;
}

/**
 * Get ABHA Link Status Response
 */
export interface GetLinkStatusResponse {
  success: boolean;
  linked: boolean;
  abha_link?: ABHALink;
}

/**
 * Mock ABHA verification entry
 * For development/sandbox mode
 */
export interface ABHAVerificationEntry {
  link_id: string;
  user_id: string;
  abha_number: string;
  otp: string;
  expires_at: Date;
  attempts: number;
}
