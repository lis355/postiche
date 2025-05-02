import fs from "node:fs";
import path from "node:path";

class PosticheProxyConfig {
	constructor(obj) {
		this.obj = obj;

		this.obj.tlsFrames.out = this.obj.tlsFrames.out.map(s => Buffer.from(s, "base64"));
		this.obj.tlsFrames.in = this.obj.tlsFrames.in.map(s => Buffer.from(s, "base64"));
	}

	get url() {
		return this.obj.url;
	}

	getTlsOutFrame(number) {
		return this.obj.tlsFrames.out[number];
	}

	getTlsInFrame(number) {
		return this.obj.tlsFrames.in[number];
	}
}

const configFilePath = path.resolve(".posticheConfig", "cfg.json");
const obj = JSON.parse(fs.readFileSync(configFilePath));

const config = new PosticheProxyConfig(obj);

export default config;
