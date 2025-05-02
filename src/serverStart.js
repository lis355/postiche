import { config as dotenv } from "dotenv-flow";

import { createPosticheProxyServer } from "./postiche/posticheProxyServer.js";
import config from "./postiche/posticheProxyConfig.js";

dotenv();

(async () => {
	createPosticheProxyServer(config.posticheProxyServerPort);
})();
