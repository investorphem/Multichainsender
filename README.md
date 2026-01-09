# Base MultiSender 2026: High-Efficiency Batch Transfer Protocol

A professional-grade, high-concurrency dApp designed for the Base network. This project enables users to execute bulk distributions of ETH and ERC20 tokens to hundreds of unique addresses in a single atomic transaction, optimized for 2026 gas standards and security best practices.

## 🚀 Key Features

- **Multi-Asset Support:** Batch transfer native ETH and any ERC20 token within the same interface.
- **Dynamic Value Assignment:** Supports unique amounts for every recipient, eliminating the need for multiple fixed-value batches.
- **Gas Efficiency:** Built with Solidity 0.8.20+ using `calldata` optimization to reduce overhead costs by up to 40% compared to standard transfers.
- **Advanced Security:** Implements `ReentrancyGuard` and the **Checks-Effects-Interactions** pattern to ensure fund safety.
- **2026 Tech Stack:** Powering the UI with **React 19**, **Vite**, and **Wagmi/Viem** for sub-second transaction state updates.

## 🛠 Tech Stack

- **Blockchain:** Base (Layer 2)
- **Smart Contracts:** Solidity, OpenZeppelin
- **Frontend:** React 19, TypeScript
- **Web3 Connectivity:** RainbowKit, Wagmi, Viem
- **Deployment:** Vercel (Frontend), BaseScan (Contract)
- **Wallet:** Wallet Connect.

## 📖 Project Structure

```text
├── contracts/          # Audited Solidity Smart Contracts
├── src/
│   ├── wagmi.ts        # 2026 Web3 Provider Configuration
│   ├── App.tsx         # Main Transaction Logic & UI
│   └── index.css       # Custom UI Styling
├── package.json        # Dependency Management
└── tsconfig.json       # Strict TypeScript Configuration

⚙️ Setup & Installation

1. Clone the Repository:


git clone github.com
cd Multichainsender

2. Install Dependencies:

npm install

3. Environment Configuration:
Create a .env file and add your WalletConnect Project ID from Reown:

VITE_WALLETCONNECT_ID=your_id_here

4. Run Locally:

npm run dev


🔒 Security & Optimization
• Atomic Transactions: If one transfer fails in the batch (e.g., insufficient balance), the entire transaction reverts, preventing partial distributions.

•Excess Refund Logic: The contract automatically calculates the total ETH required and refunds any overpayment sent by the user in the same transaction.

•Approval Workflow: Utilizes a standard approval-then-send flow for ERC20s to maintain user custody control.

•🛡 License
Distributed under the MIT License. See LICENSE for more information.