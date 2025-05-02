import { buffer } from "node:stream/consumers";
import https from "node:https";

import { config as dotenv } from "dotenv-flow";
import { SocksProxyAgent } from "socks-proxy-agent";

import { createPosticheLocalSocksProxyServer, createPosticheProxyServer } from "../postiche/posticheProxyServer.js";

dotenv();

async function testHttpsGetRequest(localServerPort, url) {
	return new Promise((resolve, reject) => {
		https.get(
			url,
			{
				agent: new SocksProxyAgent(`socks://localhost:${localServerPort}`)
			},
			async response => {
				const responseBuffer = await buffer(response);

				console.log("GET", url, response.statusCode, response.statusMessage);

				return resolve(responseBuffer);
			}
		);
	});
}

(async () => {
	const localSocksProxyServer = createPosticheLocalSocksProxyServer(Number(process.env.LOCAL_SOCK_PROXY_SERVER_PORT), process.env.REMOTE_POSTICHE_PROXY_SERVER_HOST, Number(process.env.REMOTE_POSTICHE_PROXY_SERVER_PORT));

	// for test ip
	const responseBuffer = await testHttpsGetRequest(Number(process.env.LOCAL_SOCK_PROXY_SERVER_PORT), "https://echo.free.beeceptor.com");
	console.log("IP", JSON.parse(responseBuffer).ip);

	localSocksProxyServer.close();
})();
