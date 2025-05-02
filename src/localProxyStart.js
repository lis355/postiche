import { config as dotenv } from "dotenv-flow";

import { createPosticheLocalSocksProxyServer } from "./postiche/posticheProxyClient.js";

dotenv();

(async () => {
	createPosticheLocalSocksProxyServer(Number(process.env.LOCAL_SOCK_PROXY_SERVER_PORT), process.env.POSTICHE_PROXY_SERVER_HOST, Number(process.env.POSTICHE_PROXY_SERVER_PORT));
})();
