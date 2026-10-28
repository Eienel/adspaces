/** Message a user signs with their Solana wallet to link it to their AdSpaces account. */
export const WALLET_CHALLENGE_TTL_MS = 10 * 60 * 1000;

export function walletLinkMessage(nonce: string, handle: string): string {
  return `AdSpaces wallet link\naccount: @${handle}\nnonce: ${nonce}`;
}
