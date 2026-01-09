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
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [recipients, setRecipients] = useState('');
  const [amounts, setAmounts] = useState('');
  const [tokenAddr, setTokenAddr] = useState('');

  const handleSend = (type: 'ETH' | 'TOKEN') => {
    try {
      // 1. Clean the input: Remove brackets [ ] and split by comma
      const cleanAddrStr = recipients.replace(/[\[\]]/g, '');
      const cleanAmtStr = amounts.replace(/[\[\]]/g, '');

      // 2. Convert to Arrays and remove empty spaces
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
        if (!tokenAddr) {
            alert("Please enter the Token Address.");
            return;
        }
        const units = amts.map(a => parseUnits(a, 18));
        
        writeContract({ 
          address: CONTRACT_ADDRESS, 
          abi: ABI, 
          functionName: 'multisendToken', 
          args: [tokenAddr as `0x${string}`, addrs, units] 
        });
      }
    } catch (error) {
      console.error(error);
      alert("Input Error: Ensure amounts are valid numbers and addresses start with 0x.");
    }
  };

  return (
    <div className="container">
      <ConnectButton />
      {isConnected && (
        <div className="form">
          <input 
            placeholder="Token Address (for tokens only)" 
            value={tokenAddr}
            onChange={e => setTokenAddr(e.target.value)} 
          />
          <textarea 
            placeholder="Recipients (e.g. 0x123..., 0x456...)" 
            value={recipients}
            onChange={e => setRecipients(e.target.value)} 
            rows={5}
          />
          <textarea 
            placeholder="Amounts (e.g. 0.1, 0.5)" 
            value={amounts}
            onChange={e => setAmounts(e.target.value)} 
            rows={5}
          />
          
          <button onClick={() => handleSend('ETH')} disabled={isPending}>
            {isPending ? 'Confirming...' : 'Send ETH'}
          </button>
          
          <button 
            onClick={() => handleSend('TOKEN')} 
            disabled={isPending}
            style={{ marginTop: '10px', backgroundColor: '#0052ff' }}
          >
            {isPending ? 'Confirming...' : 'Send Tokens'}
          </button>
        </div>
      )}
    </div>
  );
}
