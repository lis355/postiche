import { buffer } from "node:stream/consumers";
import http from "node:http";
import https from "node:https";

export async function waitForStreamData(readableStream, size = undefined) {
	return new Promise((resolve, reject) => {
		readableStream.once("close", reject);

		readableStream.once("readable", () => {
			readableStream.off("close", reject);

			return resolve(readableStream.read(size));
		});
	});
}

export function getHttpRawResponseString(request, statusCode) {
	return `HTTP/${request.httpVersion} ${statusCode} ${http.STATUS_CODES[statusCode]}\r\n\r\n`;
}

export async function httpsGetRequest(url, agent) {
	return new Promise((resolve, reject) => {
		const request = https.get(
			url,
			{
				agent
			},
			async response => {
				const responseBuffer = await buffer(response);

				console.log(response.statusCode, response.statusMessage, `[Body ${responseBuffer.byteLength} Bytes]`, "[..." + responseBuffer.subarray(0, 15).toString() + "...]");

				return resolve(responseBuffer);
			}
		);

		console.log(request.method, request.host, request.path, "[" + (agent ? `${agent.constructor.name} ${JSON.stringify(agent.proxy)}` : "none agent") + "]");
	});
}
