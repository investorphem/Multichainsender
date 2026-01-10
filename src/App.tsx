import { useState } from 'react';
import { useWriteContract, useAccount, useReadContract } from 'wagmi';
import { parseEther, parseUnits, parseAbi } from 'viem'; 
import { ConnectButton } from '@rainbow-me/rainbowkit';

const CONTRACT_ADDRESS = '0x883f9868C5D44B16949ffF77fe56c4d9A9C2cfbD';

// Added approve and allowance to the ABI
const ABI = parseAbi([
  "function multisendETH(address[] recipients, uint256[] values) external payable",
  "function multisendToken(address token, address[] recipients, uint256[] values) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
]);

export default function App() {
  const { isConnected, chain, address: userAddress } = useAccount();
  const [recipients, setRecipients] = useState('');
  const [amounts, setAmounts] = useState('');
  const [tokenAddr, setTokenAddr] = useState('');

  // Hook to check if we have already approved the contract
  const { data: allowance } = useReadContract({
    address: tokenAddr as `0x${string}`,
    abi: ABI,
    functionName: 'allowance',
    args: [userAddress!, CONTRACT_ADDRESS],
    query: { enabled: !!tokenAddr && !!userAddress }
  });

  const { writeContract, isPending } = useWriteContract({
    mutation: {
      onError: (error: any) => {
        console.error("Contract Write Error:", error);
        alert(`Transaction Failed: ${error.shortMessage || error.message || "Unknown Error"}`);
      },
      onSuccess: (hash) => {
        alert(`Transaction Sent! Hash: ${hash}`);
      }
    }
  });

  const handleSend = (type: 'ETH' | 'TOKEN') => {
    try {
      if (!isConnected) return alert("Please connect your wallet first.");
      if (chain?.id !== 8453) return alert("Please switch to Base network.");

      const cleanAddrStr = recipients.replace(/[\[\]"]/g, '');
      const cleanAmtStr = amounts.replace(/[\[\]"]/g, '');
      const addrs = cleanAddrStr.split(',').map(a => a.trim()).filter(a => a !== '') as `0x${string}`[];
      const amts = cleanAmtStr.split(',').map(a => a.trim()).filter(a => a !== '');

      if (addrs.length === 0 || addrs.length !== amts.length) {
        return alert("Mismatch between addresses and amounts.");
      }

      if (type === 'ETH') {
        const weiValues = amts.map(a => parseEther(a));
        const total = weiValues.reduce((acc, v) => acc + v, 0n);
        writeContract({ 
          address: CONTRACT_ADDRESS, 
          abi: ABI, 
          functionName: 'multisendETH', 
          args: [addrs, weiValues], 
          value: total 
        });
      } else {
        if (!tokenAddr.startsWith('0x')) return alert("Invalid Token Address.");
        
        const units = amts.map(a => parseUnits(a, 18)); // Change 18 to 6 for USDC/USDT
        const totalNeeded = units.reduce((acc, v) => acc + v, 0n);

        // STEP 1: Check if we need to APPROVE first
        if (!allowance || (allowance as bigint) < totalNeeded) {
          alert("Step 1: Approving tokens. Please confirm in wallet.");
          writeContract({
            address: tokenAddr as `0x${string}`,
            abi: ABI,
            functionName: 'approve',
            args: [CONTRACT_ADDRESS, totalNeeded]
          });
        } else {
          // STEP 2: MULTISEND (Only runs if allowance is already enough)
          console.log("Sending Token Batch...", { tokenAddr, addrs, units });
          writeContract({ 
            address: CONTRACT_ADDRESS, 
            abi: ABI, 
            functionName: 'multisendToken', 
            args: [tokenAddr as `0x${string}`, addrs, units] 
          });
        }
      }
    } catch (error) {
      alert("Input Format Error: Check your commas and values.");
    }
  };

  return (
    <div className="container" style={{ padding: '20px' }}>
      <ConnectButton />
      {isConnected && (
        <div className="form" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label>Token Address (Leave blank for ETH)</label>
          <input placeholder="0x..." value={tokenAddr} onChange={e => setTokenAddr(e.target.value)} />

          <label>Recipients (Comma separated)</label>
          <textarea placeholder="0x1..., 0x2..." value={recipients} onChange={e => setRecipients(e.target.value)} rows={5} />

          <label>Amounts (Comma separated)</label>
          <textarea placeholder="0.1, 0.5" value={amounts} onChange={e => setAmounts(e.target.value)} rows={5} />
          
          <button 
            onClick={() => handleSend('ETH')} 
            disabled={isPending}
            style={{ backgroundColor: '#0052ff', color: 'white', padding: '10px', borderRadius: '8px', border: 'none' }}
          >
            {isPending ? 'Processing...' : 'Multisend ETH'}
          </button>
          
          <button 
            onClick={() => handleSend('TOKEN')} 
            disabled={isPending}
            style={{ backgroundColor: '#4CAF50', color: 'white', padding: '10px', borderRadius: '8px', border: 'none' }}
          >
            {isPending ? 'Processing...' : 'Multisend Tokens'}
          </button>

          <p style={{ fontSize: '12px', color: '#666' }}>
            Note: For tokens, the first click will trigger an **Approve** transaction. After it confirms, click again to **Multisend**.
          </p>
        </div>
      )}
    </div>
  );
}
