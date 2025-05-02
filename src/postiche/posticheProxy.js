import { Transform } from "node:stream";
import http from "node:http";
import net from "node:net";

import socks from "socksv5";

import { waitForStreamData } from "../utils.js";
import config from "./posticheProxyConfig.js";

function createDebugPassThroghStream({ name }) {
	return new Transform({
		transform(chunk, encoding, callback) {
			console.log(name, chunk.length, "B");
			// console.log(name, (chunk.length / 1024).toFixed(2), "Kb");

			console.log(Array.from(chunk).map(b => b.toString(16).toUpperCase().padStart(2, "0")).join(" "));

			callback(null, chunk);
		}
	});
}

function createSimpleCryptTransform() {
	return new Transform({
		transform(chunk, encoding, callback) {
			const buffer = Buffer.allocUnsafe(chunk.byteLength);
			for (let i = 0; i < chunk.byteLength; i++) buffer[i] = chunk[i] ^ 0b10101010;

			callback(null, buffer);
		}
	});
}

class PosticheProxyServer {
	constructor(port) {
		this.port = port;

		this.server = net.createServer(async clientSocket => {
			clientSocket.pause();

			console.log(`PosticheProxyServer client ${clientSocket.remoteAddress}:${clientSocket.remotePort} connected`);

			clientSocket.on("close", () => {
				console.log(`PosticheProxyServer client ${clientSocket.remoteAddress}:${clientSocket.remotePort} disconnected`);
			});

			await this.readFakeTlsFrame(clientSocket);

			const { host, port } = await this.readHeader(clientSocket);

			const destinationSocket = net.createConnection({ host, port });
			destinationSocket.once("connect", () => {
				this.writeFakeTlsFrame(clientSocket);

				clientSocket
					// .pipe(createDebugPassThroghStream({ name: "SERVER C -> S" }))
					.pipe(createSimpleCryptTransform())
					.pipe(destinationSocket);

				destinationSocket
					// .pipe(createDebugPassThroghStream({ name: "SERVER S -> C" }))
					.pipe(createSimpleCryptTransform())
					.pipe(clientSocket);

				clientSocket.resume();
			});
		});

		this.server.listen(this.port, () => {
			console.log(`PosticheProxyServer started at ${this.port}`);
			console.log(`PosticheProxyServer fake tls frames from ${config.url}`);
		});
	}

	writeFakeTlsFrame(clientSocket) {
		// send fake tls first frame from captured https request (server hello)
		clientSocket.write(config.getTlsInFrame(0));
	}

	async readHeader(clientSocket) {
		let buffer = await waitForStreamData(clientSocket, 4);
		const destinationHostBufferLength = buffer.readInt32BE(0);

		buffer = await waitForStreamData(clientSocket, destinationHostBufferLength);
		const host = buffer.toString();

		buffer = await waitForStreamData(clientSocket, 2);
		const port = buffer.readInt16BE(0);

		console.log(`PosticheProxyServer client ${clientSocket.remoteAddress}:${clientSocket.remotePort} want connect to ${host}:${port}`);

		return { host, port };
	}

	async readFakeTlsFrame(clientSocket) {
		// skip first fake tls frame from captured https request (client hello)
		const firstFakeTlsFrameLength = config.getTlsOutFrame(0).byteLength;
		await waitForStreamData(clientSocket, firstFakeTlsFrameLength);

		console.log(`PosticheProxyServer client ${clientSocket.remoteAddress}:${clientSocket.remotePort} skipped first fake tls frame with ${firstFakeTlsFrameLength} Bytes`);
	}
}

export function createPosticheProxyServer(port) {
	const posticheProxyServer = new PosticheProxyServer(port);

	return posticheProxyServer.server;
}

const int16Buffer = Buffer.allocUnsafe(2);
const int32Buffer = Buffer.allocUnsafe(4);

class PosticheProxyClientSocket {
	constructor(serverHost, serverPort, destinationHost, destinationPort, onConnected) {
		this.destinationSocket = net.createConnection({ host: serverHost, port: serverPort });

		this.destinationSocket.cork();
		this.writeFakeTlsFrame();
		this.writeHeader(destinationHost, destinationPort);
		this.destinationSocket.uncork();

		this.destinationSocket.once("connect", async () => {
			console.log(`PosticheProxyClientSocket connected to server ${this.destinationSocket.remoteAddress}:${this.destinationSocket.remotePort}`);

			await this.readFakeTlsFrame();

			return onConnected(this.destinationSocket);
		});
	}

	writeFakeTlsFrame() {
		// send fake tls first frame from captured https request (client hello)
		this.destinationSocket.write(config.getTlsOutFrame(0));
	}

	writeHeader(destinationHost, destinationPort) {
		// destinationHost length 4 bytes
		const destinationHostBuffer = Buffer.from(destinationHost);
		const destinationHostBufferLength = destinationHostBuffer.byteLength;
		int32Buffer.writeInt32BE(destinationHostBufferLength, 0);
		this.destinationSocket.write(int32Buffer);

		// destinationHost
		this.destinationSocket.write(destinationHostBuffer);

		// port 2 bytes
		int16Buffer.writeInt16BE(destinationPort, 0);
		this.destinationSocket.write(int16Buffer);
	}

	async readFakeTlsFrame() {
		// skip first fake tls frame from captured https request (server hello)
		const firstFakeTlsFrameLength = config.getTlsInFrame(0).byteLength;
		await waitForStreamData(this.destinationSocket, firstFakeTlsFrameLength);

		console.log(`PosticheProxyClientSocket server ${this.destinationSocket.remoteAddress}:${this.destinationSocket.remotePort} skipped first fake tls frame with ${firstFakeTlsFrameLength} Bytes`);
	}
}

async function createPosticheProxyClientSocket(serverHost, serverPort, destinationHost, destinationPort, callback) {
	// const posticheProxyClientSocket =
	new PosticheProxyClientSocket(serverHost, serverPort, destinationHost, destinationPort, callback);
}

export function createPosticheLocalSocksProxyServer(localSocksProxyPort, posticheProxyHost, posticheProxyPort) {
	const socksServer = socks.createServer((info, accept, deny) => {
		createPosticheProxyClientSocket(posticheProxyHost, posticheProxyPort, info.dstAddr, info.dstPort, posticheProxyClientSocket => {
			const clientSocket = accept(true);

			clientSocket
				// .pipe(createDebugPassThroghStream({ name: "CLIENT C -> S" }))
				.pipe(createSimpleCryptTransform())
				.pipe(posticheProxyClientSocket);

			posticheProxyClientSocket
				// .pipe(createDebugPassThroghStream({ name: "CLIENT S -> C" }))
				.pipe(createSimpleCryptTransform())
				.pipe(clientSocket);
		});
	});

	socksServer.useAuth(socks.auth.None());

	socksServer.listen(localSocksProxyPort, () => {
		console.log("PosticheLocalSocksProxyServer listening on", localSocksProxyPort);
		console.log("PosticheLocalSocksProxyServer will connect with PosticheProxyServer on", posticheProxyHost, posticheProxyPort);
		console.log(`PosticheLocalSocksProxyServer fake tls frames from ${config.url}`);
	});

	return socksServer;
}

export function createPosticheLocalHttpProxyServer(localHttpProxyPort, posticheProxyHost, posticheProxyPort) {
	const httpServer = http.createServer();

	httpServer.on("connect", (request, clientSocket, head) => {
		clientSocket.pause();

		createPosticheProxyClientSocket(posticheProxyHost, posticheProxyPort, info.dstAddr, info.dstPort, posticheProxyClientSocket => {
			clientSocket
				// .pipe(createDebugPassThroghStream({ name: "CLIENT C -> S" }))
				.pipe(createSimpleCryptTransform())
				.pipe(posticheProxyClientSocket);

			posticheProxyClientSocket
				// .pipe(createDebugPassThroghStream({ name: "CLIENT S -> C" }))
				.pipe(createSimpleCryptTransform())
				.pipe(clientSocket);

			clientSocket.resume();
		});
	});

	httpServer.listen(localHttpProxyPort, () => {
		console.log("PosticheLocalHttpProxyServer listening on", localHttpProxyPort);
		console.log("PosticheLocalHttpProxyServer will connect with PosticheProxyServer on", posticheProxyHost, posticheProxyPort);
		console.log(`PosticheLocalHttpProxyServer fake tls frames from ${config.url}`);
	});

	return httpServer;
}
