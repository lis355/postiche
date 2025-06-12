import net from "node:net";
import EventEmitter from "node:events";

import { waitForStreamData, getHttpRawResponseString } from "../utils.js";

// https://datatracker.ietf.org/doc/html/rfc1928

// class Socks5ProxyNoAuthServer extends net.Server {
// 	constructor(options, connectionListener) {
// 		if (typeof arguments[0] === "object" &&
// 			typeof arguments[1] === "function") {
// 			options = arguments[0];
// 			connectionListener = arguments[1];
// 		} else if (typeof arguments[0] === "function") {
// 			options = undefined
// 			connectionListener = arguments[0];
// 		} else {
// 			options = undefined;
// 			connectionListener = undefined;
// 		}

// 		super(options);

// 		super.on("connection", this.#handleConnection.bind(this));
// 	}

// 	on() {

// 	}

// 	listener()
// }

class Socks5ProxyNoAuthServer {
	constructor() {
		this.server = net.createServer(async clientSocket => {
			// console.log(`PosticheProxyServer client ${clientSocket.remoteAddress}:${clientSocket.remotePort} connected`);

			// clientSocket.on("close", () => {
			// 	console.log(`PosticheProxyServer client ${clientSocket.remoteAddress}:${clientSocket.remotePort} disconnected`);
			// });

			await this.#readHello(clientSocket);
			this.#sendHello(clientSocket);

			let buffer = await waitForStreamData(clientSocket, 10);

			const ip = buffer.subarray(4, 8).map(String).join(".");
			const port = buffer.readInt16BE(8);

			// const { host, port } = await this.readHeader(clientSocket);

			const destinationSocket = net.createConnection({ host: ip, port }, () => {
				this.writeFakeTlsFrame(clientSocket);

				clientSocket
					// .pipe(createDebugPassThroghStream({ name: "SERVER C -> S" }))
					.pipe(createEveryByteXorEncryptionTransform())
					.pipe(destinationSocket);

				destinationSocket
					// .pipe(createDebugPassThroghStream({ name: "SERVER S -> C" }))
					.pipe(createEveryByteXorEncryptionTransform())
					.pipe(clientSocket);

				clientSocket.resume();
			});
		});
	}

	once() {
		return this.server.once(...arguments);
	}

	listen() {
		return this.server.listen(...arguments);
	}

	async #readHello(clientSocket) {
		let buffer = await waitForStreamData(clientSocket, 2);

		// The VER field is set to X'05' for this version of the protocol
		if (buffer[0] != 5) throw new Error("Bad SOCKS5 version");

		const methodsAmount = buffer[1];
		buffer = await waitForStreamData(clientSocket, methodsAmount);

		// X'00' NO AUTHENTICATION REQUIRED
		if (!Array.from(buffer).includes(0)) throw new Error("No auth method");
	}

	#sendHello(clientSocket) {
		const buffer = Buffer.allocUnsafe(2);

		// The VER field is set to X'05' for this version of the protocol
		buffer[0] = 5;

		// X'00' NO AUTHENTICATION REQUIRED
		buffer[1] = 0;

		clientSocket.write(buffer);
	}
}

export function createSocks5ProxyNoAuthServer() {
	return new Socks5ProxyNoAuthServer(...arguments);
}
