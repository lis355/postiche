import { buffer } from "node:stream/consumers";
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

export async function httpsGetRequest(url, agent) {
	return new Promise((resolve, reject) => {
		https.get(
			url,
			{
				agent
			},
			async response => {
				const responseBuffer = await buffer(response);

				console.log(response.statusCode, response.statusMessage);

				return resolve(responseBuffer);
			}
		);
	});
}
