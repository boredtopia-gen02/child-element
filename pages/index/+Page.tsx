
import { useEffect, useState } from "react";
import { useGameBridgeComm } from "../../hook/useGameBridgeComm";

export default function Page() {
  const { sendMessage, addMessageListener } = useGameBridgeComm();
  const [status, setStatus] = useState<'waiting' | 'auth' | 'minting' | 'burning'>('waiting');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    // ส่ง ready ไปยัง parent iframe
    sendMessage({ type: "ready", payload: { gameName: "crosswalk" } });
    setStatus('waiting');

    // รอฟัง auth
    const removeListener = addMessageListener((message) => {
      if (message.type === "auth" && message.payload?.walletAddress) {
        setWalletAddress(message.payload.walletAddress);
        setStatus('auth');
      }
    });
    return removeListener;
  }, [sendMessage, addMessageListener]);

  const handleMint = () => {
    setStatus('minting');
    // TODO: ส่ง mint message ไป parent
    sendMessage({ type: 'mint', payload: { walletAddress } });
    setTimeout(() => setStatus('auth'), 1000); // mock mint เสร็จ
  };

  const handleBurn = () => {
    setStatus('burning');
    // TODO: ส่ง burn message ไป parent
    sendMessage({ type: 'burn', payload: { walletAddress } });
    setTimeout(() => setStatus('auth'), 1000); // mock burn เสร็จ
  };

  return (
    <div style={{ padding: 32 }}>
      <h1 className="font-bold text-3xl pb-4">Child index page</h1>
      {status === 'waiting' && (
        <div className="text-lg text-yellow-600">รอรับ auth จาก parent...</div>
      )}
      {status === 'auth' && walletAddress && (
        <div>
          <div className="text-green-700 pb-2">Wallet Address: <span className="font-mono">{walletAddress}</span></div>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={handleMint}>Mint</button>
            <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={handleBurn}>Burn</button>
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
