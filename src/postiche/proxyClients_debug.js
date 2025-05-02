// import socks from "socksv5";
// import { SocksClient } from "socks";

// import { createDebugPassThroghStream } from "./utils.js";

// 		SocksClient.createConnection({
// 			proxy: {
// 				host: "localhost",
// 				port: 1080,
// 				type: 5
// 			},

// 			command: "connect", // SOCKS command (createConnection factory function only supports the connect command)

// 			destination: {
// 				host: info.dstAddr,
// 				port: info.dstPort
// 			}
// 		}, (err, info) => {
// 			if (!err) {
// 				resumeWithTargetSocket(info.socket);

// 				// console.log(info.socket);
// 				// <Socket ...>  (this is a raw net.Socket that is established to the destination host through the given proxy server)
// 			} else {
// 				// Handle errors
// 			}
// 		});

// 	async function getHTTPProxySocket({ proxyUsername = null, proxyPassword = null, proxyHost, proxyPort, targetHost, targetPort = 80 }) {
// 		return new Promise((resolve, reject) => {
// 			const headers = {};

// 			if (proxyUsername &&
// 				proxyPassword) headers["proxy-authorization"] = `Basic ${Buffer.from(`${decodeURIComponent(proxyUsername)}:${decodeURIComponent(proxyPassword)}`).toString("base64")}`;

// 			const request = http.request({
// 				host: proxyHost,
// 				port: proxyPort,
// 				headers,
// 				method: "CONNECT",
// 				path: `${targetHost}:${targetPort}`
// 			});

// 			request.once("connect", (response, socket, head) => {
// 				// console.log(response.statusCode, response.statusMessage);

// 				if (response.statusCode === 200) return resolve(socket);

// 				return reject(new Error(`${response.statusCode} ${response.statusMessage}`));

// 				// socket.on("end", () => {
// 				// 	// proxy.close();
// 				// });
// 			});

// 			request.end();
// 		});
// 	}

// 	const socket = await getHTTPProxySocket({
// 		proxyUsername: "yu6MLmeJJ",
// 		proxyPassword: "h2ZuyhHvW",
// 		proxyHost: "localhost",
// 		proxyPort: 1081,
// 		targetHost: "jdam.am"
// 	});

// 	socket.write("GET / HTTP/1.1\r\n" +
// 		"Host: www.google.com:80\r\n" +
// 		"Connection: close\r\n" +
// 		"\r\n");

// 	socket.on("data", (chunk) => {
// 		console.log(chunk.toString());
// 	});
// })();

// net.createServer(clientSocket => {
// 	net.createConnection({ host: "jdam.am"})
// });
