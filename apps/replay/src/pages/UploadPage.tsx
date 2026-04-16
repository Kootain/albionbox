import { useState, useRef } from 'react'
import TTUploader from 'tt-uploader'
import { Card, Button, Alert, PageHeader } from '../components/ui'
import { Upload as UploadIcon, Video, AlertCircle, CheckCircle2, X } from 'lucide-react'

export function UploadPage() {
  const appId = import.meta.env.VITE_VOLC_APP_ID || ''
  const spaceName = import.meta.env.VITE_VOLC_SPACE_NAME || ''
  const [file, setFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadResult, setUploadResult] = useState<any>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploaderRef = useRef<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setUploadStatus('idle')
      setProgress(0)
      setErrorMessage('')
      setUploadResult(null)
    }
  }

  const fetchStsToken = async () => {
    // In a real environment, this should fetch from your backend
    try {
      const res = await fetch('https://volc-auth-worker.kootain.workers.dev/api/vod/upload-token')
      if (res.ok) {
        const data = (await res.json()) as any
        return data.data.token
      }
    } catch (err) {
      console.warn("Could not fetch token from remote worker, using fallback mock token")
    }
    
    // Fallback dummy token for UI testing
    return {
      CurrentTime: new Date().toISOString(),
      ExpiredTime: new Date(Date.now() + 3600000).toISOString(),
      SessionToken: 'mock-session-token',
      AccessKeyID: 'mock-ak',
      SecretAccessKey: 'mock-sk'
    }
  }

  const startUpload = async () => {
    if (!file) return
    if (!appId || !spaceName) {
      setErrorMessage('Please provide App ID and Space Name')
      return
    }

    setUploadStatus('uploading')
    setProgress(0)
    setErrorMessage('')

    try {
      const stsToken = await fetchStsToken()

      // Initialize uploader
      const uploader = new TTUploader({
        userId: 'albion-user-' + Math.floor(Math.random() * 10000),
        appId: Number(appId),
        videoConfig: {
          spaceName: spaceName
        }
      })

      uploaderRef.current = uploader

      // Add file
      const fileKey = uploader.addFile({
        file: file,
        stsToken: stsToken,
        type: 'video'
      })

      // Listeners
      uploader.on('complete', (info: any) => {
        console.log('Upload complete', info.uploadResult)
        setUploadStatus('success')
        setUploadResult(info.uploadResult)
      })

      uploader.on('error', (info: any) => {
        console.error('Upload error', info.extra)
        setUploadStatus('error')
        setErrorMessage(info.extra?.message || 'Upload failed')
      })

      uploader.on('progress', (info: any) => {
        setProgress(Math.round(info.percent))
      })

      // Start
      uploader.start(fileKey)

    } catch (err: any) {
      setUploadStatus('error')
      setErrorMessage(err.message || 'Failed to initialize upload')
    }
  }

  const cancelUpload = () => {
    if (uploaderRef.current) {
      uploaderRef.current.cancel()
      setUploadStatus('idle')
      setProgress(0)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader 
        title="Upload Video" 
        subtitle="Upload your Albion Online replay videos to the cloud." 
      />

      <div className="max-w-2xl">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">Video File</h2>
            
            <div 
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors
                ${file ? 'border-gold/50 bg-gold/5' : 'border-black-border hover:border-slate-600 bg-black-bg'}
              `}
              onClick={() => !file && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="video/*" 
                className="hidden" 
              />
              
              {file ? (
                <div className="w-full">
                  <div className="flex items-center justify-between bg-black-card p-4 rounded-lg border border-black-border mb-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center shrink-0">
                        <Video className="w-5 h-5 text-gold" />
                      </div>
                      <div className="truncate text-left">
                        <p className="font-bold text-white text-sm truncate">{file.name}</p>
                        <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        setUploadStatus('idle')
                      }}
                      className="p-2 hover:bg-black-border rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                      disabled={uploadStatus === 'uploading'}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {uploadStatus === 'uploading' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-400">
                        <span>UPLOADING...</span>
                        <span className="text-gold">{progress}%</span>
                      </div>
                      <div className="h-2 bg-black-bg rounded-full overflow-hidden border border-black-border">
                        <div 
                          className="h-full bg-gold transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {uploadStatus === 'success' && (
                    <Alert type="success">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-bold">Upload successful!</span>
                      </div>
                      {uploadResult?.Vid && (
                        <p className="mt-2 text-xs opacity-80 break-all">VID: {uploadResult.Vid}</p>
                      )}
                    </Alert>
                  )}

                  {uploadStatus === 'error' && (
                    <Alert type="error">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-bold">Upload failed</span>
                      </div>
                      <p className="mt-1 text-xs opacity-80">{errorMessage}</p>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="cursor-pointer">
                  <div className="w-16 h-16 bg-black-card rounded-full flex items-center justify-center mx-auto mb-4 border border-black-border shadow-lg">
                    <UploadIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="font-bold text-white mb-1">Click to select video</p>
                  <p className="text-sm text-slate-500">MP4, MOV, WEBM up to 2GB</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              {uploadStatus === 'uploading' ? (
                <Button variant="danger" onClick={cancelUpload}>
                  Cancel Upload
                </Button>
              ) : (
                <Button 
                  onClick={startUpload} 
                  disabled={!file || uploadStatus === 'success'}
                  className="w-full sm:w-auto"
                >
                  <UploadIcon className="w-4 h-4 mr-2" />
                  {uploadStatus === 'success' ? 'Uploaded' : 'Start Upload'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
