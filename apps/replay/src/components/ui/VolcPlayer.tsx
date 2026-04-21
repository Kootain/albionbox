import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import VePlayer from '@volcengine/veplayer';
import '@volcengine/veplayer/index.min.css';

// Configure License
const licenseUrl = import.meta.env.VITE_VEPLAYER_LICENSE_URL;
if (typeof VePlayer.setLicenseConfig === 'function' && licenseUrl) {
  VePlayer.setLicenseConfig({ license: licenseUrl });
}

export interface VolcPlayerProps {
  src: string;
  volume?: number;
  muted?: boolean;
  controls?: boolean;
  autoplay?: boolean;
  disableKeyboard?: boolean;
  onTimeUpdate?: () => void;
  onLoadedMetaData?: () => void;
  onCanPlay?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onSeeked?: () => void;
  onWaiting?: () => void;
  onPlaying?: () => void;
  className?: string;
}

export interface VolcPlayerRef {
  play: () => void;
  pause: () => void;
  currentTime: number;
  duration: number;
  paused: boolean;
  volume: number;
  muted: boolean;
  readyState: number;
}

const VolcPlayer = forwardRef<VolcPlayerRef, VolcPlayerProps>((props, ref) => {
  const {
    src,
    volume,
    muted = false,
    controls = true,
    autoplay = false,
    disableKeyboard,
    onTimeUpdate,
    onLoadedMetaData,
    onCanPlay,
    onPlay,
    onPause,
    onEnded,
    onSeeked,
    onWaiting,
    onPlaying,
    className,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const playerSdkRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!src) return;

    // Initialize player
    const ignores = ['sdkUnmutePlugin'];
    if (disableKeyboard) {
      ignores.push('keyboard', 'mobile', 'pc');
    }

    const playerSdk = new VePlayer({
      root: containerRef.current,
      url: src,
      volume,
      muted,
      autoplayMuted: muted, // Enforce muted autoplay
      autoplay,
      controls,
      width: '100%',
      height: '100%',
      ignores,
      vodLogOpts: {
        line_app_id: 123456, // Placeholder or required dummy value
        line_user_id: 'unknown',
        tag: 'web_player',
      }
    });

    playerSdkRef.current = playerSdk;

    // Event handlers
    const handleTimeUpdate = () => onTimeUpdate?.();
    const handleLoadedMetaData = () => onLoadedMetaData?.();
    const handleCanPlay = () => onCanPlay?.();
    const handlePlay = () => onPlay?.();
    const handlePause = () => onPause?.();
    const handleEnded = () => onEnded?.();
    const handleSeeked = () => onSeeked?.();
    const handleWaiting = () => onWaiting?.();
    const handlePlaying = () => onPlaying?.();

    playerSdk.on('timeupdate', handleTimeUpdate);
    playerSdk.on('loadedmetadata', handleLoadedMetaData);
    playerSdk.on('canplay', handleCanPlay);
    playerSdk.on('play', handlePlay);
    playerSdk.on('pause', handlePause);
    playerSdk.on('ended', handleEnded);
    playerSdk.on('seeked', handleSeeked);
    playerSdk.on('waiting', handleWaiting);
    playerSdk.on('playing', handlePlaying);
    
    // Force muted state to override localStorage cache from VePlayer
    playerSdk.on('ready', () => {
      if (playerSdk.player) {
        if (muted) {
          playerSdk.player.muted = true;
          playerSdk.player.volume = 0;
        }
      }
    });

    return () => {
      // Destroy player instance
      playerSdk.destroy();
      playerSdkRef.current = null;
    };
  }, [src]);

  // Sync muted prop if changed after init
  useEffect(() => {
    if (playerSdkRef.current && playerSdkRef.current.player) {
      if (playerSdkRef.current.player.muted !== muted) {
        playerSdkRef.current.player.muted = muted;
      }
    }
  }, [muted]);

  // Sync volume prop if changed after init
  useEffect(() => {
    if (playerSdkRef.current && playerSdkRef.current.player && volume !== undefined) {
      if (playerSdkRef.current.player.volume !== volume) {
        playerSdkRef.current.player.volume = volume;
      }
    }
  }, [volume]);

  useImperativeHandle(ref, () => ({
    play: () => playerSdkRef.current?.player?.play(),
    pause: () => playerSdkRef.current?.player?.pause(),
    get currentTime() {
      return playerSdkRef.current?.player?.currentTime || 0;
    },
    set currentTime(value: number) {
      if (playerSdkRef.current?.player) {
        playerSdkRef.current.player.currentTime = value;
      }
    },
    get duration() {
      return playerSdkRef.current?.player?.duration || 0;
    },
    get paused() {
      return playerSdkRef.current?.player ? playerSdkRef.current.player.paused : true;
    },
    get volume() {
      return playerSdkRef.current?.player?.volume || 0;
    },
    set volume(value: number) {
      if (playerSdkRef.current?.player) {
        playerSdkRef.current.player.volume = value;
      }
    },
    get muted() {
      return playerSdkRef.current?.player?.muted || false;
    },
    set muted(value: boolean) {
      if (playerSdkRef.current?.player) {
        playerSdkRef.current.player.muted = value;
      }
    },
    get readyState() {
      return playerSdkRef.current?.player?.readyState || 0;
    }
  }));

  return (
    <div 
      className={className} 
      ref={containerRef} 
    />
  );
});

VolcPlayer.displayName = 'VolcPlayer';

export default VolcPlayer;
