
import { useEffect, useState } from "react";
import { useGameBridgeComm } from "../../hook/useGameBridgeComm";

export default function Page() {
  const { sendMessage, addMessageListener } = useGameBridgeComm();
  const [status, setStatus] = useState<'waiting' | 'auth' | 'verifying' | 'verified' | 'minting' | 'burning' | 'waiting_update'>('waiting');
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
  // เก็บข้อมูลของ action ที่รอ response
  const [pendingAction, setPendingAction] = useState<{
    type: 'mint' | 'burn';
    amount: number;
  } | null>(null);
  // เก็บ timeout ID สำหรับรอ response จาก parent
  const [waitingTimeout, setWaitingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Function สำหรับ clear timeout และ reset pending state
  const clearPendingAction = () => {
    if (waitingTimeout) {
      clearTimeout(waitingTimeout);
      setWaitingTimeout(null);
    }
    setPendingAction(null);
  };

  // Function สำหรับ handle timeout
  const handleTimeout = () => {
    console.warn('Timeout waiting for parent response');
    alert('Timeout: No response from parent. Please try again.');
    clearPendingAction();
    setStatus('verified');
  };

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

    // รอฟัง auth และ update messages
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
      
      // ฟัง update message เพื่ออัพเดต nonce และ game points
      if (message.type === "update" && message.payload) {
        console.log('Received update from parent:', message.payload);
        
        // อัพเดต nonce ถ้ามีการส่งมา
        if (message.payload.currentNonce !== undefined) {
          setCurrentNonce(message.payload.currentNonce);
          console.log('Updated nonce to:', message.payload.currentNonce);
        }
        
        // อัพเดต game points ถ้ามีการส่งมา
        if (message.payload.gamePoints !== undefined) {
          setGamePoints(message.payload.gamePoints);
          console.log('Updated game points to:', message.payload.gamePoints);
        }
        
        // ใช้ functional update เพื่อเข้าถึงค่าปัจจุบันของ pendingAction และ status
        setPendingAction(currentPendingAction => {
          setStatus(currentStatus => {
            // หาก pending action เสร็จสิ้นแล้ว กลับไปสถานะ verified
            if (currentPendingAction && currentStatus === 'waiting_update') {
              console.log(`${currentPendingAction.type} action completed successfully`);
              
              // Clear timeout
              setWaitingTimeout(currentTimeout => {
                if (currentTimeout) {
                  clearTimeout(currentTimeout);
                }
                return null;
              });
              
              // Reset pending action และเปลี่ยน status
              setTimeout(() => {
                setPendingAction(null);
                setStatus('verified');
              }, 0);
            }
            return currentStatus;
          });
          return currentPendingAction;
        });
      }
      
      // ฟัง error message จาก parent
      if (message.type === "error" && message.payload) {
        console.error('Received error from parent:', message.payload);
        
        // ใช้ functional update เพื่อเข้าถึงค่าปัจจุบันของ pendingAction และ status
        setPendingAction(currentPendingAction => {
          setStatus(currentStatus => {
            console.log('Current pending action:', currentPendingAction);
            console.log('Current status:', currentStatus);
            
            // หาก pending action ล้มเหลว กลับไปสถานะ verified
            if (currentPendingAction && currentStatus === 'waiting_update') {
              console.error(`${currentPendingAction.type} action failed:`, message.payload.message || 'Unknown error');
              
              // แสดง error message (อาจจะใช้ toast หรือ alert)
              alert(`${currentPendingAction.type} failed: ${message.payload.message || 'Unknown error'}`);
              
              // Clear timeout
              setWaitingTimeout(currentTimeout => {
                if (currentTimeout) {
                  clearTimeout(currentTimeout);
                }
                return null;
              });
              
              // Reset pending action และเปลี่ยน status
              setTimeout(() => {
                setPendingAction(null);
                setStatus('verified');
              }, 0);
            }
            return currentStatus;
          });
          return currentPendingAction;
        });
      }
    });
    return () => {
      removeListener();
      // Clear timeout เมื่อ component unmount
      setWaitingTimeout(currentTimeout => {
        if (currentTimeout) {
          clearTimeout(currentTimeout);
        }
        return null;
      });
    };
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
        // เก็บข้อมูล pending action
        setPendingAction({ type: 'mint', amount: amountToMint });
        
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
        // เปลี่ยนเป็นสถานะรอ update จาก parent
        setStatus('waiting_update');
        
        // ตั้ง timeout 30 วินาที รอ response จาก parent
        const timeoutId = setTimeout(handleTimeout, 30000);
        setWaitingTimeout(timeoutId);
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
        // เก็บข้อมูl pending action
        setPendingAction({ type: 'burn', amount: amountToBurn });
        
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
        // เปลี่ยนเป็นสถานะรอ update จาก parent
        setStatus('waiting_update');
        
        // ตั้ง timeout 30 วินาที รอ response จาก parent
        const timeoutId = setTimeout(handleTimeout, 30000);
        setWaitingTimeout(timeoutId);
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
      {(status === 'auth' || status === 'verified' || status === 'waiting_update' || status === 'minting' || status === 'burning') && walletAddress && (
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
              className={`px-4 py-2 text-white hover:cursor-pointer rounded ${verificationResult === true && status !== 'waiting_update' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
              onClick={handleMint}
              disabled={verificationResult !== true || status === 'waiting_update'}
            >
              {status === 'minting' ? 'Signing...' : 'Mint'}
            </button>
            <button 
              className={`px-4 py-2 text-white hover:cursor-pointer rounded ${verificationResult === true && status !== 'waiting_update' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-400 cursor-not-allowed'}`}
              onClick={handleBurn}
              disabled={verificationResult !== true || status === 'waiting_update'}
            >
              {status === 'burning' ? 'Signing...' : 'Burn'}
            </button>
          </div>
        </div>
      )}
      {status === 'minting' && (
        <div className="text-blue-600">กำลัง sign mint transaction...</div>
      )}
      {status === 'burning' && (
        <div className="text-red-600">กำลัง sign burn transaction...</div>
      )}
      {status === 'waiting_update' && pendingAction && (
        <div className="text-orange-600">
          รอการยืนยันจาก parent สำหรับ {pendingAction.type} {pendingAction.amount} tokens...
        </div>
      )}
    </div>
  );
}
