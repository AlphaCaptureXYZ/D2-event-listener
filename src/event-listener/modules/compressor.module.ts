//@ts-ignore
const pako = require('pako');

const deflate = async (uncompressed: string): Promise<string> => {
	// compressing data
	const data = pako.deflate(uncompressed, { to: 'string' })
	return Buffer.from(data).toString('hex')
}

const inflate = async (compressed: string): Promise<string> => {
	// decompressing data
	const input = Buffer.from(compressed, 'hex')
	return pako.inflate(input, { to: 'string' })
}

export const CompressorModule = {
	inflate,
	deflate,
}
