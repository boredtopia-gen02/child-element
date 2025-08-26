import { ethers } from "ethers";
import { verifyAuthSignature } from "./auth-helper";

interface SignActionRequest {
  walletAddress: string;
  action: 'mint' | 'burn';
  amount: number;
  currentNonce: number;
  // เพิ่มข้อมูล auth signature
  authSignature: string;
  authMessage: string;
  authTimestamp: number;
}

interface SignActionResponse {
  success: boolean;
  data?: {
    signature: string;
    nextNonce: number;
  };
  error?: string;
}

export async function handleSignAction(request: SignActionRequest): Promise<SignActionResponse> {
  try {
    const { walletAddress, action, amount, currentNonce, authSignature, authMessage, authTimestamp } = request;

    // Validate inputs
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return {
        success: false,
        error: 'Invalid wallet address'
      };
    }

    if (!['mint', 'burn'].includes(action)) {
      return {
        success: false,
        error: 'Invalid action. Must be "mint" or "burn"'
      };
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return {
        success: false,
        error: 'Invalid amount. Must be a positive number'
      };
    }

    if (typeof currentNonce !== 'number' || currentNonce < 0) {
      return {
        success: false,
        error: 'Invalid nonce. Must be a non-negative number'
      };
    }

    // Validate auth data
    if (!authSignature || !authMessage || !authTimestamp) {
      return {
        success: false,
        error: 'Missing authentication data'
      };
    }

    // Verify auth signature with API expire time
    const authVerification = await verifyAuthSignature(
      walletAddress, 
      authSignature, 
      authMessage, 
      authTimestamp, 
      { useApiExpireTime: true }
    );
    if (!authVerification.isValid) {
      return {
        success: false,
        error: authVerification.error || 'Authentication failed'
      };
    }

    const SIGNER_SECRET_KEY = import.meta.env.SIGNER_SECRET_KEY;
    const GAMEPOINTS_ADDRESS = import.meta.env.PUBLIC_ENV__GAME_POINT_ADDRESS;

    if (!SIGNER_SECRET_KEY) {
      console.error('SIGNER_SECRET_KEY not found in environment variables');
      return {
        success: false,
        error: 'Server configuration error'
      };
    }

    if (!GAMEPOINTS_ADDRESS) {
      console.error('PUBLIC_ENV__GAME_POINT_ADDRESS not found in environment variables');
      return {
        success: false,
        error: 'Server configuration error'
      };
    }

    // Create signer from secret key
    const signer = new ethers.Wallet(SIGNER_SECRET_KEY);
    
    // Calculate next nonce
    const nextNonce = currentNonce + 1;

    // Create message components
    const messageComponents = [
      walletAddress.toLowerCase(),
      action,
      amount,
      nextNonce,
      GAMEPOINTS_ADDRESS.toLowerCase()
    ];

    // Pack and hash the message
    const messageBytes = ethers.solidityPacked(
      ["string", "string", "uint256", "uint256", "string"],
      messageComponents
    );
    const messageHash = ethers.keccak256(messageBytes);

    // Sign the message hash
    const signature = await signer.signMessage(ethers.getBytes(messageHash));
    
    return {
      success: true,
      data: {
        signature,
        nextNonce
      }
    };

  } catch (error) {
    console.error('Error in handleSignAction:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}
