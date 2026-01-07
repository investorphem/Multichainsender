import { useState } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const CONTRACT_ADDRESS = '0xYourDeployedContractAddress';
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
    const addrs = recipients.split(',').map(a => a.trim() as `0x${string}`);
    const amts = amounts.split(',').map(a => a.trim());
    
    if (type === 'ETH') {
      const weiValues = amts.map(a => parseEther(a));
      const total = weiValues.reduce((acc, v) => acc + v, 0n);
      writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'multisendETH', args: [addrs, weiValues], value: total });
    } else {
      const units = amts.map(a => parseUnits(a, 18));
      writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'multisendToken', args: [tokenAddr as `0x${string}`, addrs, units] });
    }
  };

  return (
    <div className="container">
      <ConnectButton />
      {isConnected && (
        <div className="form">
          <input placeholder="Token Address (for tokens only)" onChange={e => setTokenAddr(e.target.value)} />
          <textarea placeholder="Recipients (comma separated)" onChange={e => setRecipients(e.target.value)} />
          <textarea placeholder="Amounts (comma separated)" onChange={e => setAmounts(e.target.value)} />
          <button onClick={() => handleSend('ETH')} disabled={isPending}>Send ETH</button>
          <button onClick={() => handleSend('TOKEN')} disabled={isPending}>Send Tokens</button>
        </div>
      )}
    </div>
  );
}
