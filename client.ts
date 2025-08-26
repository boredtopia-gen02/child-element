import {createThirdwebClient} from 'thirdweb';

const clientId = import.meta.env.PUBLIC_ENV__CLIENT_ID;

export const client = createThirdwebClient({
  clientId: clientId,
});