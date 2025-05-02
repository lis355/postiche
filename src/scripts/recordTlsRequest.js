import { buffer } from "node:stream/consumers";
import { Transform } from "node:stream";
import fs from "node:fs";
import https from "node:https";
import net from "node:net";
import path from "node:path";

import { config as dotenv } from "dotenv-flow";
import { SocksProxyAgent } from "socks-proxy-agent";
import socks from "socksv5";

dotenv();

const config = {
	tlsFrames: {
		out: [],
		in: []
	}
};

function createLocalSocksProxyServer(localSocksProxyPort) {
	const localSocksServer = socks.createServer((info, accept, deny) => {
		const destinationSocket = net.createConnection({ host: info.dstAddr, port: info.dstPort });
		destinationSocket.once("connect", () => {
			const clientSocket = accept(true);

			clientSocket
				.pipe(new Transform({
					transform(chunk, encoding, callback) {
						tlsFrames.out.push(chunk.toString("base64"));

						callback(null, chunk);
					}
				}))
				.pipe(destinationSocket);

			destinationSocket
				.pipe(new Transform({
					transform(chunk, encoding, callback) {
						tlsFrames.in.push(chunk.toString("base64"));

						callback(null, chunk);
					}
				}))
				.pipe(clientSocket);

			clientSocket.resume();
		});
	});

	localSocksServer.useAuth(socks.auth.None());

	localSocksServer.listen(localSocksProxyPort, () => {
		// console.log("localSocksServer listening on", localSocksProxyPort);
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
	const url = "https://telegram.org";
	const localSocksServerPort = 1090;

	const localSocksServer = createLocalSocksProxyServer(localSocksServerPort);

	console.log("GET", url);
	const responseBuffer = await httpsGetRequest(localSocksServerPort, url);
	console.log("responseBuffer length", responseBuffer.toString().length, "Bytes");

	localSocksServer.close();

	config.url = url;

	const configFilePath = path.resolve(".posticheConfig", "cfg.json");
	fs.writeFileSync(configFilePath, JSON.stringify(config));
})();
