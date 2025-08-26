import { createThirdwebClient } from 'thirdweb';
import { defineChain } from "thirdweb/chains";

const clientId = import.meta.env.PUBLIC_ENV__CLIENT_ID || "b02c7374f425432c0e2f29f994bf72d9";
const chainId = import.meta.env.PUBLIC_ENV__CHAIN_ID || "1329";

export const client = createThirdwebClient({
  clientId: clientId,
});

export const chain = defineChain(Number(chainId));
