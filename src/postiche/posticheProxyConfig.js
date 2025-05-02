import fs from "node:fs";
import path from "node:path";

class PosticheProxyConfig {
	constructor(obj) {
		for (const [name, value] of Object.entries(obj)) this[name] = value;

		this.tlsFrames.out = this.tlsFrames.out.map(s => Buffer.from(s, "base64"));
		this.tlsFrames.in = this.tlsFrames.in.map(s => Buffer.from(s, "base64"));
	}

	getTlsOutFrame(number) {
		return this.tlsFrames.out[number];
	}

	getTlsInFrame(number) {
		return this.tlsFrames.in[number];
	}
}

const configFilePath = path.resolve("postiche.config.json");
if (!fs.existsSync(configFilePath)) throw new Error(`No config file at ${configFilePath}`);

let config;
try {
	const obj = JSON.parse(fs.readFileSync(configFilePath));

	config = new PosticheProxyConfig(obj);

	console.log(`PosticheProxyConfig loaded at ${configFilePath}`);
} catch (error) {
	throw new Error(`Bad config at ${configFilePath} (${error.message})`);
}

export default config;
