"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { SessionProvider } from "next-auth/react";
import "@solana/wallet-adapter-react-ui/styles.css";

/** Wallets are auto-detected via the Wallet Standard (Phantom, Solflare, Backpack, ...). */
export function Providers({ rpcUrl, children }: { rpcUrl: string; children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConnectionProvider endpoint={rpcUrl}>
        <WalletProvider wallets={[]} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </SessionProvider>
  );
}
