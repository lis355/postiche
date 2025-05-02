import { config as dotenv } from "dotenv-flow";

import { createPosticheProxyServer } from "./src/posticheProxyServer.js";

dotenv();

(async () => {
	createPosticheProxyServer(Number(process.env.POSTICHE_PROXY_SERVER_PORT));
})();
