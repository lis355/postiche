import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

import {
	createPosticheLocalSocksProxyServer,
	createPosticheLocalHttpProxyServer
} from "../postiche/posticheProxy.js";
import { httpsGetRequest } from "../utils.js";

export async function testLocalProxyServers(posticheProxyServerHost, posticheProxyServerPort) {
	const sites = {
		"https://echo.free.beeceptor.com": responseBuffer => console.log("result", "IP", JSON.parse(responseBuffer).ip),
		"https://telegram.org": responseBuffer => console.log("result", responseBuffer.toString().substring(0, 15))
	};

	const localProxyServerPort = Number(process.env.LOCAL_PROXY_SERVER_PORT);

	for (const localProxyServerProtocol of ["socks", "http"]) {
		console.log("");

		const localProxyServerUrl = `${localProxyServerProtocol}://localhost:${localProxyServerPort}`;
		let localProxyServer;
		let proxyAgent;
		if (localProxyServerProtocol === "socks") {
			localProxyServer = createPosticheLocalSocksProxyServer(localProxyServerPort, posticheProxyServerHost, posticheProxyServerPort);
			proxyAgent = new SocksProxyAgent(localProxyServerUrl);
		} else if (localProxyServerProtocol === "http") {
			localProxyServer = createPosticheLocalHttpProxyServer(localProxyServerPort, posticheProxyServerHost, posticheProxyServerPort);
			proxyAgent = new HttpsProxyAgent(localProxyServerUrl);
		} else throw new Error(`Bad local proxy server protocol ${localProxyServerProtocol}`);

		await new Promise(resolve => localProxyServer.once("listening", resolve));

		console.log("");
		for (const [url, responseBufferProcessor] of Object.entries(sites)) {
			console.log("test", localProxyServerProtocol, proxyAgent.constructor.name, localProxyServerUrl, url);

			responseBufferProcessor(await httpsGetRequest(url, proxyAgent));
		}

		localProxyServer.close();
		await new Promise(resolve => localProxyServer.once("close", resolve));
	}
}
