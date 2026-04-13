import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseApiError(data: unknown, fallback = 'An error occurred'): string {
  if (!data || typeof data !== 'object') return fallback;
  
  const errData = data as Record<string, unknown>;
  
  // 1. Directly a string error
  if (typeof errData.error === 'string') {
    return errData.error;
  }
  
  // 2. Hono zValidator error (ZodError)
  if (errData.error && typeof errData.error === 'object' && errData.error !== null) {
    const errorObj = errData.error as Record<string, unknown>;
    if (errorObj.name === 'ZodError' && typeof errorObj.message === 'string') {
      try {
        const parsed = JSON.parse(errorObj.message);
        if (Array.isArray(parsed)) {
          return parsed.map((err: { message: string }) => err.message).join('; ');
        }
      } catch {
        return errorObj.message;
      }
    }
    
    // 3. Object with a message property
    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }
  
  // 4. Message at the root
  if (typeof errData.message === 'string') {
    return errData.message;
  }
  
  return fallback;
}

export function formatFame(fame: number | undefined | null): string {
  if (fame == null || isNaN(fame)) return '0';
  
  if (fame >= 1_000_000) {
    return (fame / 1_000_000).toFixed(2) + 'm';
  } else if (fame >= 1_000) {
    return (fame / 1_000).toFixed(2) + 'k';
  }
  return fame.toString();
}

export function getAlbionItemUrl(type: string | undefined | null, count = 1, quality = 1): string {
  if (!type) return '';
  // Use custom domain for items, add count/quality params only if greater than 1
  let url = `https://img.albionbox.com/v1/item/${type}.png`;
  const params = [];
  if (count > 1) params.push(`count=${count}`);
  if (quality > 1) params.push(`quality=${quality}`);
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  return url;
}
