import TTUploader from 'tt-uploader';
import * as tus from 'tus-js-client';

export interface VideoUploaderOptions {
  file: File;
  onProgress: (percent: number, speedBytesPerSec: number) => void;
  onSuccess: (vid: string, duration?: number) => void;
  onError: (error: string) => void;
}

export interface VideoUploader {
  start: () => Promise<void>;
  abort?: () => void;
}

const fetchStsToken = async () => {
  try {
    const res = await fetch('https://volc-auth.albionbox.com/api/vod/upload-token');
    if (res.ok) {
      const data = await res.json() as any;
      return data.data.token;
    }
  } catch (err) {
    console.warn("Could not fetch token from remote worker, using fallback mock token");
  }
  
  return {
    CurrentTime: new Date().toISOString(),
    ExpiredTime: new Date(Date.now() + 3600000).toISOString(),
    SessionToken: 'mock-session-token',
    AccessKeyID: 'mock-ak',
    SecretAccessKey: 'mock-sk'
  };
};

export function createVolcengineUploader(options: VideoUploaderOptions): VideoUploader {
  return {
    start: async () => {
      try {
        const appId = import.meta.env.VITE_VOLC_APP_ID || '';
        const spaceName = import.meta.env.VITE_VOLC_SPACE_NAME || '';

        if (!appId || !spaceName) {
          throw new Error('Missing Volcengine configuration');
        }

        const stsToken = await fetchStsToken();

        const uploader = new TTUploader({
          userId: 'albion-user-' + Math.floor(Math.random() * 10000),
          appId: Number(appId),
          videoConfig: { spaceName }
        });

        let lastProgressTime = Date.now();
        let lastProgressBytes = 0;
        let currentSpeed = 0;

        await new Promise<void>((resolve, reject) => {
          const fileKey = uploader.addFile({
            file: options.file,
            stsToken: stsToken,
            type: 'video'
          });

          uploader.on('complete', (info: any) => {
            const vid = info.uploadResult?.Vid;
            const duration = info.uploadResult?.SourceInfo?.Duration 
              ? Math.round(info.uploadResult.SourceInfo.Duration) 
              : undefined;
            options.onSuccess(vid, duration);
            resolve();
          });

          uploader.on('error', (info: any) => {
            const errorMessage = info.extra?.message || 'Upload failed';
            options.onError(errorMessage);
            reject(new Error(errorMessage));
          });

          uploader.on('progress', (info: any) => {
            const now = Date.now();
            const currentBytes = (info.percent / 100) * options.file.size;
            const timeDiff = (now - lastProgressTime) / 1000;
            
            if (timeDiff >= 1 || info.percent === 100) {
              if (timeDiff > 0) {
                currentSpeed = (currentBytes - lastProgressBytes) / timeDiff;
              }
              lastProgressTime = now;
              lastProgressBytes = currentBytes;
            }

            options.onProgress(Math.round(info.percent), currentSpeed);
          });

          uploader.start(fileKey);
        });
      } catch (err: any) {
        options.onError(err.message || 'Failed to start Volcengine upload');
        throw err;
      }
    }
  };
}

export function createCloudflareUploader(options: VideoUploaderOptions): VideoUploader {
  let upload: tus.Upload | null = null;

  return {
    start: async () => {
      try {
        const token = localStorage.getItem('albion_box_token') || '';
        
        let lastProgressTime = Date.now();
        let lastProgressBytes = 0;
        let currentSpeed = 0;
        let streamMediaId = '';

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';

        // 1. Manually get the direct upload URL from backend
        const encodeMetadata = (str: string) => btoa(unescape(encodeURIComponent(str)));
        const uploadMetadata = [
          `name ${encodeMetadata(options.file.name)}`,
          `filetype ${btoa(options.file.type || 'video/mp4')}`,
          `maxdurationseconds ${btoa('7200')}`
        ].join(',');

        const res = await fetch(`${apiUrl}/replay/cloudflare-direct-upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Upload-Length': options.file.size.toString(),
            'Upload-Metadata': uploadMetadata,
          }
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Failed to get upload URL: ${errText}`);
        }

        const data = await res.json() as any;
        const uploadUrl = data.uploadUrl;
        streamMediaId = data.streamMediaId;

        if (!uploadUrl) {
          throw new Error('Upload URL not returned from backend');
        }

        // 2. Initialize tus.Upload with the retrieved uploadUrl
        await new Promise<void>((resolve, reject) => {
          upload = new tus.Upload(options.file, {
            uploadUrl,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            chunkSize: 5 * 1024 * 1024, // 5MB
            onError: (error) => {
              options.onError(error.message || 'Upload failed');
              reject(error);
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              const percentage = (bytesUploaded / bytesTotal) * 100;
              
              const now = Date.now();
              const timeDiff = (now - lastProgressTime) / 1000;
              
              if (timeDiff >= 1 || percentage === 100) {
                if (timeDiff > 0) {
                  currentSpeed = (bytesUploaded - lastProgressBytes) / timeDiff;
                }
                lastProgressTime = now;
                lastProgressBytes = bytesUploaded;
              }
              
              options.onProgress(Math.round(percentage), currentSpeed);
            },
            onSuccess: () => {
              options.onSuccess(streamMediaId, undefined);
              resolve();
            }
          });

          // Since we already have the uploadUrl, we can just start
          upload.start();
        });
      } catch (err: any) {
        options.onError(err.message || 'Failed to start Cloudflare upload');
        throw err;
      }
    },
    abort: () => {
      if (upload) {
        upload.abort();
      }
    }
  };
}
