import { config as dotenv } from "dotenv-flow";
import { HttpProxyAgent } from "http-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

import {
	createPosticheProxyServer,
	createPosticheLocalSocksProxyServer,
	createPosticheLocalHttpProxyServer
} from "../postiche/posticheProxy.js";
import { httpsGetRequest } from "../utils.js";

dotenv();

(async () => {
	const posticheServer = createPosticheProxyServer(Number(process.env.LOCAL_POSTICHE_PROXY_SERVER_PORT));
	await new Promise(resolve => posticheServer.once("listening", resolve));

	const url = "https://echo.free.beeceptor.com";

	const localProxyServerPort = Number(process.env.LOCAL_PROXY_SERVER_PORT);

	for (const localProxyServerProtocol of ["socks"/*, "http"*/]) {
		const localProxyServerUrl = `${localProxyServerProtocol}://localhost:${localProxyServerPort}`;
		let localProxyServer;
		let proxyAgent;
		if (localProxyServerProtocol === "socks") {
			localProxyServer = createPosticheLocalSocksProxyServer(localProxyServerPort, "localhost", Number(process.env.LOCAL_POSTICHE_PROXY_SERVER_PORT));
			proxyAgent = new SocksProxyAgent(localProxyServerUrl);
		} else if (localProxyServerProtocol === "http") {
			localProxyServer = createPosticheLocalHttpProxyServer(localProxyServerPort, "localhost", Number(process.env.LOCAL_POSTICHE_PROXY_SERVER_PORT));
			proxyAgent = new HttpProxyAgent(localProxyServerUrl);
		} else throw new Error(`Bad local proxy server protocol ${localProxyServerProtocol}`);

		await new Promise(resolve => localProxyServer.once("listening", resolve));

		console.log("test", localProxyServerProtocol, proxyAgent.constructor.name, localProxyServerUrl, url);
		let responseBuffer = await httpsGetRequest(url, proxyAgent);
		console.log("result", "IP", JSON.parse(responseBuffer).ip);

		localProxyServer.close();
		await new Promise(resolve => localProxyServer.once("close", resolve));
	}

	posticheServer.close();
	await new Promise(resolve => posticheServer.once("close", resolve));
})();
