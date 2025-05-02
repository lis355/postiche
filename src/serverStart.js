import { config as dotenv } from "dotenv-flow";

import { createPosticheProxyServer } from "./postiche/posticheProxy.js";
import config from "./postiche/posticheProxyConfig.js";

dotenv();

(async () => {
	const posticheServer = createPosticheProxyServer(config.posticheProxyServerPort);
	await new Promise(resolve => posticheServer.once("listening", resolve));
})();
