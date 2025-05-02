import { Transform } from "node:stream";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path, { resolve } from "node:path";

import { config as dotenv } from "dotenv-flow";
import { HttpProxyAgent } from "http-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import socks from "socksv5";

import { httpsGetRequest } from "../utils.js";

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
		console.log("localSocksServer listening on", localSocksProxyPort);
	});

	return localSocksServer;
}

function createLocalHttpProxyServer(localHttpProxyPort) {
	const localHttpServer = http.createServer();

	localHttpServer.on("connect", (request, clientSocket, head) => {
		clientSocket.pause();

		const destinationSocket = net.createConnection({ host: info.dstAddr, port: info.dstPort });
		destinationSocket.once("connect", () => {
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

	localHttpServer.listen(localHttpProxyPort, () => {
		console.log("localHttpServer listening on", localHttpProxyPort);
	});

	return localHttpServer;
}

(async () => {
	const localProxyServerPort = Number(process.env.LOCAL_PROXY_SERVER_PORT);
	const localProxyServerProtocol = process.env.LOCAL_PROXY_SERVER_PROTOCOL;
	const localProxyServerUrl = `${localProxyServerProtocol}://localhost:${localProxyServerPort}`;
	let localProxyServer;
	let proxyAgent;
	if (localProxyServerProtocol === "socks") {
		localProxyServer = createLocalSocksProxyServer(localProxyServerPort);
		proxyAgent = new SocksProxyAgent(localProxyServerUrl);
	} else if (localProxyServerProtocol === "http") {
		localProxyServer = createLocalHttpProxyServer(localProxyServerPort);
		proxyAgent = new HttpProxyAgent(localProxyServerUrl);
	} else throw new Error(`Bad local proxy server protocol ${localProxyServerProtocol}`);

	console.log(proxyAgent.constructor.name, "proxy to", localProxyServerUrl);

	const url = process.env.RECORD_TLS_REQUEST_URL;
	console.log("GET", url);

	///////
	const request = http.request({
		host: "localhost",
		port: localProxyServerPort,
		// headers,
		method: "CONNECT",
		path: "google.com"
	});

	request.once("connect", (response, socket, head) => {
		// console.log(response.statusCode, response.statusMessage);

		if (response.statusCode === 200) return resolve(socket);

		return reject(new Error(`${response.statusCode} ${response.statusMessage}`));

		// socket.on("end", () => {
		// 	// proxy.close();
		// });
	});

	request.end();
	///////

	const responseBuffer = await httpsGetRequest(url, proxyAgent);
	const responseBufferString = responseBuffer.toString();

	console.log("responseBuffer length", responseBufferString.length, "Bytes");
	console.log("...");
	console.log(responseBufferString.substring(0, 50));
	console.log("...");

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
