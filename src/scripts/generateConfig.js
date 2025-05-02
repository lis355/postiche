import { Transform } from "node:stream";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";

import { config as dotenv } from "dotenv-flow";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import socks from "socksv5";

import { getHttpRawResponseString, httpsGetRequest } from "../utils.js";

dotenv();

const tlsFrames = {
	out: [],
	in: []
};

function createLocalSocksProxyServer(localSocksProxyPort) {
	const localSocksServer = socks.createServer((info, accept, deny) => {
		const destinationSocket = net.createConnection({ host: info.dstAddr, port: info.dstPort });
		destinationSocket.once("connect", () => {
			const clientSocket = accept(true);

			handleProxySockets(clientSocket, destinationSocket);
		});
	});

	localSocksServer.useAuth(socks.auth.None());

	localSocksServer.listen(localSocksProxyPort, () => {
		console.log("localSocksServer listening on", localSocksProxyPort);
	});

	return localSocksServer;
}

function createLocalHttpProxyServer(localHttpProxyPort) {
	const localHttpServer = http.createServer();

	localHttpServer.on("connect", (request, clientSocket, head) => {
		const destinationUrl = request.url.split(":");
		const destinationSocket = net.createConnection({ host: destinationUrl[0], port: Number(destinationUrl[1]) });
		destinationSocket.once("connect", () => {
			clientSocket.write(getHttpRawResponseString(request, 200), () => {
				handleProxySockets(clientSocket, destinationSocket);
			});
		});
	});

	localHttpServer.listen(localHttpProxyPort, () => {
		console.log("localHttpServer listening on", localHttpProxyPort);
	});

	return localHttpServer;
}

function handleProxySockets(clientSocket, destinationSocket) {
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
}

(async () => {
	const localProxyServerProtocol = process.env.LOCAL_PROXY_SERVER_PROTOCOL;
	const localProxyServerPort = Number(process.env.LOCAL_PROXY_SERVER_PORT);
	const localProxyServerUrl = `${localProxyServerProtocol}://localhost:${localProxyServerPort}`;
	let localProxyServer;
	let proxyAgent;
	if (localProxyServerProtocol === "socks") {
		localProxyServer = createLocalSocksProxyServer(localProxyServerPort);
		proxyAgent = new SocksProxyAgent(localProxyServerUrl);
	} else if (localProxyServerProtocol === "http") {
		localProxyServer = createLocalHttpProxyServer(localProxyServerPort);
		proxyAgent = new HttpsProxyAgent(localProxyServerUrl);
	} else throw new Error(`Bad local proxy server protocol ${localProxyServerProtocol}`);

	console.log(proxyAgent.constructor.name, "proxy to", localProxyServerUrl);

	const url = process.env.RECORD_TLS_REQUEST_URL;
	console.log("GET", url);

	const responseBuffer = await httpsGetRequest(url, proxyAgent);
	const responseBufferString = responseBuffer.toString();

	console.log("responseBuffer length", responseBufferString.length, "Bytes", responseBufferString.substring(0, 15));

	localProxyServer.close();

	const config = {
		localProxyServerProtocol,
		localProxyServerPort,
		posticheProxyServerHost: process.env.REMOTE_POSTICHE_PROXY_SERVER_HOST,
		posticheProxyServerPort: Number(process.env.REMOTE_POSTICHE_PROXY_SERVER_PORT),
		url,
		tlsFrames
	};

	const configFilePath = path.resolve("postiche.config.json");

	console.log("config", JSON.stringify({ ...config, tlsFrames: undefined }, null, "\t"));
	console.log("Write config at", configFilePath);

	fs.writeFileSync(configFilePath, JSON.stringify(config, null, "\t"));
})();
