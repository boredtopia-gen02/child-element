import { Context } from 'hono';
import { verifySignature } from "thirdweb/auth";
import { client, chain } from "./thirdweb-config";

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

    // ตรวจสอบ timestamp (ไม่ให้เก่ากว่า 5 นาที)
    const currentTime = Date.now();
    const fiveMinutesAgo = currentTime - (5 * 60 * 1000);
    
    if (timestamp < fiveMinutesAgo) {
      return c.json({
        success: false,
        error: 'Signature timestamp is too old'
      }, 400);
    }

    if (timestamp > currentTime + (1 * 60 * 1000)) { // ไม่ให้อนาคตเกิน 1 นาที
      return c.json({
        success: false,
        error: 'Signature timestamp is in the future'
      }, 400);
    }

    // ตรวจสอบรูปแบบ message ให้ตรงกับ format ที่ parent ส่งมา
    // format: "gameName:timestamp" เช่น "crosswalk:1323423423"
    const expectedMessage = `crosswalk:${timestamp}`;
    if (message !== expectedMessage) {
      return c.json({
        success: false,
        error: `Invalid message format. Expected: ${expectedMessage}, Got: ${message}`
      }, 400);
    }

    // ใช้ thirdweb verifySignature แทน ethers
    const isValid = await verifyThirdwebSignature(walletAddress, signature, message);

    return c.json({
      success: true,
      data: {
        isValid,
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

// Thirdweb signature verification
async function verifyThirdwebSignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    // ใช้ thirdweb verifySignature function
    const isValid = await verifySignature({
      message,
      signature,
      address: walletAddress,
      client,
      chain
    });
    
    console.log('Thirdweb signature verification:', {
      walletAddress,
      message,
      signature,
      isValid
    });
    
    return isValid;
    
  } catch (error) {
    console.error('Thirdweb signature verification failed:', error);
    return false;
  }
}
