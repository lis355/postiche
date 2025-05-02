import { config as dotenv } from "dotenv-flow";

import { testLocalProxyServers } from "./testLocalProxyServers.js";

dotenv();

(async () => {
	await testLocalProxyServers(process.env.REMOTE_POSTICHE_PROXY_SERVER_HOST, Number(process.env.REMOTE_POSTICHE_PROXY_SERVER_PORT));
})();
