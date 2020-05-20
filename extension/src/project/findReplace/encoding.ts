import * as jschardet from 'jschardet';

export function detectEncoding(buffer: Buffer): string | null {
	const detected = jschardet.detect(buffer);
	if (!detected || !detected.encoding) {
		return null;
	}

	const encoding = detected.encoding;
	const lowercaseEncoding = encoding.toLowerCase();
	return lowercaseEncoding;
}
