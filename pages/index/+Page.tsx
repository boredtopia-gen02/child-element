
import { useEffect, useState } from "react";
import { useGameBridgeComm } from "../../hook/useGameBridgeComm";

export default function Page() {
  const { sendMessage, addMessageListener } = useGameBridgeComm();
  const [status, setStatus] = useState<'waiting' | 'auth' | 'verifying' | 'verified' | 'minting' | 'burning'>('waiting');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [currentNonce, setCurrentNonce] = useState<number | null>(null);
  const [gamePoints, setGamePoints] = useState<number | null>(null);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  // เก็บ auth signature และข้อมูลที่เกี่ยวข้องไว้ใช้กับ API calls
  const [authData, setAuthData] = useState<{
    signature: string;
    message: string;
    timestamp: number;
  } | null>(null);

  const verifySignature = async (authPayload: any) => {
    try {
      setStatus('verifying');
      
      const response = await fetch('/api/verify-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: authPayload.walletAddress,
          signature: authPayload.signature,
          message: authPayload.message,
          timestamp: authPayload.timestamp
        })
      });

      const result = await response.json();
      
      if (result.success && result.data?.isValid) {
        setVerificationResult(true);
        setStatus('verified');
        console.log('Signature verified successfully');
      } else {
        setVerificationResult(false);
        setStatus('auth');
        console.error('Signature verification failed:', result.error);
      }
    } catch (error) {
      console.error('Error verifying signature:', error);
      setVerificationResult(false);
      setStatus('auth');
    }
  };

  const signAction = async (action: 'mint' | 'burn', amount: number): Promise<{ signature: string; nextNonce: number } | null> => {
    try {
      if (!walletAddress || currentNonce === null) {
        console.error('Missing required data for signing');
        return null;
      }

      if (!authData) {
        console.error('Missing authentication data');
        return null;
      }

      const response = await fetch('/api/sign-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          action,
          amount,
          currentNonce,
          // ส่ง auth data ไปให้ server verify
          authSignature: authData.signature,
          authMessage: authData.message,
          authTimestamp: authData.timestamp
        })
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        return {
          signature: result.data.signature,
          nextNonce: result.data.nextNonce
        };
      } else {
        console.error('Failed to sign action:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error calling sign action API:', error);
      return null;
    }
  };

  useEffect(() => {
    // ส่ง ready ไปยัง parent iframe
    sendMessage({ type: "ready", payload: { gameName: "crosswalk" } });
    setStatus('waiting');

    // รอฟัง auth
    const removeListener = addMessageListener((message) => {
      if (message.type === "auth" && message.payload?.walletAddress) {
        setWalletAddress(message.payload.walletAddress);
        setCurrentNonce(message.payload.currentNonce !== undefined ? message.payload.currentNonce : null);
        setGamePoints(message.payload.gamePoints !== undefined ? message.payload.gamePoints : null);
        setStatus('auth');
        
        // เก็บ auth signature ไว้ใช้กับ API calls
        if (message.payload.signature && message.payload.message && message.payload.timestamp) {
          setAuthData({
            signature: message.payload.signature,
            message: message.payload.message,
            timestamp: message.payload.timestamp
          });
          
          // Verify signature
          verifySignature(message.payload);
        }
      }
    });
    return removeListener;
  }, [sendMessage, addMessageListener]);

  const handleMint = async () => {
    if (verificationResult !== true) {
      console.error('Cannot mint: signature not verified');
      return;
    }
    
    setStatus('minting');
    
    try {
      // Default amount to mint (you can make this configurable)
      const amountToMint = 100;
      
      const result = await signAction('mint', amountToMint);
      
      if (result) {
        // Send mint message with signature to parent
        sendMessage({ 
          type: 'mint', 
          payload: { 
            gameName: "crosswalk",
            walletAddress,
            signature: result.signature,
            amount: amountToMint,
            nextNonce: result.nextNonce
          } 
        });
        
        console.log('Mint action signed and sent to parent');
        setTimeout(() => setStatus('verified'), 1000); // mock mint เสร็จ
      } else {
        console.error('Failed to sign mint action');
        setStatus('verified');
      }
    } catch (error) {
      console.error('Error in handleMint:', error);
      setStatus('verified');
    }
  };

  const handleBurn = async () => {
    if (verificationResult !== true) {
      console.error('Cannot burn: signature not verified');
      return;
    }
    
    setStatus('burning');
    
    try {
      // Default amount to burn (you can make this configurable)
      const amountToBurn = 50;
      
      const result = await signAction('burn', amountToBurn);
      
      if (result) {
        // Send burn message with signature to parent
        sendMessage({ 
          type: 'burn', 
          payload: { 
            gameName: "crosswalk",
            walletAddress,
            signature: result.signature,
            amount: amountToBurn,
            nextNonce: result.nextNonce
          } 
        });
        
        console.log('Burn action signed and sent to parent');
        setTimeout(() => setStatus('verified'), 1000); // mock burn เสร็จ
      } else {
        console.error('Failed to sign burn action');
        setStatus('verified');
      }
    } catch (error) {
      console.error('Error in handleBurn:', error);
      setStatus('verified');
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h1 className="font-bold text-3xl pb-4">Child index page</h1>
      {status === 'waiting' && (
        <div className="text-lg text-yellow-600">รอรับ auth จาก parent...</div>
      )}
      {status === 'verifying' && (
        <div className="text-lg text-blue-600">กำลัง verify signature...</div>
      )}
      {(status === 'auth' || status === 'verified') && walletAddress && (
        <div>
          <div className="text-green-700 pb-2">Wallet Address: <span className="font-mono">{walletAddress}</span></div>
          {currentNonce !== null && (
            <div className="text-blue-700 pb-2">Current Nonce: <span className="font-mono">{currentNonce}</span></div>
          )}
          {gamePoints !== null && (
            <div className="text-purple-700 pb-2">Game Points: <span className="font-mono">{gamePoints}</span></div>
          )}
          {verificationResult === true && (
            <div className="text-green-600 pb-2">✅ Signature Verified</div>
          )}
          {verificationResult === false && (
            <div className="text-red-600 pb-2">❌ Signature Verification Failed</div>
          )}
          <div className="flex gap-4">
            <button 
              className={`px-4 py-2 text-white rounded ${verificationResult === true ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
              onClick={handleMint}
              disabled={verificationResult !== true}
            >
              Mint
            </button>
            <button 
              className={`px-4 py-2 text-white rounded ${verificationResult === true ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-400 cursor-not-allowed'}`}
              onClick={handleBurn}
              disabled={verificationResult !== true}
            >
              Burn
            </button>
          </div>
        </div>
      )}
      {status === 'minting' && (
        <div className="text-blue-600">กำลัง mint...</div>
      )}
      {status === 'burning' && (
        <div className="text-red-600">กำลัง burn...</div>
      )}
    </div>
  );
}
