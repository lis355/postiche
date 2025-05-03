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

function createAndListenLocalSocksProxyServer(localSocksProxyPort) {
	const localSocksServer = socks.createServer((info, accept, deny) => {
		const destinationSocket = net.createConnection({ host: info.dstAddr, port: info.dstPort }, () => {
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

function createAndListenLocalHttpProxyServer(localHttpProxyPort) {
	const localHttpServer = http.createServer();

	localHttpServer.on("connect", (request, clientSocket, head) => {
		const destinationUrl = request.url.split(":");
		const destinationSocket = net.createConnection({ host: destinationUrl[0], port: Number(destinationUrl[1]) }, () => {
			clientSocket.write(getHttpRawResponseString(request, 200), () => {
				if (head.byteLength > 0) destinationSocket.write(head);

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
	let n = 0;

	clientSocket
		.pipe(new Transform({
			transform(chunk, encoding, callback) {
				tlsFrames.out.push(chunk.toString("base64"));
				console.log("--> TLS", n++, "frame", chunk.byteLength, "B");

				callback(null, chunk);
			}
		}))
		.pipe(destinationSocket);

	destinationSocket
		.pipe(new Transform({
			transform(chunk, encoding, callback) {
				tlsFrames.in.push(chunk.toString("base64"));
				console.log("<-- TLS", n++, "frame", chunk.byteLength, "B");

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
		localProxyServer = createAndListenLocalSocksProxyServer(localProxyServerPort);
		proxyAgent = new SocksProxyAgent(localProxyServerUrl);
	} else if (localProxyServerProtocol === "http") {
		localProxyServer = createAndListenLocalHttpProxyServer(localProxyServerPort);
		proxyAgent = new HttpsProxyAgent(localProxyServerUrl);
	} else throw new Error(`Bad local proxy server protocol ${localProxyServerProtocol}`);

	await new Promise(resolve => localProxyServer.once("listening", resolve));

	const url = process.env.RECORD_TLS_REQUEST_URL;
	await httpsGetRequest(url, proxyAgent);

	localProxyServer.close();
	await new Promise(resolve => localProxyServer.once("close", resolve));

	const config = {
		localProxyServerProtocol,
		localProxyServerPort,
		posticheProxyServerHost: process.env.REMOTE_POSTICHE_PROXY_SERVER_HOST,
		posticheProxyServerPort: Number(process.env.REMOTE_POSTICHE_PROXY_SERVER_PORT),
		url,
		tlsFrames
	};

	const configFilePath = path.resolve("postiche.config.json");
	fs.writeFileSync(configFilePath, JSON.stringify(config, null, "\t"));

	console.log("config", configFilePath, JSON.stringify({ ...config, tlsFrames: undefined }, null, "\t"));
})();
