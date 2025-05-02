import net from "node:net";

import socks from "socksv5";

import { createPosticheProxyClientSocket } from "./posticheProxyClient.js";
import { createDebugPassThroghStream } from "./utils.js";

async function waitForStreamData(readableStream, size = undefined) {
	return new Promise((resolve, reject) => {
		readableStream.once("close", reject);

		readableStream.once("readable", () => {
			readableStream.off("close", reject);

			return resolve(readableStream.read(size));
		});
	});
}

export function createPosticheProxyServer(port) {
	const server = net.createServer(async clientSocket => {
		clientSocket.pause();

		// console.log(`PosticheProxyServer client connected ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);

		clientSocket.on("close", () => {
			// console.log(`PosticheProxyServer client disconnected ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);
		});

		let buffer = await waitForStreamData(clientSocket, 4);
		const destinationHostBufferLength = buffer.readInt32BE(0);

		buffer = await waitForStreamData(clientSocket, destinationHostBufferLength);
		const host = buffer.toString();

		buffer = await waitForStreamData(clientSocket, 2);
		const port = buffer.readInt16BE(0);

		// console.log(`PosticheProxyServer client ${clientSocket.remoteAddress}:${clientSocket.remotePort} want proxy to ${host}:${port}`);

		const destinationSocket = net.createConnection({ host, port });
		destinationSocket.once("connect", () => {
			clientSocket
				.pipe(createDebugPassThroghStream({ name: "clientSocket -> destinationSocket" }))
				.pipe(destinationSocket);

			destinationSocket
				.pipe(createDebugPassThroghStream({ name: "destinationSocket -> clientSocket" }))
				.pipe(clientSocket);

			clientSocket.resume();
		});
	});

	server.listen(port, () => {
		console.log(`PosticheProxyServer started at ${port}`);
	});

	return server;
}

export function createPosticheLocalSocksProxyServer(localSocksProxyPort, posticheProxyHost, posticheProxyPort) {
	const socksServer = socks.createServer(function (info, accept, deny) {
		createPosticheProxyClientSocket(posticheProxyHost, posticheProxyPort, info.dstAddr, info.dstPort, posticheProxyClientSocket => {
			const clientSocket = accept(true);

			clientSocket.pipe(posticheProxyClientSocket);
			posticheProxyClientSocket.pipe(clientSocket);
		});
	});

	socksServer.useAuth(socks.auth.None());

	socksServer.listen(localSocksProxyPort, () => {
		console.log("PosticheLocalSocksProxyServer listening on", localSocksProxyPort);
	});

	return socksServer;
}
