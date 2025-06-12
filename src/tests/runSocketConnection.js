import { config as dotenv } from "dotenv-flow";

import { stdin, stdout } from "node:process";
import net from "node:net";
import readline from "node:readline";

dotenv();

(async () => {
	const socket = net.createConnection(Number(process.env.TEST_SOCKET_CONNECT_PORT), process.env.TEST_SOCKET_CONNECT_HOST)
		.on("lookup", (err, address, family, host) => {
			console.log("lookup", address, host);
		})
		.on("connect", () => {
			console.log("connected", socket.remoteAddress, socket.remotePort);
		})
		.on("close", () => {
			console.log("disconnected");

			socket.end();
		})
		.on("data", buffer => {
			console.log(buffer.toString());
		});

	readline.createInterface(stdin, stdout)
		.on("line", line => {
			socket.write(line);
		});
})();

