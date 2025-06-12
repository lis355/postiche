import { config as dotenv } from "dotenv-flow";
import { SocksProxyAgent } from "socks-proxy-agent";

import { httpsGetRequest } from "../utils.js";
import { createSocks5ProxyNoAuthServer } from "../proxyProtocols/socks5.js";

dotenv();

(async () => {
	const localProxyServerPort = Number(process.env.LOCAL_PROXY_SERVER_PORT);

	const localProxyServer = createSocks5ProxyNoAuthServer(localProxyServerPort);
	localProxyServer.listen(localProxyServerPort, () => console.log(`Socks5ProxyNoAuthServer listening on ${localProxyServerPort} port`));

	await new Promise(resolve => localProxyServer.once("listening", resolve));

	const responseBuffer = await httpsGetRequest(process.env.TEST_IP_REQUEST_URL, new SocksProxyAgent(`socks5://localhost:${localProxyServerPort}`));
	console.log("result", responseBuffer.toString().substring(0, 15));

	localProxyServer.close();
	await new Promise(resolve => localProxyServer.once("close", resolve));
})();
