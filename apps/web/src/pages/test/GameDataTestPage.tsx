import { useState, useEffect } from 'react';
import { GameData } from '@albionbox/shared';
import { useToast } from '@/components/ui/Toast';

export default function GameDataTestPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Test states
  const [testItemId, setTestItemId] = useState<string>('T4_BAG')
  const [testSpellId, setTestSpellId] = useState<string>('1234')
  
  const [itemResult, setItemResult] = useState<any>(null)
  const [spellResult, setSpellResult] = useState<any>(null)
  
  const [stats, setStats] = useState({
    isLoaded: false,
    itemCount: 0,
    spellCount: 0
  })

  const handleLoad = async () => {
    setLoading(true)
    setError(null)
    try {
      await GameData.loadGameData()
      updateStats()
    } catch (err: any) {
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const updateStats = () => {
    setStats({
      isLoaded: GameData.isLoaded(),
      itemCount: GameData.getAllItems().length,
      spellCount: GameData.getAllSpells().length
    })
  }

  const handleTestItem = () => {
    if (!GameData.isLoaded()) {
      toast.error('请先加载数据');
      return;
    }
    
    let found: any = undefined;
    
    // Check if input is a number (Index) or string (UniqueName)
    const isNumber = !isNaN(Number(testItemId)) && testItemId.trim() !== '';
    
    if (isNumber) {
      found = GameData.getItem(Number(testItemId));
    }
    
    if (!found) {
      found = GameData.getItemByUniqueName(testItemId);
    }
    
    if (found) {
      setItemResult({
        ...found,
        _displayName: GameData.getItemName(found.Index)
      })
    } else {
      setItemResult('未找到物品')
    }
  }

  const handleTestSpell = () => {
    if (!GameData.isLoaded()) {
      toast.error('请先加载数据');
      return;
    }
    const allSpells = GameData.getAllSpells()
    const found = allSpells.find(s => s.Index.toString() === testSpellId || s.UniqueName === testSpellId)
    
    if (found) {
      setSpellResult({
        ...found,
        _displayName: GameData.getSpellName(found.Index)
      })
    } else {
      setSpellResult('未找到技能')
    }
  }

  useEffect(() => {
    updateStats()
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">游戏数据测试页面 (GameData)</h1>
        
        <div className="bg-white p-4 rounded shadow space-y-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleLoad}
              disabled={loading || stats.isLoaded}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {loading ? '加载中...' : stats.isLoaded ? '已加载' : '加载游戏数据'}
            </button>
            <span className="text-gray-600">
              状态: {stats.isLoaded ? '已加载' : '未加载'} | 
              物品数: {stats.itemCount} | 
              技能数: {stats.spellCount}
            </span>
          </div>
          {error && <div className="text-red-600">{error}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Item Test */}
        <div className="bg-white p-4 rounded shadow space-y-4">
          <h2 className="text-lg font-bold">测试 getItem / getItemName</h2>
          <div className="flex space-x-2">
            <input 
              value={testItemId}
              onChange={e => setTestItemId(e.target.value)}
              placeholder="输入 Index 或 UniqueName"
              className="border p-2 rounded flex-1"
            />
            <button 
              onClick={handleTestItem}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              查询物品
            </button>
          </div>
          <pre className="bg-gray-100 p-2 rounded overflow-auto h-64 text-sm">
            {itemResult ? JSON.stringify(itemResult, null, 2) : '暂无结果'}
          </pre>
        </div>

        {/* Spell Test */}
        <div className="bg-white p-4 rounded shadow space-y-4">
          <h2 className="text-lg font-bold">测试 getSpell / getSpellName</h2>
          <div className="flex space-x-2">
            <input 
              value={testSpellId}
              onChange={e => setTestSpellId(e.target.value)}
              placeholder="输入 Index 或 UniqueName"
              className="border p-2 rounded flex-1"
            />
            <button 
              onClick={handleTestSpell}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              查询技能
            </button>
          </div>
          <pre className="bg-gray-100 p-2 rounded overflow-auto h-64 text-sm">
            {spellResult ? JSON.stringify(spellResult, null, 2) : '暂无结果'}
          </pre>
        </div>
      </div>
    </div>
  )
}
