import { useState, useEffect } from 'react';
import { useWriteContract, useAccount, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { parseEther, parseUnits, parseAbi } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { LayoutDashboard, Send, History, Coins, Loader2, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

const CONTRACT_ADDRESS = '0x883f9868C5D44B16949ffF77fe56c4d9A9C2cfbD';
const ABI = parseAbi([
  "function multisendETH(address[] recipients, uint256[] values) external payable",
  "function multisendToken(address token, address[] recipients, uint256[] values) external",
  "function approve(address spender, uint256 amount) external returns (bool)"
]);

export default function App() {
  const { isConnected, chain, address } = useAccount();
  const config = useConfig();
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Form States
  const [recipients, setRecipients] = useState('');
  const [amounts, setAmounts] = useState('');
  const [tokenAddr, setTokenAddr] = useState('');

  const { writeContractAsync } = useWriteContract();

  // Load history from local storage
  useEffect(() => {
    const saved = localStorage.getItem(`tx_history_${address}`);
    if (saved) setHistory(JSON.parse(saved));
  }, [address]);

  const handleSend = async (type: 'ETH' | 'TOKEN') => {
    if (!isConnected || chain?.id !== 8453) return alert("Please connect to Base Network");
    
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

      // Record successful transaction
      const newTx = { hash: txHash, type, time: Date.now(), count: addrs.length };
      const updatedHistory = [newTx, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem(`tx_history_${address}`, JSON.stringify(updatedHistory));

    } catch (e: any) {
      console.error(e);
      alert(e.shortMessage || "Transaction Failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar - Professional Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 hidden md:flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Coins size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight">BaseSend</span>
        </div>
        
        <nav className="space-y-1">
          <button 
            onClick={() => setActiveTab('send')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'send' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Send size={18} /> Batch Transfer
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <History size={18} /> Transaction History
          </button>
        </nav>
      </aside>

      {/* Main Dashboard Area */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            {activeTab === 'send' ? 'New Transfer' : 'Your History'}
          </h2>
          <ConnectButton />
        </header>

        {activeTab === 'send' ? (
          <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <section className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Token Contract (Optional)</label>
                    <input 
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="0x... Leave blank for ETH" 
                      value={tokenAddr} onChange={e => setTokenAddr(e.target.value)} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Recipients</label>
                      <textarea 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none h-48 text-sm"
                        placeholder="0x123..., 0x456..." 
                        value={recipients} onChange={e => setRecipients(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Amounts</label>
                      <textarea 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none h-48 text-sm"
                        placeholder="0.1, 0.05" 
                        value={amounts} onChange={e => setAmounts(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => handleSend('ETH')}
                  disabled={isProcessing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={18} />} Send Native ETH
                </button>
                <button 
                  onClick={() => handleSend('TOKEN')}
                  disabled={isProcessing}
                  className="flex-1 bg-white border border-slate-200 hover:border-blue-600 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <Coins size={18} />} Send ERC-20 Tokens
                </button>
              </div>
            </section>

            {/* Sidebar Stats - 2026 Progressive Disclosure */}
            <aside className="space-y-6">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-3xl text-white shadow-lg shadow-blue-200">
                <h3 className="flex items-center gap-2 font-bold mb-4 opacity-90"><ShieldCheck size={18} /> Network Status</h3>
                <div className="space-y-3 text-sm opacity-80">
                  <div className="flex justify-between"><span>Chain</span><span className="font-mono">Base Mainnet</span></div>
                  <div className="flex justify-between"><span>Status</span><span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Operational</span></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Transfer Guide</h3>
                <ul className="space-y-4 text-xs text-slate-500 leading-relaxed">
                  <li className="flex gap-3"><ArrowRight size={14} className="text-blue-500 shrink-0" /> Comma-separate all addresses and amounts.</li>
                  <li className="flex gap-3"><ArrowRight size={14} className="text-blue-500 shrink-0" /> Ensure you have enough ETH for gas fees.</li>
                  <li className="flex gap-3"><ArrowRight size={14} className="text-blue-500 shrink-0" /> Token transfers require an Approval step first.</li>
                </ul>
              </div>
            </aside>
          </div>
        ) : (
          /* History Table Section */
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-5">Transaction Hash</th>
                  <th className="px-8 py-5">Type</th>
                  <th className="px-8 py-5">Recipients</th>
                  <th className="px-8 py-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((tx) => (
                  <tr key={tx.hash} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5 font-mono text-xs text-blue-600 truncate max-w-[200px]">{tx.hash}</td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-600">{tx.type}</td>
                    <td className="px-8 py-5 text-sm text-slate-500">{tx.count} addresses</td>
                    <td className="px-8 py-5"><span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full w-fit"><CheckCircle2 size={12} /> Confirmed</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && <div className="p-20 text-center text-slate-400 italic">No recent transactions.</div>}
          </div>
        )}
      </main>
    </div>
  );
}
