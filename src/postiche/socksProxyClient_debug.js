// import socks from "socksv5";
// import { SocksClient } from "socks";

// import { createDebugPassThroghStream } from "./utils.js";

// export function createServer(port) {
// 	var srv = socks.createServer(function (info, accept, deny) {
// 		function resumeWithTargetSocket(targetSocket) {
// 			const clientSocket = accept(true);

// 			clientSocket
// 				.pipe(createDebugPassThroghStream(`${info.srcAddr}:${info.srcPort} -> ${info.dstAddr}:${info.dstPort}`))
// 				.pipe(targetSocket);

// 			targetSocket
// 				.pipe(createDebugPassThroghStream(`${info.dstAddr}:${info.dstPort} -> ${info.srcAddr}:${info.srcPort}`))
// 				.pipe(clientSocket);
// 		}

// 		// without proxy direct conection
// 		// const targetSocket = net.createConnection({ host: info.dstAddr, port: info.dstPort });
// 		// targetSocket.once("connect", () => {
// 		// 	resumeWithTargetSocket(targetSocket);
// 		// });

// 		// with proxy
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
// 	});

// 	srv.useAuth(socks.auth.None());

// 	srv.listen(port, "localhost", function () {
// 		console.log("SOCKS server listening on ", port);
// 	});
// }
