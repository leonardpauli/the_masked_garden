import { useState, useEffect, useCallback } from 'react'
import { soundEngine, type LoadedSample } from '../audio/SoundEngine'
import { presets, presetsByCategory, type SoundPreset } from '../audio/presets'

interface AssetCategory {
  id: string
  name: string
  icon: string
  assets: AssetItem[]
}

interface AssetItem {
  id: string
  name: string
  type: 'model' | 'texture' | 'audio' | 'preset'
  path?: string
  description?: string
  metadata?: Record<string, string | number>
}

// Known project assets (could be loaded from a manifest in production)
const projectAssets: AssetCategory[] = [
  {
    id: 'models',
    name: '3D Models',
    icon: '📦',
    assets: [
      {
        id: 'player',
        name: 'Player Character',
        type: 'model',
        path: '/models/player.glb',
        description: 'Main player character model',
        metadata: { format: 'GLTF', animated: 'yes' }
      },
      {
        id: 'player-low',
        name: 'Player (Low Poly)',
        type: 'model',
        path: '/Assets/Player/Player Character/player_low.glb',
        description: 'Low poly version for performance',
        metadata: { format: 'GLTF' }
      },
      {
        id: 'player-high',
        name: 'Player (High Poly)',
        type: 'model',
        path: '/Assets/Player/Player Character/player_high.glb',
        description: 'High detail version',
        metadata: { format: 'GLTF' }
      },
      {
        id: 'bunny-bear',
        name: 'Bunny Bear',
        type: 'model',
        path: '/Assets/Player/Player Character/bunnyBear.glb',
        description: 'Alternative character model',
        metadata: { format: 'GLTF' }
      }
    ]
  },
  {
    id: 'levels',
    name: 'Level Data',
    icon: '🗺️',
    assets: [
      {
        id: 'level-test',
        name: 'Test Level',
        type: 'model',
        path: '/Assets/leveltest/Scene.json',
        description: 'Test level scene data',
        metadata: { format: 'JSON' }
      }
    ]
  }
]

export function AssetLibrary({ onClose }: { onClose: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('presets')
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | SoundPreset | null>(null)
  const [loadedSamples, setLoadedSamples] = useState<LoadedSample[]>([])
  const [isPlaying, setIsPlaying] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Refresh loaded samples
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadedSamples(soundEngine.getLoadedSamples())
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Build categories including presets and loaded samples
  const categories = [
    {
      id: 'presets',
      name: 'Sound Presets',
      icon: '🎹',
      count: presets.length
    },
    {
      id: 'samples',
      name: 'Loaded Samples',
      icon: '🎵',
      count: loadedSamples.length
    },
    ...projectAssets.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      count: cat.assets.length
    }))
  ]

  // Get items for current category
  const getCurrentItems = useCallback(() => {
    if (selectedCategory === 'presets') {
      return presets.map(p => ({
        ...p,
        type: 'preset' as const
      }))
    }
    if (selectedCategory === 'samples') {
      return loadedSamples.map(s => ({
        id: s.id,
        name: s.name,
        type: 'audio' as const,
        description: `${s.duration.toFixed(2)}s, ${s.channels}ch, ${s.sampleRate}Hz`,
        metadata: {
          duration: s.duration,
          channels: s.channels,
          sampleRate: s.sampleRate
        }
      }))
    }
    const category = projectAssets.find(c => c.id === selectedCategory)
    return category?.assets || []
  }, [selectedCategory, loadedSamples])

  // Filter items by search
  const filteredItems = getCurrentItems().filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.name.toLowerCase().includes(query) ||
      ('description' in item && item.description?.toLowerCase().includes(query)) ||
      ('category' in item && (item as SoundPreset).category?.toLowerCase().includes(query))
    )
  })

  // Play a preset sound
  const playPreset = useCallback((preset: SoundPreset) => {
    if (isPlaying) {
      soundEngine.stopAll()
    }
    const sound = preset.play()
    if (sound) {
      setIsPlaying(preset.id)
      soundEngine.onSoundEnd(sound.id, () => {
        setIsPlaying(null)
      })
    }
  }, [isPlaying])

  // Play a loaded sample
  const playSample = useCallback((sampleId: string) => {
    if (isPlaying) {
      soundEngine.stopAll()
    }
    const sound = soundEngine.playSample(sampleId, { gain: 0.5 })
    if (sound) {
      setIsPlaying(sampleId)
      soundEngine.onSoundEnd(sound.id, () => {
        setIsPlaying(null)
      })
    }
  }, [isPlaying])

  // Stop all sounds
  const stopAll = useCallback(() => {
    soundEngine.stopAll()
    setIsPlaying(null)
  }, [])

  // Handle sample upload
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return

    for (const file of Array.from(e.target.files)) {
      await soundEngine.loadSample(file)
    }
    setLoadedSamples(soundEngine.getLoadedSamples())
    e.target.value = ''
  }, [])

  // Remove a sample
  const removeSample = useCallback((sampleId: string) => {
    soundEngine.removeSample(sampleId)
    setLoadedSamples(soundEngine.getLoadedSamples())
  }, [])

  return (
    <div className="asset-library">
      <div className="asset-library-header">
        <h2>Asset Library</h2>
        <button className="sound-close-btn" onClick={onClose}>x</button>
      </div>

      <div className="asset-library-content">
        {/* Sidebar - Categories */}
        <div className="asset-sidebar">
          <div className="asset-search">
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="asset-categories">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`asset-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span className="category-icon">{cat.icon}</span>
                <span className="category-name">{cat.name}</span>
                <span className="category-count">{cat.count}</span>
              </button>
            ))}
          </div>

          {selectedCategory === 'samples' && (
            <div className="upload-section">
              <label className="upload-btn">
                + Upload Audio
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Main content - Asset grid */}
        <div className="asset-main">
          {selectedCategory === 'presets' && (
            <div className="preset-categories">
              {Object.entries(presetsByCategory).map(([category, items]) => (
                <div key={category} className="preset-category-section">
                  <h3>{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                  <div className="asset-grid">
                    {items.filter(item => {
                      if (!searchQuery) return true
                      return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             item.description.toLowerCase().includes(searchQuery.toLowerCase())
                    }).map(preset => (
                      <div
                        key={preset.id}
                        className={`asset-card ${isPlaying === preset.id ? 'playing' : ''}`}
                        onClick={() => playPreset(preset)}
                      >
                        <div className="asset-card-icon">
                          {isPlaying === preset.id ? '⏹' : '▶'}
                        </div>
                        <div className="asset-card-info">
                          <div className="asset-card-name">{preset.name}</div>
                          <div className="asset-card-desc">{preset.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedCategory === 'samples' && (
            <div className="asset-grid">
              {filteredItems.length === 0 ? (
                <div className="empty-state">
                  <p>No samples loaded</p>
                  <p className="hint">Upload audio files to add them to the library</p>
                </div>
              ) : (
                filteredItems.map(item => (
                  <div
                    key={item.id}
                    className={`asset-card ${isPlaying === item.id ? 'playing' : ''}`}
                  >
                    <div
                      className="asset-card-icon"
                      onClick={() => playSample(item.id)}
                    >
                      {isPlaying === item.id ? '⏹' : '▶'}
                    </div>
                    <div className="asset-card-info">
                      <div className="asset-card-name">{item.name}</div>
                      <div className="asset-card-desc">{item.description}</div>
                    </div>
                    <button
                      className="asset-card-remove"
                      onClick={() => removeSample(item.id)}
                    >
                      x
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedCategory !== 'presets' && selectedCategory !== 'samples' && (
            <div className="asset-grid">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="asset-card"
                  onClick={() => setSelectedAsset(item)}
                >
                  <div className="asset-card-icon">
                    {item.type === 'model' ? '📦' : item.type === 'texture' ? '🖼️' : '📄'}
                  </div>
                  <div className="asset-card-info">
                    <div className="asset-card-name">{item.name}</div>
                    <div className="asset-card-desc">{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedAsset && 'path' in selectedAsset && (
          <div className="asset-detail">
            <h3>{selectedAsset.name}</h3>
            <p className="asset-detail-desc">{selectedAsset.description}</p>
            <div className="asset-detail-meta">
              <div className="meta-item">
                <span className="meta-label">Path:</span>
                <span className="meta-value">{selectedAsset.path}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Type:</span>
                <span className="meta-value">{selectedAsset.type}</span>
              </div>
              {selectedAsset.metadata && Object.entries(selectedAsset.metadata).map(([key, value]) => (
                <div key={key} className="meta-item">
                  <span className="meta-label">{key}:</span>
                  <span className="meta-value">{String(value)}</span>
                </div>
              ))}
            </div>
            <button className="close-detail" onClick={() => setSelectedAsset(null)}>
              Close
            </button>
          </div>
        )}
      </div>

      {isPlaying && (
        <div className="now-playing-bar">
          <span>Now Playing</span>
          <button onClick={stopAll}>Stop</button>
        </div>
      )}
    </div>
  )
}
