import { Transform } from "node:stream";

export function createDebugPassThroghStream({ name, logData = false }) {
	return new Transform({
		transform(chunk, encoding, callback) {
			console.log(name, chunk.length, "B");
			// console.log(name, (chunk.length / 1024).toFixed(2), "Kb");

			if (logData) console.log(chunk.toString());

			callback(null, chunk);
		}
	});
}
