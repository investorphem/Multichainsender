import { useState } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const CONTRACT_ADDRESS = '0x883f9868C5D44B16949ffF77fe56c4d9A9C2cfbD';
const ABI = [
  "function multisendETH(address[] recipients, uint256[] values) external payable",
  "function multisendToken(address token, address[] recipients, uint256[] values) external"
] as const;

export default function App() {
  const { isConnected, chain } = useAccount();
  const [recipients, setRecipients] = useState('');
  const [amounts, setAmounts] = useState('');
  const [tokenAddr, setTokenAddr] = useState('');

  // Added onError and onSuccess listeners to capture hidden failures
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
      // 1. Basic Validation
      if (!isConnected) {
        alert("Please connect your wallet first.");
        return;
      }

      if (chain?.id !== 8453) { // Base Mainnet ID
        alert("Please switch your wallet network to Base.");
        return;
      }

      // 2. Clean the input: Remove brackets [ ] and extra quotes
      const cleanAddrStr = recipients.replace(/[\[\]"]/g, '');
      const cleanAmtStr = amounts.replace(/[\[\]"]/g, '');

      // 3. Convert to Arrays and remove empty spaces
      const addrs = cleanAddrStr.split(',').map(a => a.trim()).filter(a => a !== '') as `0x${string}`[];
      const amts = cleanAmtStr.split(',').map(a => a.trim()).filter(a => a !== '');

      if (addrs.length === 0 || amts.length === 0) {
        alert("Please enter recipients and amounts.");
        return;
      }

      if (addrs.length !== amts.length) {
        alert(`Mismatch: You have ${addrs.length} addresses but ${amts.length} amounts.`);
        return;
      }

      // 4. Execute Contract Call
      if (type === 'ETH') {
        const weiValues = amts.map(a => parseEther(a));
        const total = weiValues.reduce((acc, v) => acc + v, 0n);
        
        console.log("Sending ETH Batch...", { addrs, weiValues, total });
        
        writeContract({ 
          address: CONTRACT_ADDRESS, 
          abi: ABI, 
          functionName: 'multisendETH', 
          args: [addrs, weiValues], 
          value: total 
        });
      } else {
        if (!tokenAddr || !tokenAddr.startsWith('0x')) {
            alert("Please enter a valid Token Contract Address.");
            return;
        }
        const units = amts.map(a => parseUnits(a, 18)); // Assumes 18 decimals
        
        console.log("Sending Token Batch...", { tokenAddr, addrs, units });

        writeContract({ 
          address: CONTRACT_ADDRESS, 
          abi: ABI, 
          functionName: 'multisendToken', 
          args: [tokenAddr as `0x${string}`, addrs, units] 
        });
      }
    } catch (error: any) {
      console.error("Format Error:", error);
      alert("Input Format Error: Ensure you are using numbers for amounts and valid 0x addresses.");
    }
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '20px' }}>
        <ConnectButton />
      </div>

      {isConnected && (
        <div className="form">
          <label>Token Address (Only for Token batch)</label>
          <input 
            placeholder="0x..." 
            value={tokenAddr}
            onChange={e => setTokenAddr(e.target.value)} 
          />

          <label>Recipients (Comma separated)</label>
          <textarea 
            placeholder="0x123..., 0x456..." 
            value={recipients}
            onChange={e => setRecipients(e.target.value)} 
            rows={5}
          />

          <label>Amounts (Comma separated)</label>
          <textarea 
            placeholder="0.1, 0.5" 
            value={amounts}
            onChange={e => setAmounts(e.target.value)} 
            rows={5}
          />
          
          <button 
            onClick={() => handleSend('ETH')} 
            disabled={isPending}
            style={{ backgroundColor: '#0052ff', marginBottom: '10px' }}
          >
            {isPending ? 'Confirm in Wallet...' : 'Multisend ETH'}
          </button>
          
          <button 
            onClick={() => handleSend('TOKEN')} 
            disabled={isPending}
            style={{ backgroundColor: '#4CAF50' }}
          >
            {isPending ? 'Confirm in Wallet...' : 'Multisend Tokens'}
          </button>
          
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Note: For tokens, you must "Approve" the contract on Basescan first.
          </p>
        </div>
      )}
    </div>
  );
}
