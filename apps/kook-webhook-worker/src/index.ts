export interface Env {
	KOOK_VERIFY_TOKEN: string;
	KOOK_ENCRYPT_KEY?: string;
	KV?: KVNamespace;
	KOOK_EVENT_QUEUE: Queue;
}

type KookWebhookEnvelope =
	| { s: 0; d: { verify_token: string; channel_type: string; challenge: string; [k: string]: unknown } }
	| { s: 0; d: { verify_token: string; [k: string]: unknown }; sn?: number }
	| { encrypt: string };

async function inflateDeflate(bytes: ArrayBuffer): Promise<string> {
	const stream = new DecompressionStream('deflate');
	const writer = stream.writable.getWriter();
	await writer.write(new Uint8Array(bytes));
	await writer.close();
	return await new Response(stream.readable).text();
}

function base64ToBytes(input: string): Uint8Array {
	const bin = atob(input);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

async function decryptKookWebhook(encrypt: string, encryptKey: string): Promise<string> {
	const originBytes = base64ToBytes(encrypt);
	const originStr = new TextDecoder().decode(originBytes);
	const ivStr = originStr.slice(0, 16);
	const cipherB64 = originStr.slice(16);
	const cipherBytes = base64ToBytes(cipherB64);
	const paddedKey = encryptKey.padEnd(32, '\0');
	const keyBytes = new TextEncoder().encode(paddedKey);
	const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
	const ivBytes = new TextEncoder().encode(ivStr);
	const cipherBuf = new ArrayBuffer(cipherBytes.byteLength);
	new Uint8Array(cipherBuf).set(cipherBytes);
	const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivBytes }, cryptoKey, cipherBuf);
	return new TextDecoder().decode(plain);
}

async function parseKookWebhookRequest(request: Request, env: Env): Promise<any> {
	const raw = await request.arrayBuffer();

	let text: string;
	try {
		text = new TextDecoder().decode(raw);
		JSON.parse(text);
	} catch {
		text = await inflateDeflate(raw);
	}

	let payload: KookWebhookEnvelope;
	try {
		payload = JSON.parse(text);
	} catch {
		throw new Error('invalid_json');
	}

	if ('encrypt' in payload) {
		if (!env.KOOK_ENCRYPT_KEY) throw new Error('missing_encrypt_key');
		const decrypted = await decryptKookWebhook(payload.encrypt, env.KOOK_ENCRYPT_KEY);
		return JSON.parse(decrypted);
	}

	return payload;
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
		},
	});
}

async function isDuplicateSn(env: Env, sn: number | undefined): Promise<boolean> {
	if (!sn) return false;
	if (!env.KV) return false;
	const key = `kook:webhook:sn:${sn}`;
	const existed = await env.KV.get(key);
	if (existed) return true;
	await env.KV.put(key, '1', { expirationTtl: 60 * 60 * 24 });
	return false;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'GET' && url.pathname === '/health') {
			return json({ ok: true });
		}

		if (request.method !== 'POST') {
			return json({ code: 404, message: 'Not Found' }, 404);
		}

		if (url.pathname !== '/kook/webhook') {
			return json({ code: 404, message: 'Not Found' }, 404);
		}

		let message: any;
		try {
			message = await parseKookWebhookRequest(request, env);
		} catch (e: any) {
			const code = e?.message;
			if (code === 'missing_encrypt_key') return json({ code: 400, message: 'Missing KOOK_ENCRYPT_KEY' }, 400);
			return json({ code: 400, message: 'Bad Request' }, 400);
		}

		const verifyToken = message?.d?.verify_token;
		if (verifyToken !== env.KOOK_VERIFY_TOKEN) {
			return json({ code: 401, message: 'Invalid verify_token' }, 401);
		}

		const challenge = message?.d?.challenge;
		if (challenge) {
			return json({ challenge });
		}

		const sn = typeof message?.sn === 'number' ? message.sn : undefined;
		if (await isDuplicateSn(env, sn)) {
			return json({ ok: true });
		}

		await env.KOOK_EVENT_QUEUE.send(message);
		return json({ ok: true });
	},
};
