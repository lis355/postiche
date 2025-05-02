import { config as dotenv } from "dotenv-flow";

import { createPosticheProxyServer } from "../postiche/posticheProxy.js";
import { testLocalProxyServers } from "./testLocalProxyServers.js";

dotenv();

(async () => {
	const posticheServer = createPosticheProxyServer(Number(process.env.LOCAL_POSTICHE_PROXY_SERVER_PORT));
	await new Promise(resolve => posticheServer.once("listening", resolve));

	await testLocalProxyServers("localhost", Number(process.env.LOCAL_POSTICHE_PROXY_SERVER_PORT));

	posticheServer.close();
	await new Promise(resolve => posticheServer.once("close", resolve));
})();
