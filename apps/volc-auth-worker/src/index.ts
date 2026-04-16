import { vodOpenapi } from '@volcengine/openapi';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

// 在 Cloudflare Worker 中自定义 axios adapter 为 fetch，以解决 XMLHttpRequest is not defined 问题
const fetchAdapter = async function (config: AxiosRequestConfig): Promise<AxiosResponse> {
	// axios 在这里可能传入 baseURL，需要和 url 拼接
	let urlStr = config.baseURL ? new URL(config.url || '', config.baseURL).toString() : config.url || '';

	// 处理 params 参数
	if (config.params) {
		const urlObj = new URL(urlStr);
		for (const key in config.params) {
			if (config.params[key] !== undefined) {
				if (Array.isArray(config.params[key])) {
					config.params[key].forEach((val: any) => urlObj.searchParams.append(key, val));
				} else {
					urlObj.searchParams.append(key, config.params[key]);
				}
			}
		}
		urlStr = urlObj.toString();
	}

	const headers: Record<string, string> = {};
	if (config.headers) {
		// axios 可能传入 AxiosHeaders 实例或者普通对象，这里安全地提取键值对
		const configHeaders = (config.headers.toJSON ? config.headers.toJSON() : config.headers) as Record<string, any>;
		for (const key in configHeaders) {
			if (typeof configHeaders[key] === 'string' || typeof configHeaders[key] === 'number') {
				headers[key] = String(configHeaders[key]);
			}
		}
	}
	// Cloudflare worker 的 fetch 不允许设置 Host
	delete headers['Host'];
	delete headers['host'];

	const init: RequestInit = {
		method: config.method?.toUpperCase() || 'GET',
		headers: headers,
	};

	if (config.data) {
		init.body = config.data;
	}

	const response = await fetch(urlStr, init);

	let responseData: any;
	const contentType = response.headers.get('content-type');
	if (contentType && contentType.includes('application/json')) {
		responseData = await response.json();
	} else {
		responseData = await response.text();
	}

	return {
		data: responseData,
		status: response.status,
		statusText: response.statusText,
		headers: Object.fromEntries(response.headers.entries()),
		config: config as any,
		request: null,
	};
};

// 定义绑定的环境变量
export interface Env {
	VOLC_AK: string;
	VOLC_SK: string;
}

// 统一的跨域头配置，方便 React 前端直接请求
const corsHeaders = {
	'Access-Control-Allow-Origin': '*', // 生产环境建议替换为你的实际域名
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// const vodOpenapiService = new vodOpenapi.VodService();
const vodOpenapiService = vodOpenapi.defaultService;

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// 1. 处理浏览器的 CORS 预检请求 (OPTIONS)
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// 2. 路由：获取临时上传 Token
		if (url.pathname === '/api/vod/upload-token' && request.method === 'GET') {
			try {
				// 配置火山引擎 SDK 的 AK 和 SK (从 Cloudflare 环境变量中读取)
				vodOpenapiService.setAccessKeyId(env.VOLC_AK);
				vodOpenapiService.setSecretKey(env.VOLC_SK);

				// 设置临时上传凭证过期时间，例如 1 小时 (3600000 毫秒)
				const expireTime = 60 * 60 * 1000;

				// 调用 SDK 签发临时 Token
				const token = vodOpenapiService.GetUploadToken(expireTime);

				// 返回标准 JSON 响应
				return new Response(
					JSON.stringify({
						code: 0,
						message: 'success',
						data: { token },
					}),
					{
						status: 200,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			} catch (error: any) {
				// 错误处理
				return new Response(
					JSON.stringify({
						code: 500,
						message: 'Failed to generate token',
						error: error.message,
					}),
					{
						status: 500,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}
		}

		// 3. 路由：获取临时播放 Token
		if (url.pathname === '/api/vod/play-token' && request.method === 'GET') {
			try {
				const vid = url.searchParams.get('Vid') || url.searchParams.get('vid');
				if (!vid) {
					return new Response(
						JSON.stringify({
							code: 400,
							message: 'Missing required parameter: Vid',
						}),
						{
							status: 400,
							headers: { ...corsHeaders, 'Content-Type': 'application/json' },
						},
					);
				}

				vodOpenapiService.setAccessKeyId(env.VOLC_AK);
				vodOpenapiService.setSecretKey(env.VOLC_SK);

				// 设置临时播放凭证过期时间，默认 3600s
				const expireTime = 3600;
				const query: Record<string, any> = { Vid: vid };

				// 提取文档中提到的其他可选参数
				const optionalParams = [
					'FileType',
					'Quality',
					'Definition',
					'Format',
					'Codec',
					'LogoType',
					'Ssl',
					'NeedThumbs',
					'NeedBarrageMask',
					'UnionInfo',
					'DrmExpireTimestamp',
					'HDRDefinition',
					'PlayScene',
				];

				for (const param of optionalParams) {
					const val = url.searchParams.get(param) || url.searchParams.get(param.toLowerCase());
					if (val !== null) {
						query[param] = val;
					}
				}

				const token = vodOpenapiService.GetPlayAuthToken(query, expireTime);

				return new Response(
					JSON.stringify({
						code: 0,
						message: 'success',
						data: { token },
					}),
					{
						status: 200,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			} catch (error: any) {
				return new Response(
					JSON.stringify({
						code: 500,
						message: 'Failed to generate play token',
						error: error.message,
					}),
					{
						status: 500,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}
		}

		// 4. 路由：获取播放地址 (GetPlayInfo)
		if (url.pathname === '/api/vod/play-info' && request.method === 'GET') {
			try {
				const vid = url.searchParams.get('Vid') || url.searchParams.get('vid');
				if (!vid) {
					return new Response(
						JSON.stringify({
							code: 400,
							message: 'Missing required parameter: Vid',
						}),
						{
							status: 400,
							headers: { ...corsHeaders, 'Content-Type': 'application/json' },
						},
					);
				}

				vodOpenapiService.setAccessKeyId(env.VOLC_AK);
				vodOpenapiService.setSecretKey(env.VOLC_SK);

				const options = { Vid: vid };
				// SDK 返回的是 Promise，需要 await
				const res = await vodOpenapiService.GetPlayInfo(options, { adapter: fetchAdapter } as any);

				return new Response(
					JSON.stringify({
						code: 0,
						message: 'success',
						data: res,
					}),
					{
						status: 200,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			} catch (error: any) {
				return new Response(
					JSON.stringify({
						code: 500,
						message: 'Failed to get play info',
						error: error.message,
					}),
					{
						status: 500,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}
		}

		// 5. 路由：签发私有加密 Token (GetPrivateDrmAuthToken)
		if (url.pathname === '/api/vod/private-drm-token' && request.method === 'GET') {
			try {
				const vid = url.searchParams.get('Vid') || url.searchParams.get('vid');
				if (!vid) {
					return new Response(
						JSON.stringify({
							code: 400,
							message: 'Missing required parameter: Vid',
						}),
						{
							status: 400,
							headers: { ...corsHeaders, 'Content-Type': 'application/json' },
						},
					);
				}

				vodOpenapiService.setAccessKeyId(env.VOLC_AK);
				vodOpenapiService.setSecretKey(env.VOLC_SK);

				const expireTime = 3600;
				const query: Record<string, any> = {
					Vid: vid,
					DrmType: url.searchParams.get('DrmType') || url.searchParams.get('drmtype') || 'webdevice',
				};

				const playAuthIds = url.searchParams.get('PlayAuthIds') || url.searchParams.get('playauthids');
				if (playAuthIds) query.PlayAuthIds = playAuthIds;

				const unionInfo = url.searchParams.get('UnionInfo') || url.searchParams.get('unioninfo');
				if (unionInfo) query.UnionInfo = unionInfo;

				const token = vodOpenapiService.GetPrivateDrmAuthToken(query, expireTime);

				return new Response(
					JSON.stringify({
						code: 0,
						message: 'success',
						data: { token },
					}),
					{
						status: 200,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			} catch (error: any) {
				return new Response(
					JSON.stringify({
						code: 500,
						message: 'Failed to generate private DRM token',
						error: error.message,
					}),
					{
						status: 500,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}
		}

		// 6. 404 处理
		return new Response(JSON.stringify({ code: 404, message: 'Not Found' }), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	},
};
