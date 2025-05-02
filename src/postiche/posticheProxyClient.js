import net from "node:net";

const int16Buffer = Buffer.allocUnsafe(2);
const int32Buffer = Buffer.allocUnsafe(4);

export async function createPosticheProxyClientSocket(serverHost, serverPort, destinationHost, destinationPort, callback) {
	const destinationSocket = net.createConnection({ host: serverHost, port: serverPort });

	destinationSocket.cork();

	// destinationHost length 4 bytes
	const destinationHostBuffer = Buffer.from(destinationHost);
	const destinationHostBufferLength = destinationHostBuffer.byteLength;
	int32Buffer.writeInt32BE(destinationHostBufferLength, 0);
	destinationSocket.write(int32Buffer);

	// destinationHost
	destinationSocket.write(destinationHostBuffer);

	// port 2 bytes
	int16Buffer.writeInt16BE(destinationPort, 0);
	destinationSocket.write(int16Buffer);

	destinationSocket.uncork();

	destinationSocket.once("connect", () => callback(destinationSocket));
}
