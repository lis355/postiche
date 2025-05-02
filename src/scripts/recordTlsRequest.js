import { buffer } from "node:stream/consumers";
import https from "https";

import { config as dotenv } from "dotenv-flow";
import { SocksProxyAgent } from "socks-proxy-agent";

dotenv();

function createLocalSocksProxyServer(localSocksProxyPort) {
	const localSocksServer = socks.createServer((info, accept, deny) => {
		// createPosticheProxyClientSocket(posticheProxyHost, posticheProxyPort, info.dstAddr, info.dstPort, posticheProxyClientSocket => {
		const clientSocket = accept(true);

		clientSocket.pipe(posticheProxyClientSocket);
		posticheProxyClientSocket.pipe(clientSocket);
		// });
	});

	localSocksServer.useAuth(socks.auth.None());

	localSocksServer.listen(localSocksProxyPort, () => {
		console.log("localSocksServer listening on", localSocksProxyPort);
	});

	return localSocksServer;
}


async function httpsGetRequest(localServerPort, url) {
	return new Promise((resolve, reject) => {
		https.get(
			url,
			{
				agent: new SocksProxyAgent(`socks://localhost:${localServerPort}`)
			},
			async response => {
				const responseBuffer = await buffer(response);

				console.log(response.statusCode, response.statusMessage);

				return resolve(responseBuffer);
			}
		);
	});
}

(async () => {
	const url = "telegram.org";
	const localSocksServerPort = 1090;

	const localSocksServer = createLocalSocksProxyServer(localSocksServerPort);

	const responseBuffer = await httpsGetRequest(localSocksServerPort, url);
	console.log(responseBuffer.toString());

	localSocksServer.close();
})();
