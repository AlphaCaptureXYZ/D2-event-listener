//@ts-ignore
import * as pako from 'pako';

const compressData = async (uncompressed: string): Promise<string> => {
	const data = pako.deflate(uncompressed, { to: 'string' });
	return Buffer.from(data).toString('hex');
}

const decompressData = async (compressed: string): Promise<string> => {
	const input = Buffer.from(compressed, 'hex');
	return pako.inflate(input, { to: 'string' });
}

export const CompressorModule = {
	compressData,
	decompressData,
};