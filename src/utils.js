export async function waitForStreamData(readableStream, size = undefined) {
	return new Promise((resolve, reject) => {
		readableStream.once("close", reject);

		readableStream.once("readable", () => {
			readableStream.off("close", reject);

			return resolve(readableStream.read(size));
		});
	});
}
