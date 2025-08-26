import { verifySignature } from "thirdweb/auth";
import { client, chain } from "./thirdweb-config";

interface AuthVerificationOptions {
  useApiExpireTime?: boolean; // ใช้ API expire time แทน default
}

interface AuthVerificationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Verify authentication signature using thirdweb
 * @param walletAddress - Wallet address that signed the message
 * @param signature - The signature to verify
 * @param message - The original message that was signed
 * @param timestamp - Timestamp when the signature was created
 * @param options - Options for verification (expire time, etc.)
 */
export async function verifyAuthSignature(
  walletAddress: string,
  signature: string,
  message: string,
  timestamp: number,
  options: AuthVerificationOptions = {}
): Promise<AuthVerificationResult> {
  try {
    // ได้รับ expire time จาก environment variables
    const defaultExpireTime = import.meta.env.SIGNATURE_EXPIRE_TIME_MILLI 
      ? parseInt(import.meta.env.SIGNATURE_EXPIRE_TIME_MILLI) 
      : 5 * 60 * 1000; // default 5 minutes

    const apiExpireTime = import.meta.env.SIGNATURE_EXPIRE_API_TIME_MILLI 
      ? parseInt(import.meta.env.SIGNATURE_EXPIRE_API_TIME_MILLI) 
      : 60 * 60 * 1000; // default 60 minutes

    const expireTime = options.useApiExpireTime ? apiExpireTime : defaultExpireTime;

    // ตรวจสอบ timestamp 
    const currentTime = Date.now();
    const expiredTime = currentTime - expireTime;
    
    if (timestamp < expiredTime) {
      return { 
        isValid: false, 
        error: `Auth signature timestamp is too old (expired after ${expireTime / 1000} seconds)` 
      };
    }

    if (timestamp > currentTime + (1 * 60 * 1000)) {
      return { 
        isValid: false, 
        error: 'Auth signature timestamp is in the future' 
      };
    }

    // ตรวจสอบรูปแบบ message ให้ตรงกับ format
    // format: "gameName:timestamp" เช่น "crosswalk:1323423423"
    const expectedMessage = `crosswalk:${timestamp}`;
    if (message !== expectedMessage) {
      return { 
        isValid: false, 
        error: `Invalid auth message format. Expected: ${expectedMessage}, Got: ${message}` 
      };
    }

    // ใช้ thirdweb verifySignature
    const isValid = await verifySignature({
      message,
      signature,
      address: walletAddress,
      client,
      chain
    });
    
    console.log('Auth signature verification:', {
      walletAddress,
      message,
      isValid,
      expireTime,
      isApiCall: options.useApiExpireTime
    });
    
    return { isValid };
    
  } catch (error) {
    console.error('Auth signature verification failed:', error);
    return { 
      isValid: false, 
      error: 'Auth signature verification failed' 
    };
  }
}
