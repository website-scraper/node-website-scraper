async function readAll (stream, encoding) {
	const chunks = [];
	for await (const chunk of stream) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString(encoding);
}

export {
	readAll
};
