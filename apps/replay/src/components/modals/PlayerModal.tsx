import React, { useState, useEffect, useRef } from 'react';
import { VideoRecord, Highlight, Comment } from '../../types';
import { X, Play, Pause, Volume2, VolumeX, RefreshCw, Clock, Edit2, Trash2 } from 'lucide-react';
import { syncVideoTime, createHighlight, createComment, deleteHighlight, updateComment, deleteComment, getGlobalHighlights } from '../../lib/api';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../i18n/LanguageContext';

interface PlayerModalProps {
  video: VideoRecord;
  videos?: VideoRecord[];
  onClose: () => void;
  onUpdate: (updated: VideoRecord) => void;
}

export function PlayerModal({ video, videos = [], onClose, onUpdate }: PlayerModalProps) {
  const { t } = useLanguage();
  const [mainVideo, setMainVideo] = useState<VideoRecord>(video);
  const [pipVideo, setPipVideo] = useState<VideoRecord | null>(null);
  
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pipBlobUrl, setPipBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true); // Default to true since we autoplay
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Highlight and Comments State
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [isAddingHighlight, setIsAddingHighlight] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [hoveredHighlightId, setHoveredHighlightId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  
  const [globalHighlights, setGlobalHighlights] = useState<Highlight[]>([]);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTimeStr, setSyncTimeStr] = useState('');
  const [isPovListOpen, setIsPovListOpen] = useState(false);

  // PIP Dragging State
  const [pipPosition, setPipPosition] = useState<{ left: number, top: number } | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, pipX: 0, pipY: 0 });
  const hasDragged = useRef(false);
  const pipContainerRef = useRef<HTMLDivElement>(null);

  // Refs for callbacks to avoid stale closures in keyboard listeners
  const handleSwapPovRef = useRef<() => void>(() => {});
  const togglePlayRef = useRef<() => void>(() => {});
  const startAddingHighlightRef = useRef<() => void>(() => {});

  const currentUsername = localStorage.getItem('albion_bound_account') || 'Anonymous';

  const otherPovs = React.useMemo(() => {
    return videos.filter(v => {
      if (v.id === mainVideo.id) return false;
      
      // If both have absolute time, check for overlap
      if (v.absoluteStartTime !== undefined && mainVideo.absoluteStartTime !== undefined && v.absoluteStartTime !== null && mainVideo.absoluteStartTime !== null) {
        // absoluteStartTime is in milliseconds, duration is in seconds
        const mainStart = Number(mainVideo.absoluteStartTime);
        const mainEnd = mainStart + Number(duration || mainVideo.duration || 1800) * 1000;
        
        const vStart = Number(v.absoluteStartTime);
        const vEnd = vStart + Number(v.duration || 1800) * 1000;
        
        return vStart < mainEnd && vEnd > mainStart;
      }
      
      return false;
    });
  }, [videos, mainVideo, duration]);

  // Sync Volume to video tag
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Load main video blob
  useEffect(() => {
    const load = async () => {
      try {
        if (mainVideo.videoUrl) {
          setBlobUrl(mainVideo.videoUrl);
          setLoading(false);
          return;
        }

        setError(t('player.not_found') || 'Video not found');
        setLoading(false);
      } catch (err) {
        setError('Failed to load video.');
        setLoading(false);
      }
    };
    load();
  }, [mainVideo, t]);

  // Load pip video blob
  useEffect(() => {
    if (!pipVideo) {
      setPipBlobUrl(null);
      return;
    }
    const load = async () => {
      try {
        if (pipVideo.videoUrl) {
          setPipBlobUrl(pipVideo.videoUrl);
        } else {
          setPipBlobUrl(null);
        }
      } catch (err) {
        // ignore
      }
    };
    load();
  }, [pipVideo]);

  // Load global highlights
  useEffect(() => {
    const start = mainVideo.absoluteStartTime;
    if (!start || !duration) return;
    
    const fetchGlobalHighlights = async () => {
      try {
        const end = start + duration * 1000;
        const highlights = await getGlobalHighlights(start, end);
        setGlobalHighlights(highlights.filter(h => h.videoId !== mainVideo.id));
      } catch (err) {
        console.error('Failed to fetch global highlights', err);
      }
    };
    fetchGlobalHighlights();
  }, [mainVideo.absoluteStartTime, duration, mainVideo.id]);

  // Video Events
  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
        if (pipVideoRef.current && pipVideo) pipVideoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        if (pipVideoRef.current && pipVideo) pipVideoRef.current.pause();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      syncPipVideo();
    }
  };

  const syncPipVideo = () => {
    if (!videoRef.current || !pipVideoRef.current || !mainVideo.absoluteStartTime || !pipVideo?.absoluteStartTime) return;
    
    const mainCurrentTime = videoRef.current.currentTime;
    const currentGlobalTime = mainVideo.absoluteStartTime + mainCurrentTime * 1000;
    const pipTargetTime = (currentGlobalTime - pipVideo.absoluteStartTime) / 1000;
    
    // Fallback to pipVideo.duration if the video element hasn't loaded metadata yet
    const pipDur = pipVideoRef.current.duration || pipVideo.duration || 1800;
    
    // Only check bounds if we have a valid duration
    if (pipTargetTime < 0) {
      // Before pip video starts
      pipVideoRef.current.style.opacity = '0.3';
      pipVideoRef.current.currentTime = 0;
      if (!pipVideoRef.current.paused) pipVideoRef.current.pause();
    } else if (!isNaN(pipDur) && pipTargetTime > pipDur) {
      // After pip video ends
      pipVideoRef.current.style.opacity = '0.3';
      pipVideoRef.current.currentTime = pipDur;
      if (!pipVideoRef.current.paused) pipVideoRef.current.pause();
    } else {
      // During pip video
      pipVideoRef.current.style.opacity = '1';
      // Only seek if diff is too large to avoid stuttering
      if (Math.abs(pipVideoRef.current.currentTime - pipTargetTime) > 0.5) {
        pipVideoRef.current.currentTime = pipTargetTime;
      }
      if (!videoRef.current.paused && pipVideoRef.current.paused) {
        pipVideoRef.current.play().catch(() => {});
      } else if (videoRef.current.paused && !pipVideoRef.current.paused) {
        pipVideoRef.current.pause();
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };
  
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayRef.current();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        startAddingHighlightRef.current();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handleSwapPovRef.current();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) {
          const newTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
          seekTo(newTime);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) {
          const newTime = Math.max(0, videoRef.current.currentTime - 10);
          seekTo(newTime);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    seekTo(pos * duration);
  };

  const formatTime = (timeInSecs: number) => {
    if (isNaN(timeInSecs)) return '0:00';
    const m = Math.floor(timeInSecs / 60);
    const s = Math.floor(timeInSecs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getDisplayTime = (timestamp: number) => {
    const rel = formatTime(timestamp);
    if (!mainVideo.absoluteStartTime) return rel;
    const realTime = new Date(mainVideo.absoluteStartTime + timestamp * 1000).toISOString().substring(11, 19);
    return `${realTime} (${rel})`;
  };

  // Highlights Logics
  const startAddingHighlight = () => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
      if (pipVideoRef.current && pipVideo) pipVideoRef.current.pause();
    }
    setIsAddingHighlight(true);
    setActiveHighlight(null);
    setIsSyncing(false);
  };

  const openSync = () => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
      if (pipVideoRef.current && pipVideo) pipVideoRef.current.pause();
    }
    setIsAddingHighlight(false);
    setActiveHighlight(null);
    setIsSyncing(true);

    if (mainVideo.absoluteStartTime) {
      const currentUTC = new Date(mainVideo.absoluteStartTime + currentTime * 1000);
      setSyncTimeStr(currentUTC.toISOString().substring(0, 19));
    } else {
      setSyncTimeStr(`${mainVideo.date}T12:00:00`);
    }
  };

  const handleSwapPov = () => {
    if (!pipVideo || !mainVideo.absoluteStartTime || !pipVideo.absoluteStartTime || !videoRef.current || !pipVideoRef.current) return;
    
    // Remember current global time
    const currentGlobalTime = mainVideo.absoluteStartTime + videoRef.current.currentTime * 1000;
    
    // Swap states
    const newMain = pipVideo;
    const newPip = mainVideo;
    const newMainUrl = pipBlobUrl;
    const newPipUrl = blobUrl;
    
    setMainVideo(newMain);
    setPipVideo(newPip);
    setBlobUrl(newMainUrl);
    setPipBlobUrl(newPipUrl);

    // After state update, we need to set the new main video's currentTime
    // Since React state update is async, we can do it in a useEffect or use a small timeout.
    // Wait, the easiest way is to use setTimeout or handle it after render.
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (videoRef.current && newMain.absoluteStartTime) {
          const targetTime = (currentGlobalTime - newMain.absoluteStartTime) / 1000;
          videoRef.current.currentTime = Math.max(0, targetTime);
        }
      }, 50);
    });
  };

  const handleSyncSubmit = async () => {
    if (!syncTimeStr) return;
    const realTimeMs = new Date(syncTimeStr + 'Z').getTime();
    if (isNaN(realTimeMs)) return;

    const utcStart = realTimeMs - Math.floor(currentTime * 1000);
    try {
      await syncVideoTime(mainVideo.id, { absoluteStartTime: utcStart });
      const updatedVideo = { ...mainVideo, absoluteStartTime: utcStart };
      setMainVideo(updatedVideo);
      onUpdate(updatedVideo);
      setIsSyncing(false);
    } catch (err) {
      console.error('Failed to sync video time', err);
      alert(t('player.syncError') || 'Failed to sync video time');
    }
  };

  const submitHighlight = async () => {
    if (!newCommentText.trim()) return;

    const textContent = newCommentText.trim();
    let updatedVideo = { ...mainVideo };

    try {
      if (isAddingHighlight) {
        const newHighlight = await createHighlight(mainVideo.id, {
          timestamp: Math.floor(currentTime)
        });
        
        const newComment = await createComment(mainVideo.id, newHighlight.id, {
          username: currentUsername,
          content: textContent
        });
        
        newHighlight.comments = [newComment];
        updatedVideo.highlights = [...(updatedVideo.highlights || []), newHighlight].sort((a, b) => a.timestamp - b.timestamp);
        setIsAddingHighlight(false);
        setActiveHighlight(newHighlight);
      } else if (activeHighlight) {
        const highlightIndex = (updatedVideo.highlights || []).findIndex(h => h.id === activeHighlight.id);
        if (highlightIndex >= 0 && updatedVideo.highlights) {
          const newComment = await createComment(mainVideo.id, activeHighlight.id, {
            username: currentUsername,
            content: textContent
          });
          
          updatedVideo.highlights[highlightIndex].comments.push(newComment);
          setActiveHighlight({ ...updatedVideo.highlights[highlightIndex] });
        }
      }
      
      setNewCommentText('');
      setMainVideo(updatedVideo);
      onUpdate(updatedVideo);

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    } catch (err) {
      console.error('Failed to submit highlight or comment', err);
      alert(t('player.saveError') || 'Failed to save. Please try again.');
    }
  };

  const handleDeleteHighlight = async (hl: Highlight) => {
    if (!window.confirm(t('player.deleteHighlight'))) return;
    try {
      await deleteHighlight(hl.id);
      const updatedVideo = { ...mainVideo };
      updatedVideo.highlights = (updatedVideo.highlights || []).filter(h => h.id !== hl.id);
      setMainVideo(updatedVideo);
      onUpdate(updatedVideo);
      setActiveHighlight(null);
    } catch (err) {
      console.error('Failed to delete highlight', err);
      alert(t('player.deleteHighlightError'));
    }
  };

  const handleDeleteComment = async (hl: Highlight, commentId: string) => {
    if (!window.confirm(t('player.deleteComment'))) return;
    try {
      await deleteComment(commentId);
      const updatedVideo = { ...mainVideo };
      const highlightIndex = (updatedVideo.highlights || []).findIndex(h => h.id === hl.id);
      if (highlightIndex >= 0 && updatedVideo.highlights) {
        updatedVideo.highlights[highlightIndex].comments = (updatedVideo.highlights[highlightIndex].comments || []).filter(c => c.id !== commentId);
        
        if (updatedVideo.highlights[highlightIndex].comments.length === 0) {
           updatedVideo.highlights = updatedVideo.highlights.filter(h => h.id !== hl.id);
           setActiveHighlight(null);
        } else {
           setActiveHighlight({ ...updatedVideo.highlights[highlightIndex] });
        }
        setMainVideo(updatedVideo);
        onUpdate(updatedVideo);
      }
    } catch (err) {
      console.error('Failed to delete comment', err);
      alert(t('player.deleteCommentError'));
    }
  };

  const handleUpdateComment = async (hl: Highlight, commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      await updateComment(commentId, { content: editingCommentText.trim() });
      const updatedVideo = { ...mainVideo };
      const highlightIndex = (updatedVideo.highlights || []).findIndex(h => h.id === hl.id);
      if (highlightIndex >= 0 && updatedVideo.highlights) {
        const commentIndex = (updatedVideo.highlights[highlightIndex].comments || []).findIndex(c => c.id === commentId);
        if (commentIndex >= 0) {
          updatedVideo.highlights[highlightIndex].comments[commentIndex].content = editingCommentText.trim();
        }
        setActiveHighlight({ ...updatedVideo.highlights[highlightIndex] });
      }
      setMainVideo(updatedVideo);
      onUpdate(updatedVideo);
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err) {
      console.error('Failed to update comment', err);
      alert(t('player.updateCommentError'));
    }
  };

  useEffect(() => {
    handleSwapPovRef.current = handleSwapPov;
    togglePlayRef.current = togglePlay;
    startAddingHighlightRef.current = startAddingHighlight;
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!pipContainerRef.current || !pipContainerRef.current.parentElement) return;

    const rect = pipContainerRef.current.getBoundingClientRect();
    const parentRect = pipContainerRef.current.parentElement.getBoundingClientRect();

    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      pipX: rect.left - parentRect.left,
      pipY: rect.top - parentRect.top,
    };

    if (!pipPosition) {
      setPipPosition({ left: dragStart.current.pipX, top: dragStart.current.pipY });
    }
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      hasDragged.current = true;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      
      let newLeft = dragStart.current.pipX + dx;
      let newTop = dragStart.current.pipY + dy;

      if (pipContainerRef.current && pipContainerRef.current.parentElement) {
         const parentRect = pipContainerRef.current.parentElement.getBoundingClientRect();
         const rect = pipContainerRef.current.getBoundingClientRect();
         const maxLeft = parentRect.width - rect.width;
         const maxTop = parentRect.height - rect.height;
         
         newLeft = Math.max(0, Math.min(newLeft, maxLeft));
         newTop = Math.max(0, Math.min(newTop, maxTop));
      }

      setPipPosition({
        left: newLeft,
        top: newTop
      });
    };
    
    const handlePointerUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    setPipPosition(null);
  }, [isFullscreen]);

  const displayHighlights = React.useMemo(() => {
    const local = (mainVideo.highlights || []).map(hl => ({ ...hl, isGlobal: false }));
    const global = globalHighlights.map(hl => {
      const relTime = mainVideo.absoluteStartTime && hl.absoluteTime 
        ? (hl.absoluteTime - mainVideo.absoluteStartTime) / 1000 
        : hl.timestamp;
      return { ...hl, timestamp: relTime, isGlobal: true };
    }).filter(hl => hl.timestamp >= 0 && hl.timestamp <= duration);
    return [...local, ...global];
  }, [mainVideo.highlights, globalHighlights, mainVideo.absoluteStartTime, duration]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] bg-system-bg flex items-center justify-center text-system-text">
        <RefreshCw className="w-8 h-8 animate-spin text-system-accent" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="fixed inset-0 z-[60] bg-system-bg flex items-center justify-center text-system-text p-4">
        <div className="bg-system-surface border border-red-500/30 p-6 rounded text-center max-w-sm">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={onClose} className="px-4 py-2 bg-system-border rounded hover:bg-system-surface-hover">{t('player.close')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed z-[60] bg-[rgba(0,0,0,0.85)] flex items-center justify-center",
      isFullscreen ? "inset-0" : "inset-0"
    )}>
      
      {/* Container to match immersive design width (could be large) */}
      <div className={cn(
        "bg-system-surface border border-system-border flex flex-col overflow-hidden relative",
        isFullscreen ? "w-full h-full border-none rounded-none" : "w-[900px] h-[600px] rounded-[12px] shadow-[0_0_50px_rgba(0,0,0,1)]"
      )}>
        
        {/* Main Player Display */}
        <div className="flex-1 min-h-0 bg-black relative flex flex-col">
          <div className="absolute top-[20px] left-[20px] text-white bg-[rgba(0,0,0,0.5)] px-[10px] py-[5px] rounded-[4px] text-[12px] z-10 font-bold pointer-events-none tracking-widest flex items-center gap-2">
            <span>{mainVideo.username} <span className="opacity-50">/</span> {mainVideo.filename}</span>
            {Boolean(mainVideo.absoluteStartTime) && (
              <span className="text-system-accent border-l border-system-dim/50 pl-2 ml-1">
                {t('player.realTime')} {new Date(mainVideo.absoluteStartTime + currentTime * 1000).toISOString().substring(11, 19)}
              </span>
            )}
          </div>

          {!isFullscreen && (
            <button onClick={onClose} className="absolute top-[20px] right-[20px] text-system-dim hover:text-white z-10 bg-black/50 p-1.5 rounded transition-colors group">
              <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* Video Wrapper */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden" onClick={togglePlay}>
            <video
              ref={videoRef}
              src={blobUrl || undefined}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onSeeked={syncPipVideo}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              autoPlay={true}
            />

            {/* PIP Video */}
            {pipVideo && pipBlobUrl && (
              <div 
                ref={pipContainerRef}
                className={cn(
                  "absolute w-[320px] aspect-video bg-black rounded-[8px] overflow-hidden border-[2px] border-system-accent shadow-[0_0_20px_rgba(0,0,0,0.8)] cursor-pointer z-40 hover:scale-105 transition-transform",
                  !pipPosition && (isFullscreen ? "top-[20px] right-[20px]" : "bottom-[20px] right-[20px]")
                )}
                style={pipPosition ? { left: pipPosition.left, top: pipPosition.top, bottom: 'auto', right: 'auto', margin: 0 } : {}}
                onPointerDown={handlePointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasDragged.current) {
                    hasDragged.current = false;
                    return;
                  }
                  handleSwapPov();
                }}
              >
                <div className="absolute top-1 left-2 z-10 text-[10px] font-bold text-white bg-black/50 px-1 rounded pointer-events-none">
                  {pipVideo.username}
                </div>
                <video
                  ref={pipVideoRef}
                  src={pipBlobUrl}
                  className="w-full h-full object-cover pointer-events-none"
                  muted
                  onLoadedMetadata={syncPipVideo}
                  onCanPlay={syncPipVideo}
                />
              </div>
            )}
          </div>

          {/* Comment Hover Popover directly on video */}
          {displayHighlights.map(hl => (
             hoveredHighlightId === hl.id && hl.comments && hl.comments.length > 0 && (
              <div 
                key={`popover-${hl.id}`}
                className={cn(
                  "absolute -translate-x-1/2 w-[240px] bg-system-glass backdrop-blur-[10px] p-[12px] rounded-[8px] border border-system-accent text-[13px] z-[110] pointer-events-none shadow-xl",
                  isFullscreen ? "bottom-[160px]" : "bottom-[50px]",
                  hl.isGlobal && "border-[#3b82f6]"
                )}
                style={{ left: `clamp(120px, ${(hl.timestamp / duration) * 100}%, calc(100% - 120px))` }}
              >
                {hl.isGlobal && (
                  <div className="text-[10px] font-bold text-[#3b82f6] uppercase tracking-wider mb-1">
                    [From: {(hl as any).username || 'Unknown'}]
                  </div>
                )}
                <div className="flex justify-between mb-[8px] border-b border-[rgba(255,255,255,0.1)] pb-[4px]">
                  <span className="font-bold text-white truncate mr-2">@{hl.comments[0]?.username}</span>
                  <span className={cn("font-mono text-[11px] whitespace-nowrap", hl.isGlobal ? "text-[#3b82f6]" : "text-system-accent")}>{getDisplayTime(hl.timestamp)}</span>
                </div>
                <div className="text-[#ccc] leading-[1.4]">
                  {hl.comments[0]?.content}
                </div>
                {hl.comments.length > 1 && (
                  <div className={cn("mt-[8px] pl-[8px] border-l text-[11px] text-system-dim", hl.isGlobal ? "border-[#3b82f6]" : "border-system-accent")}>
                    <strong>@{hl.comments[1]?.username}:</strong> {hl.comments[1]?.content}
                    {hl.comments.length > 2 && ` (+${hl.comments.length - 2} more)`}
                  </div>
                )}
              </div>
            )
          ))}
        </div>

        {/* Player UI Panel bottom */}
        <div className={cn(
          "shrink-0 flex flex-col justify-end z-[50]",
          isFullscreen
             ? "absolute bottom-0 left-0 right-0 h-[180px] p-[40px] bg-gradient-to-t from-[rgba(0,0,0,0.9)] via-[rgba(0,0,0,0.4)] to-transparent pointer-events-none"
             : "relative h-[140px] p-[20px] bg-[#141414] border-t border-system-border"
        )}>
          
          {/* Timeline Container */}
          <div 
            ref={timelineRef}
            className="relative h-[40px] bg-transparent border-none rounded-[4px] mb-[12px] cursor-pointer group pointer-events-auto"
            onClick={handleTimelineClick}
          >
            {/* Progress Base */}
            <div className="absolute left-0 top-[18px] w-full h-[4px] bg-[#333] transition-colors rounded" />
            {/* Progress Fill */}
            <div 
              className="absolute left-0 top-[18px] h-[4px] bg-system-accent transition-all duration-75 rounded"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            
            {/* Highlight Markers */}
            {displayHighlights.map(hl => (
              <div
                key={hl.id}
                className={cn(
                  "absolute top-[14px] w-[12px] h-[12px] rounded-full rounded-br-none rotate-45 cursor-pointer transition-all z-10",
                  activeHighlight?.id === hl.id 
                    ? (hl.isGlobal 
                        ? "bg-[#3b82f6] shadow-[0_0_10px_#3b82f6] outline outline-[1.5px] outline-black scale-125" 
                        : "bg-system-accent shadow-[0_0_10px_#ff9800] outline outline-[1.5px] outline-black scale-125")
                    : (hl.isGlobal 
                        ? "bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.5)] border border-black/50" 
                        : "bg-system-accent shadow-[0_0_10px_rgba(255,152,0,0.5)] border border-black/50")
                )}
                style={{ left: `clamp(0px, calc(${(hl.timestamp / duration) * 100}% - 6px), calc(100% - 12px))` }}
                onMouseEnter={() => setHoveredHighlightId(hl.id)}
                onMouseLeave={() => setHoveredHighlightId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveHighlight(hl);
                  seekTo(hl.timestamp);
                  setIsAddingHighlight(false);
                  setIsSyncing(false);
                }}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center text-system-text text-[14px] pointer-events-auto gap-y-3 gap-x-2">
            <div className="flex items-center gap-[12px] sm:gap-[20px] shrink-0">
              <button onClick={togglePlay} className="hover:text-system-accent transition-colors uppercase font-bold tracking-wider outline-none p-1 whitespace-nowrap text-[12px] sm:text-[14px]">
                {isPlaying ? t('player.pause') : t('player.play')}
              </button>
              
              {/* Volume Slider Group */}
              <div className="flex items-center gap-2 group cursor-pointer">
                <button 
                  onClick={() => setVolume(volume === 0 ? 1 : 0)} 
                  className="hover:text-system-accent transition-colors outline-none p-1 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap"
                >
                  {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div className="w-0 overflow-hidden group-hover:w-[80px] transition-all duration-300 ease-in-out flex items-center">
                  <div className="relative w-[50px] sm:w-[70px] h-1.5 bg-[#444] rounded-full flex items-center">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-system-accent rounded-full pointer-events-none" 
                      style={{ width: `${volume * 100}%` }}
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"
                    />
                  </div>
                </div>
              </div>

              <span className="font-mono text-system-dim tracking-widest text-[10px] sm:text-[12px] whitespace-nowrap">
                <span className="text-white">{formatTime(currentTime)}</span> / {formatTime(duration)}
              </span>
            </div>
            
            <div className="flex items-center gap-[8px] sm:gap-[20px] relative flex-wrap sm:flex-nowrap pb-1 sm:pb-0">
              <div className="relative shrink-0">
                <button 
                  onClick={() => {
                    if (!mainVideo.absoluteStartTime) {
                      alert(t('player.bindTimeFirst'));
                      return;
                    }
                    setIsPovListOpen(!isPovListOpen);
                  }}
                  className="bg-[#222] px-[8px] sm:px-[12px] py-[4px] sm:py-[6px] rounded-[4px] cursor-pointer hover:bg-system-accent hover:text-black transition-colors outline-none text-[10px] sm:text-[12px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="hidden sm:inline">{t('player.multiPov')}</span>
                  <span className="sm:hidden">POV</span>
                </button>
                {isPovListOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-[180px] bg-system-surface border border-system-border rounded shadow-xl z-50 overflow-hidden">
                    {otherPovs.length === 0 ? (
                      <div className="p-3 text-system-dim text-[12px]">{t('player.noOtherPov')}</div>
                    ) : (
                      otherPovs.map(v => (
                        <div 
                          key={v.id}
                          className={cn(
                            "px-3 py-2 text-[12px] font-bold cursor-pointer hover:bg-system-accent hover:text-black transition-colors border-b border-system-border last:border-none",
                            pipVideo?.id === v.id && "bg-system-accent/20 text-system-accent"
                          )}
                          onClick={() => {
                            if (pipVideo?.id === v.id) setPipVideo(null);
                            else setPipVideo(v);
                            setIsPovListOpen(false);
                          }}
                        >
                          {v.username}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button 
                onClick={openSync}
                className="bg-[#222] px-[8px] sm:px-[12px] py-[4px] sm:py-[6px] rounded-[4px] cursor-pointer hover:bg-system-accent hover:text-black transition-colors outline-none text-[10px] sm:text-[12px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t('player.syncTime')}</span>
                <span className="sm:hidden">Sync</span>
              </button>
              <button 
                onClick={startAddingHighlight}
                className="bg-[#222] px-[8px] sm:px-[12px] py-[4px] sm:py-[6px] rounded-[4px] cursor-pointer hover:bg-system-accent hover:text-black transition-colors outline-none text-[10px] sm:text-[12px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0"
              >
                <span className="hidden sm:inline">{t('player.addHighlight')}</span>
                <span className="sm:hidden">+ Mark</span>
              </button>
              <button onClick={toggleFullscreen} className="hover:text-system-accent transition-colors outline-none p-1 uppercase font-bold tracking-wider whitespace-nowrap text-[12px] sm:text-[14px] shrink-0">
                <span className="hidden sm:inline">{t('player.fullScreen')}</span>
                <span className="sm:hidden">FS</span>
              </button>
            </div>
          </div>
        </div>

        {(activeHighlight || isAddingHighlight) && (
          <div className={cn(
             "absolute top-[60px] right-[20px] w-[320px] bg-system-surface rounded-[8px] border border-system-border flex flex-col shadow-2xl z-[120] overflow-hidden max-h-[400px]",
             isFullscreen && "right-[60px]"
          )}>
            <div className="p-[16px] border-b border-system-border flex items-center justify-between bg-[#111]">
              <span className="font-bold text-[13px] text-system-accent uppercase tracking-wider">
                {isAddingHighlight ? t('player.newHighlight') : `${t('player.highlightAt')} ${getDisplayTime(activeHighlight?.timestamp || 0)}`}
              </span>
              <div className="flex items-center gap-2">
                {!isAddingHighlight && activeHighlight?.comments?.[0]?.username === currentUsername && (
                  <button onClick={() => handleDeleteHighlight(activeHighlight)} className="text-system-dim hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => { setActiveHighlight(null); setIsAddingHighlight(false); }} className="text-system-dim hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-[16px] text-[13px] bg-system-surface space-y-4">
               {activeHighlight && activeHighlight.comments?.map((comment, i) => (
                  <div key={comment.id} className={cn(i > 0 && "pl-3 border-l-2 border-system-border ml-1 group")}>
                     <div className="flex justify-between items-center mb-1.5">
                       <span className="font-bold text-white text-[12px] opacity-90">@{comment.username}</span>
                       <div className="flex items-center gap-2">
                         {comment.username === currentUsername && (
                           <div className="hidden group-hover:flex items-center gap-1.5">
                             <button onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.content); }} className="text-system-dim hover:text-system-accent">
                               <Edit2 className="w-3.5 h-3.5" />
                             </button>
                             <button onClick={() => handleDeleteComment(activeHighlight, comment.id)} className="text-system-dim hover:text-red-500">
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                           </div>
                         )}
                         <span className="text-[10px] text-system-dim">{format(new Date(comment.createdAt), 'HH:mm')}</span>
                       </div>
                     </div>
                     {editingCommentId === comment.id ? (
                       <div className="mt-1">
                         <textarea
                           value={editingCommentText}
                           onChange={(e) => setEditingCommentText(e.target.value)}
                           className="w-full bg-system-bg border border-system-border rounded px-2 py-1.5 text-[12px] text-white focus:outline-none focus:border-system-accent resize-none h-[60px]"
                           autoFocus
                         />
                         <div className="flex justify-end gap-2 mt-1">
                          <button onClick={() => setEditingCommentId(null)} className="text-[10px] text-system-dim hover:text-white uppercase">{t('player.cancel')}</button>
                          <button onClick={() => handleUpdateComment(activeHighlight, comment.id)} className="text-[10px] text-system-accent hover:text-system-accent-dark uppercase font-bold">{t('player.save')}</button>
                        </div>
                       </div>
                     ) : (
                       <div className="text-system-text opacity-80 leading-relaxed whitespace-pre-wrap">
                         {comment.content}
                       </div>
                     )}
                  </div>
               ))}
            </div>

            <div className="p-[16px] border-t border-system-border bg-[#111]">
               <textarea
                 value={newCommentText}
                 onChange={(e) => setNewCommentText(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     submitHighlight();
                   }
                 }}
                 className="w-full bg-system-bg border border-system-border rounded px-3 py-3 text-[13px] text-white focus:outline-none focus:border-system-accent resize-none h-[80px] mb-3 font-sans"
                 placeholder={t('player.placeholder')}
                 autoFocus
               />
               <button
                 onClick={submitHighlight}
                 disabled={!newCommentText.trim()}
                 className="w-full bg-system-accent hover:bg-system-accent-dark text-black font-extrabold text-[12px] py-2.5 rounded transition-colors uppercase tracking-widest cursor-pointer disabled:opacity-50"
               >
                 {isAddingHighlight ? t('player.saveHighlight') : t('player.reply')}
               </button>
            </div>
          </div>
        )}

        {isSyncing && (
          <div className={cn(
             "absolute top-[60px] right-[20px] w-[320px] bg-system-surface rounded-[8px] border border-system-border flex flex-col shadow-2xl z-[120] overflow-hidden",
             isFullscreen && "right-[60px]"
          )}>
            <div className="p-[16px] border-b border-system-border flex items-center justify-between bg-[#111]">
              <span className="font-bold text-[13px] text-system-accent uppercase tracking-wider">
                {t('player.syncTitle')}
              </span>
              <button onClick={() => setIsSyncing(false)} className="text-system-dim hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-[16px] text-[13px] bg-system-surface space-y-4">
               <p className="text-system-dim leading-relaxed">{t('player.syncDesc')}</p>
               <input
                 type="datetime-local"
                 value={syncTimeStr}
                 onChange={(e) => setSyncTimeStr(e.target.value)}
                 className="w-full bg-system-bg border border-system-border rounded px-3 py-3 text-[13px] text-white focus:outline-none focus:border-system-accent font-sans"
                 step="1"
                 style={{ colorScheme: 'dark' }}
               />
               <button
                 onClick={handleSyncSubmit}
                 disabled={!syncTimeStr}
                 className="w-full bg-system-accent hover:bg-system-accent-dark text-black font-extrabold text-[12px] py-2.5 rounded transition-colors uppercase tracking-widest cursor-pointer disabled:opacity-50 mt-2"
               >
                 {t('player.syncSave')}
               </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}