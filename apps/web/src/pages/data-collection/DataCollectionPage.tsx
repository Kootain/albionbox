import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { Play, Square, Wifi, WifiOff } from 'lucide-react';
import GuildMightRankingTab from './tabs/GuildMightRankingTab';

type CollectionState = {
  [challengeType: string]: {
    guildId: string;
    collectedAt: string;
    players: Record<string, number>;
  };
};

export default function DataCollectionPage() {
  const { t } = useTranslation();
  const { success, error } = useToast();
  
  const [activeTab, setActiveTab] = useState('guild_might_ranking');
  const [wsUrl, setWsUrl] = useState('ws://127.0.0.1:8081/events');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const [collectionData, setCollectionData] = useState<CollectionState>({});
  const [isUploading, setIsUploading] = useState(false);

  const connectWs = () => {
    if (wsRef.current) return;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        success('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const json = JSON.parse(event.data);
          if (json.Type === 2 && json.Code === 445) {
            const payload = json.Payload || json;
            const { GuildID, ChallengeType, Usernames, Mights, Ts } = payload;
            
            if (Array.isArray(Usernames) && Array.isArray(Mights)) {
              setCollectionData(prev => {
                const newPlayers = { ...(prev[ChallengeType]?.players || {}) };
                
                Usernames.forEach((username, idx) => {
                  newPlayers[username] = Mights[idx];
                });
                
                let collectedAt = new Date().toISOString();
                if (Ts) {
                  const tsNum = typeof Ts === 'string' && !isNaN(Number(Ts)) ? Number(Ts) : Ts;
                  collectedAt = new Date(tsNum).toISOString();
                }

                return {
                  ...prev,
                  [ChallengeType]: {
                    guildId: GuildID || prev[ChallengeType]?.guildId || '',
                    collectedAt,
                    players: newPlayers
                  }
                };
              });
            }
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
      };
      
      ws.onerror = () => {
        error('WebSocket connection error');
        ws.close();
      };
      
      wsRef.current = ws;
    } catch (err) {
      error('Failed to create WebSocket connection');
    }
  };

  const disconnectWs = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      disconnectWs();
    };
  }, []);

  const handleUpload = async () => {
    const challengeTypes = Object.keys(collectionData);
    if (challengeTypes.length === 0) {
      error('No data to upload');
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    
    for (const challengeType of challengeTypes) {
      const group = collectionData[challengeType];
      if (!group.guildId) {
        error(`Missing GuildID for ${challengeType}`);
        continue;
      }
      
      const dataArray = Object.entries(group.players).map(([username, might]) => ({
        [username]: might
      }));
      
      try {
        const res = await api.rankings[':guildId'].rankings.$post({
          param: { guildId: group.guildId },
          json: {
            guildId: group.guildId,
            rankingType: challengeType as any,
            collectedAt: group.collectedAt,
            data: dataArray
          }
        });
        
        if (res.ok) {
          successCount++;
        } else {
          const errData = await res.json();
          error(`Failed to upload ${challengeType}: ${errData.error || 'Unknown error'}`);
        }
      } catch (err) {
        console.error(err);
        error(`Failed to upload ${challengeType}`);
      }
    }
    
    setIsUploading(false);
    if (successCount > 0) {
      success(`Successfully uploaded ${successCount} challenge types`);
      // Optionally clear data after successful upload
      // setCollectionData({});
    }
  };

  const handleClear = () => {
    setCollectionData({});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{t('common.data_collection')}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('common.data_collection')} Page
          </p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-4 border-b border-black-border">
        <button
          onClick={() => setActiveTab('guild_might_ranking')}
          className={`pb-4 text-sm font-medium transition-colors relative ${
            activeTab === 'guild_might_ranking' 
              ? 'text-indigo-400' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          {t('common.guild_might_ranking')}
          {activeTab === 'guild_might_ranking' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
          )}
        </button>
      </div>

      <div className="bg-black-card border border-black-border rounded-xl p-6 space-y-6">
        {/* WebSocket Connection Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-slate-300">{t('common.websocket_url')}</label>
            <div className="relative">
              <input 
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                disabled={isConnected}
                className="w-full bg-black-bg border border-black-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isConnected ? (
                  <Wifi className="w-5 h-5 text-emerald-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-slate-500" />
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {!isConnected ? (
              <button
                onClick={connectWs}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                {isConnected ? t('common.connecting') : t('common.connect')}
              </button>
            ) : (
              <button
                onClick={disconnectWs}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Square className="w-4 h-4" />
                {t('common.disconnect')}
              </button>
            )}
          </div>
        </div>

        {/* Tab Content Section */}
        {activeTab === 'guild_might_ranking' && (
          <GuildMightRankingTab
            collectionData={collectionData}
            isUploading={isUploading}
            onUpload={handleUpload}
            onClear={handleClear}
          />
        )}
      </div>
    </div>
  );
}
