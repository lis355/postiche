import { config as dotenv } from "dotenv-flow";

import { createPosticheLocalSocksProxyServer } from "./postiche/posticheProxyServer.js";
import config from "./postiche/posticheProxyConfig.js";

dotenv();

(async () => {
	createPosticheLocalSocksProxyServer(config.localSocksServerPort, config.posticheProxyServerHost, config.posticheProxyServerPort);
})();
