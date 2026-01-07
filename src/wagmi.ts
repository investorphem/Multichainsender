import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

export const config = getDefaultConfig({
  appName: 'Base MultiSender',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from cloud.reown.com
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});
