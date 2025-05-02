import { config as dotenv } from "dotenv-flow";

import {
	createPosticheLocalSocksProxyServer,
	createPosticheLocalHttpProxyServer
} from "./postiche/posticheProxy.js";
import config from "./postiche/posticheProxyConfig.js";

dotenv();

(async () => {
	const { localProxyServerProtocol, localProxyServerPort, posticheProxyServerHost, posticheProxyServerPort } = config;

	const localProxyServerUrl = `${localProxyServerProtocol}://localhost:${localProxyServerPort}`;
	let localProxyServer;
	if (localProxyServerProtocol === "socks") {
		localProxyServer = createPosticheLocalSocksProxyServer(localProxyServerPort, posticheProxyServerHost, posticheProxyServerPort);
	} else if (localProxyServerProtocol === "http") {
		localProxyServer = createPosticheLocalHttpProxyServer(localProxyServerPort, posticheProxyServerHost, posticheProxyServerPort);
	} else throw new Error(`Bad local proxy server protocol ${localProxyServerProtocol}`);

	await new Promise(resolve => localProxyServer.once("listening", resolve));

	console.log(`PosticheLocalSocksProxyServer started at ${localProxyServerUrl}`);
})();
