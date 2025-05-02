import net from "node:net";

import { waitForStreamData } from "../utils.js";
import config from "./posticheProxyConfig.js";

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

export async function createPosticheProxyClientSocket(serverHost, serverPort, destinationHost, destinationPort, callback) {
	// const posticheProxyClientSocket =
	new PosticheProxyClientSocket(serverHost, serverPort, destinationHost, destinationPort, callback);
}
