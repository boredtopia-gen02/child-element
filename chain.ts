import { defineChain } from "thirdweb/chains";

// Sei Mainnet 1329
// Sei Testnet 1328
export const chain = defineChain(Number(import.meta.env.PUBLIC_ENV__CHAIN_ID));