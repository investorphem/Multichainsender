import { http } from 'wagmi';
import { base } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

export const config = getDefaultConfig({
  appName: 'Base MultiSender',
  projectId: 'ca132d38f537cfc97cb1098e0c41d78a',
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});
