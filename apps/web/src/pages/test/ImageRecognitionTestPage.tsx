import { useEffect, useState } from 'react';
import { parseKillEventFromImage } from '@albionbox/shared/utils/api_image';
import { useToast } from '@/components/ui/Toast';

const STORAGE_KEY = 'albionbox:test:image_recognition:v1';

function loadStoredInputs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as any;
    return {
      apiKey: typeof parsed?.apiKey === 'string' ? parsed.apiKey : '',
      modelId: typeof parsed?.modelId === 'string' ? parsed.modelId : '',
      imageUrl: typeof parsed?.imageUrl === 'string' ? parsed.imageUrl : '',
      prompt: typeof parsed?.prompt === 'string' ? parsed.prompt : '',
    };
  } catch {
    return null;
  }
}

function saveStoredInputs(v: { apiKey: string; modelId: string; imageUrl: string; prompt: string }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    return;
  }
}

export default function ImageRecognitionTestPage() {
  const toast = useToast();
  const [apiKey, setApiKey] = useState(() => loadStoredInputs()?.apiKey ?? '');
  const [modelId, setModelId] = useState(() => loadStoredInputs()?.modelId ?? '');
  const [imageUrl, setImageUrl] = useState(() => loadStoredInputs()?.imageUrl ?? '');
  const [prompt, setPrompt] = useState(() => loadStoredInputs()?.prompt ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    saveStoredInputs({ apiKey, modelId, imageUrl, prompt });
  }, [apiKey, modelId, imageUrl, prompt]);

  const handleSubmit = async () => {
    const trimmedApiKey = apiKey.trim();
    const trimmedModelId = modelId.trim();
    const trimmedImageUrl = imageUrl.trim();
    const trimmedPrompt = prompt.trim();

    if (!trimmedApiKey) {
      toast.error('请输入 api_key');
      return;
    }
    if (!trimmedModelId) {
      toast.error('请输入模型 ID');
      return;
    }
    if (!trimmedImageUrl) {
      toast.error('请输入图片 URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const parsed = await parseKillEventFromImage(
        trimmedImageUrl,
        trimmedApiKey,
        trimmedModelId,
        trimmedPrompt ? trimmedPrompt : undefined
      );
      setResult(parsed);
      toast.success('识别成功');
    } catch (err: any) {
      const message = err?.message || '识别失败';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">图片识别测试页面 (api_image.ts)</h1>
        <div className="text-sm text-slate-400">
          输入 api_key、模型 ID、图片 URL，调用 Ark 视觉模型解析击杀截图并输出结构化 JSON。
        </div>
      </div>

      <div className="bg-black-card border border-black-border rounded-2xl p-4 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="api_key"
            type="password"
            className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
            autoComplete="off"
          />
          <input
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="模型 ID（ep-xxx）"
            className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
          />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="图片 URL"
            className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
          />
        </div>

        <div>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Prompt（可选）</div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="留空则使用默认 prompt"
            className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50 min-h-28"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-gold hover:bg-gold-hover text-black font-black rounded-xl disabled:opacity-50 uppercase tracking-widest text-[10px]"
          >
            {loading ? '识别中...' : '开始识别'}
          </button>
          {error && <div className="text-rose-400 text-sm">{error}</div>}
        </div>
      </div>

      {imageUrl.trim() && (
        <div className="bg-black-card border border-black-border rounded-2xl p-4 shadow-xl space-y-2">
          <div className="text-sm font-black text-white uppercase tracking-widest">图片预览</div>
          <div className="overflow-auto">
            <img src={imageUrl.trim()} className="max-h-80 rounded-xl border border-black-border" />
          </div>
        </div>
      )}

      <div className="bg-black-card border border-black-border rounded-2xl p-4 shadow-xl space-y-2">
        <div className="text-sm font-black text-white uppercase tracking-widest">识别结果</div>
        <pre className="text-xs bg-black-bg border border-black-border text-emerald-200 p-3 rounded-xl overflow-x-auto min-h-[16rem]">
          {result ? JSON.stringify(result, null, 2) : '暂无结果'}
        </pre>
      </div>
    </div>
  );
}
