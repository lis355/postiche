import { config as dotenv } from "dotenv-flow";

import { testHttpsGetRequest } from "./src/testHttpsRequest.js";
import { createPosticheLocalSocksProxyServer, createPosticheProxyServer } from "./src/posticheProxyServer.js";

dotenv();

(async () => {
	const server = createPosticheProxyServer(Number(process.env.POSTICHE_PROXY_SERVER_PORT));
	const posticheServer = createPosticheLocalSocksProxyServer(1090, process.env.POSTICHE_PROXY_SERVER_HOST, Number(process.env.POSTICHE_PROXY_SERVER_PORT));

	// await testHttpsGetRequest(1090, "https://telegram.org/");
	await testHttpsGetRequest(1090, "https://echo.free.beeceptor.com"); // for test ip

	posticheServer.close();
	server.close();
})();
