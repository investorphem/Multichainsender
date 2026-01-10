import { useState, useEffect } from 'react';
import { useWriteContract, useAccount, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { parseEther, parseUnits, parseAbi, formatEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Send, History, CheckCircle2, XCircle, ArrowRight, Loader2, Coins } from 'lucide-react';

const CONTRACT_ADDRESS = '0x883f9868C5D44B16949ffF77fe56c4d9A9C2cfbD';
const ABI = parseAbi([
  "function multisendETH(address[] recipients, uint256[] values) external payable",
  "function multisendToken(address token, address[] recipients, uint256[] values) external",
  "function approve(address spender, uint256 amount) external returns (bool)"
]);

interface TxHistory {
  hash: string;
  type: 'ETH' | 'TOKEN';
  amount: string;
  recipients: number;
  status: 'Pending' | 'Success' | 'Failed';
  timestamp: number;
}

export default function App() {
  const { isConnected, chain, address } = useAccount();
  const config = useConfig();
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [history, setHistory] = useState<TxHistory[]>([]);
  
  // Form States
  const [recipients, setRecipients] = useState('');
  const [amounts, setAmounts] = useState('');
  const [tokenAddr, setTokenAddr] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { writeContractAsync } = useWriteContract();

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`tx_history_${address}`);
    if (saved) setHistory(JSON.parse(saved));
  }, [address]);

  const addHistory = (tx: TxHistory) => {
    const newHistory = [tx, ...history].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem(`tx_history_${address}`, JSON.stringify(newHistory));
  };

  const handleSend = async (type: 'ETH' | 'TOKEN') => {
    if (!isConnected || chain?.id !== 8453) return alert("Connect to Base Mainnet");
    
    try {
      setIsProcessing(true);
      const addrs = recipients.replace(/[\[\]"]/g, '').split(',').map(a => a.trim() as `0x${string}`).filter(a => a);
      const amts = amounts.replace(/[\[\]"]/g, '').split(',').map(a => a.trim()).filter(a => a);
      const units = amts.map(a => type === 'ETH' ? parseEther(a) : parseUnits(a, 18));
      const total = units.reduce((acc, v) => acc + v, 0n);

      let txHash;
      if (type === 'ETH') {
        txHash = await writeContractAsync({ 
          address: CONTRACT_ADDRESS, abi: ABI, functionName: 'multisendETH', 
          args: [addrs, units], value: total 
        });
      } else {
        const approveHash = await writeContractAsync({
          address: tokenAddr as `0x${string}`, abi: ABI, functionName: 'approve', args: [CONTRACT_ADDRESS, total]
        });
        await waitForTransactionReceipt(config, { hash: approveHash });
        txHash = await writeContractAsync({ 
          address: CONTRACT_ADDRESS, abi: ABI, functionName: 'multisendToken', args: [tokenAddr as `0x${string}`, addrs, units] 
        });
      }

      addHistory({
        hash: txHash, type, amount: amts.join(', '), recipients: addrs.length,
        status: 'Success', timestamp: Date.now()
      });
      alert("Transaction Successful!");
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Base MultiSender Pro
            </h1>
            <p className="text-slate-500 text-sm">Enterprise-grade batch transfers</p>
          </div>
          <ConnectButton />
        </header>

        {/* Professional Navigation Tabs */}
        <div className="flex p-1 bg-slate-200/50 rounded-xl mb-6 w-full max-w-[400px]">
          <button 
            onClick={() => setActiveTab('send')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'send' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:bg-white/50'}`}
          >
            <Send size={16} /> Send Assets
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:bg-white/50'}`}
          >
            <History size={16} /> History
          </button>
        </div>

        {activeTab === 'send' ? (
          <div className="grid gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Token Contract Address</label>
                  <div className="relative">
                    <input 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      placeholder="0x... (Optional: Only for Tokens)" 
                      value={tokenAddr} onChange={e => setTokenAddr(e.target.value)} 
                    />
                    <Coins className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Recipients (CSV)</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl h-40 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                      placeholder="0x123..., 0x456..." 
                      value={recipients} onChange={e => setRecipients(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Amounts (CSV)</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl h-40 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                      placeholder="0.1, 0.05" 
                      value={amounts} onChange={e => setAmounts(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-4">
                  <button 
                    disabled={isProcessing}
                    onClick={() => handleSend('ETH')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={20} />} Batch Send ETH
                  </button>
                  <button 
                    disabled={isProcessing}
                    onClick={() => handleSend('TOKEN')}
                    className="flex-1 bg-white border-2 border-slate-200 hover:border-blue-600 text-slate-700 hover:text-blue-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Coins size={20} />} Batch Send Tokens
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Transaction</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Recipients</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map((tx) => (
                  <tr key={tx.hash} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tx.type === 'ETH' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                          {tx.type === 'ETH' ? <Send size={14} /> : <Coins size={14} />}
                        </div>
                        <span className="text-sm font-medium text-slate-700">Batch {tx.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{tx.recipients} addresses</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full w-fit">
                        <CheckCircle2 size={12} /> Confirmed
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && (
              <div className="p-20 text-center text-slate-400 italic">No recent transactions found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
