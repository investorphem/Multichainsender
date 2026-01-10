import { useState } from 'react';
import { useWriteContract, useAccount, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core'; // Utility to wait for block confirmation
import { parseEther, parseUnits, parseAbi } from 'viem'; 
import { ConnectButton } from '@rainbow-me/rainbowkit';

const CONTRACT_ADDRESS = '0x883f9868C5D44B16949ffF77fe56c4d9A9C2cfbD';

const ABI = parseAbi([
  "function multisendETH(address[] recipients, uint256[] values) external payable",
  "function multisendToken(address token, address[] recipients, uint256[] values) external",
  "function approve(address spender, uint256 amount) external returns (bool)"
]);

export default function App() {
  const { isConnected, chain } = useAccount();
  const config = useConfig(); // Required for waitForTransactionReceipt
  const [recipients, setRecipients] = useState('');
  const [amounts, setAmounts] = useState('');
  const [tokenAddr, setTokenAddr] = useState('');

  // Use writeContractAsync to allow "awaiting" the transaction hash
  const { writeContractAsync, isPending } = useWriteContract();

  const handleSend = async (type: 'ETH' | 'TOKEN') => {
    try {
      if (!isConnected) return alert("Please connect your wallet.");
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
        
        await writeContractAsync({ 
          address: CONTRACT_ADDRESS, 
          abi: ABI, 
          functionName: 'multisendETH', 
          args: [addrs, weiValues], 
          value: total 
        });
        alert("ETH Multisend Successful!");

      } else {
        if (!tokenAddr.startsWith('0x')) return alert("Invalid Token Address.");
        const units = amts.map(a => parseUnits(a, 18)); 
        const totalNeeded = units.reduce((acc, v) => acc + v, 0n);

        // STEP 1: TRIGGER APPROVAL
        console.log("Step 1: Requesting Approval...");
        const approvalHash = await writeContractAsync({
          address: tokenAddr as `0x${string}`,
          abi: ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, totalNeeded]
        });

        // STEP 2: WAIT FOR CONFIRMATION (Automated)
        alert("Approval sent! Please wait for network confirmation (don't refresh)...");
        await waitForTransactionReceipt(config, { hash: approvalHash });

        // STEP 3: TRIGGER MULTISEND IMMEDIATELY
        console.log("Step 2: Approval confirmed. Triggering Multisend...");
        await writeContractAsync({ 
          address: CONTRACT_ADDRESS, 
          abi: ABI, 
          functionName: 'multisendToken', 
          args: [tokenAddr as `0x${string}`, addrs, units] 
        });
        
        alert("Token Multisend Successful!");
      }
    } catch (error: any) {
      console.error("Transaction Error:", error);
      alert(error.shortMessage || "Transaction failed or cancelled.");
    }
  };

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '500px', margin: 'auto' }}>
      <ConnectButton />
      {isConnected && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label>Token Address (ERC20)</label>
            <input style={{ width: '100%', padding: '8px' }} value={tokenAddr} onChange={e => setTokenAddr(e.target.value)} />
          </div>

          <div>
            <label>Recipients</label>
            <textarea style={{ width: '100%' }} value={recipients} onChange={e => setRecipients(e.target.value)} rows={3} />
          </div>

          <div>
            <label>Amounts</label>
            <textarea style={{ width: '100%' }} value={amounts} onChange={e => setAmounts(e.target.value)} rows={3} />
          </div>
          
          <button 
            onClick={() => handleSend('ETH')} 
            disabled={isPending}
            style={{ backgroundColor: '#0052ff', color: 'white', padding: '12px', border: 'none', cursor: 'pointer' }}
          >
            {isPending ? 'Processing ETH...' : 'Send ETH'}
          </button>
          
          <button 
            onClick={() => handleSend('TOKEN')} 
            disabled={isPending}
            style={{ backgroundColor: '#4CAF50', color: 'white', padding: '12px', border: 'none', cursor: 'pointer' }}
          >
            {isPending ? 'Waiting for Confirmation...' : 'Send Tokens (Approve + Transfer)'}
          </button>
        </div>
      )}
    </div>
  );
}
