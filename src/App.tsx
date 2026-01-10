import { useState, useEffect, useMemo } from 'react';
import { useWriteContract, useAccount, useConfig, useBalance } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { parseEther, parseUnits, parseAbi, formatUnits } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Search, Coins, Send, History, Loader2, CheckCircle2, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

const CONTRACT_ADDRESS = '0x883f9868C5D44B16949ffF77fe56c4d9A9C2cfbD';
const MORALIS_API_KEY = "YOUR_MORALIS_API_KEY"; // Get yours at moralis.io

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

  // Token Search & Balance States
  const [searchTerm, setSearchTerm] = useState('');
  const [userTokens, setUserTokens] = useState<any[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Form States
  const [recipients, setRecipients] = useState('');
  const [amounts, setAmounts] = useState('');
  const [selectedToken, setSelectedToken] = useState<any>(null); // Current token for multisend

  // Automatically load native ETH balance
  const { data: ethBalance } = useBalance({ address });
  const { writeContractAsync } = useWriteContract();

  // Load user's ERC-20 token list automatically
  useEffect(() => {
    if (isConnected && address) {
      const fetchTokens = async () => {
        setIsLoadingTokens(true);
        try {
          const response = await fetch(`deep-index.moralis.io{address}/erc20?chain=base`, {
            headers: { 'X-API-Key': MORALIS_API_KEY }
          });
          const data = await response.json();
          setUserTokens(data || []);
        } catch (e) {
          console.error("Failed to load tokens", e);
        } finally {
          setIsLoadingTokens(false);
        }
      };
      fetchTokens();
    }
  }, [isConnected, address]);

  // Search Logic: Filter tokens by Name, Symbol, or Address
  const filteredTokens = useMemo(() => {
    return userTokens.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.token_address.toLowerCase() === searchTerm.toLowerCase()
    );
  }, [searchTerm, userTokens]);

  const handleSend = async (isETH: boolean) => {
    if (!isConnected || chain?.id !== 8453) return alert("Connect to Base Mainnet");
    
    try {
      setIsProcessing(true);
      const addrs = recipients.split(',').map(a => a.trim() as `0x${string}`).filter(a => a);
      const amts = amounts.split(',').map(a => a.trim()).filter(a => a);
      const units = amts.map(a => isETH ? parseEther(a) : parseUnits(a, selectedToken?.decimals || 18));
      const total = units.reduce((acc, v) => acc + v, 0n);

      let txHash;
      if (isETH) {
        txHash = await writeContractAsync({ 
          address: CONTRACT_ADDRESS, abi: ABI, functionName: 'multisendETH', 
          args: [addrs, units], value: total 
        });
      } else {
        if (!selectedToken) return alert("Select a token first");
        const approveHash = await writeContractAsync({
          address: selectedToken.token_address, abi: ABI, functionName: 'approve', args: [CONTRACT_ADDRESS, total]
        });
        await waitForTransactionReceipt(config, { hash: approveHash });
        txHash = await writeContractAsync({ 
          address: CONTRACT_ADDRESS, abi: ABI, functionName: 'multisendToken', args: [selectedToken.token_address, addrs, units] 
        });
      }
      alert("Transfer Complete!");
    } catch (e: any) {
      alert(e.shortMessage || "Transaction Error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex font-sans text-slate-900">
      {/* Sidebar Nav */}
      <aside className="w-72 bg-white border-r border-slate-100 p-8 hidden lg:flex flex-col">
        <div className="flex items-center gap-3 mb-12">
          <div className="p-2 bg-blue-600 rounded-xl text-white"><ShieldCheck size={24} /></div>
          <h1 className="text-xl font-black uppercase tracking-tighter">BaseBatch</h1>
        </div>
        <nav className="space-y-2">
          <button onClick={() => setActiveTab('send')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'send' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Send size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'history' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
            <History size={20} /> Activity
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-black">{activeTab === 'send' ? 'Transfer Assets' : 'Activity Log'}</h2>
            <p className="text-slate-400 text-sm mt-1">Manage batch transfers on Base Mainnet</p>
          </div>
          <ConnectButton />
        </header>

        {activeTab === 'send' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            {/* Left Column: Form */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <div className="space-y-6">
                  {/* Token Search Explorer */}
                  <div>
                    <label className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-3 block">1. Select Asset</label>
                    <div className="relative group">
                      <Search className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                      <input 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                        placeholder="Search by name, symbol, or 0x address..." 
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <div className="absolute top-full left-0 w-full bg-white mt-2 rounded-2xl shadow-xl border border-slate-100 z-50 max-h-60 overflow-y-auto p-2 space-y-1">
                          {filteredTokens.map(token => (
                            <div key={token.token_address} onClick={() => { setSelectedToken(token); setSearchTerm(''); }} className="flex justify-between items-center p-3 hover:bg-blue-50 rounded-xl cursor-pointer group">
                              <div className="flex items-center gap-3">
                                {token.logo ? <img src={token.logo} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-[10px]">{token.symbol}</div>}
                                <div>
                                  <p className="font-bold text-sm">{token.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{token.token_address.slice(0,6)}...{token.token_address.slice(-4)}</p>
                                </div>
                              </div>
                              <p className="text-sm font-black">{parseFloat(formatUnits(token.balance, token.decimals)).toFixed(4)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manual Input Area */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-3 block">2. Recipients (CSV)</label>
                      <textarea className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none h-48 text-sm font-mono focus:ring-2 focus:ring-blue-100" placeholder="0x..., 0x..." value={recipients} onChange={e => setRecipients(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-3 block">3. Amounts (CSV)</label>
                      <textarea className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none h-48 text-sm font-mono focus:ring-2 focus:ring-blue-100" placeholder="0.5, 1.2" value={amounts} onChange={e => setAmounts(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button onClick={() => handleSend(true)} disabled={isProcessing} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[24px] shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                  {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={20} />} SEND ETH
                </button>
                <button onClick={() => handleSend(false)} disabled={isProcessing || !selectedToken} className="flex-1 bg-white border-2 border-slate-100 hover:border-blue-600 text-slate-700 font-black py-5 rounded-[24px] transition-all flex items-center justify-center gap-3 disabled:opacity-30">
                  {isProcessing ? <Loader2 className="animate-spin" /> : <Coins size={20} />} SEND {selectedToken?.symbol || 'TOKEN'}
                </button>
              </div>
            </div>

            {/* Right Column: Wallet Info */}
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Active Portfolio</h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-3xl font-black tracking-tighter">{ethBalance?.formatted.slice(0,6)} <span className="text-blue-500">ETH</span></p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Available for gas</p>
                    </div>
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><ExternalLink size={16} /></div>
                  </div>
                  <div className="h-[1px] bg-white/5 w-full" />
                  {selectedToken && (
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-bottom-4">
                      <div>
                        <p className="text-xs font-bold opacity-50">Selected Asset</p>
                        <p className="font-black text-lg">{selectedToken.symbol}</p>
                      </div>
                      <p className="font-mono text-blue-400">{(selectedToken.balance / 10**selectedToken.decimals).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
