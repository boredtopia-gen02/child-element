import { Context } from 'hono';
import { verifyAuthSignature } from "./auth-helper";

interface VerifySignatureRequest {
  walletAddress: string;
  signature: string;
  message: string;
  timestamp: number;
}

interface VerifySignatureResponse {
  success: boolean;
  error?: string;
  data?: {
    isValid: boolean;
    walletAddress: string;
  };
}

export async function verifySignatureHandler(c: Context): Promise<Response> {
  try {
    // ตรวจสอบ Content-Type
    if (!c.req.header('content-type')?.includes('application/json')) {
      return c.json({ success: false, error: 'Content-Type must be application/json' }, 400);
    }

    const body: VerifySignatureRequest = await c.req.json();
    const { walletAddress, signature, message, timestamp } = body;

    // ตรวจสอบ required fields
    if (!walletAddress || !signature || !message || !timestamp) {
      return c.json({
        success: false,
        error: 'Missing required fields: walletAddress, signature, message, timestamp'
      }, 400);
    }

    // ใช้ helper function สำหรับ verify auth signature (ใช้ default expire time)
    const authVerification = await verifyAuthSignature(walletAddress, signature, message, timestamp);
    
    if (!authVerification.isValid) {
      return c.json({
        success: false,
        error: authVerification.error || 'Signature verification failed'
      }, 400);
    }

    return c.json({
      success: true,
      data: {
        isValid: true,
        walletAddress
      }
    });

  } catch (error) {
    console.error('Error verifying signature:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
}
