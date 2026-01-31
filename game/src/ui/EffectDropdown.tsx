import { useState, useRef, useEffect } from 'react'
import {
  effectsByCategory,
  categoryNames,
  categoryOrder,
  type EffectId,
} from '../audio/effects'

// ============================================================================
// STYLES
// ============================================================================

const S: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  button: {
    padding: '6px 12px',
    background: 'rgba(78, 205, 196, 0.2)',
    color: '#4ecdc4',
    border: '1px solid rgba(78, 205, 196, 0.3)',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
    width: '100%',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 100,
    maxHeight: 300,
    overflow: 'auto',
  },
  category: {
    padding: '6px 10px',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    background: 'rgba(0,0,0,0.2)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  item: {
    padding: '8px 12px',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemHover: {
    background: 'rgba(78, 205, 196, 0.1)',
  },
  itemDesc: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    marginLeft: 8,
    flex: 1,
    textAlign: 'right' as const,
  },
}

// ============================================================================
// TYPES
// ============================================================================

interface EffectDropdownProps {
  onAdd: (effectId: EffectId) => void
  disabledEffects?: EffectId[]
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EffectDropdown({ onAdd, disabledEffects = [] }: EffectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const handleSelect = (effectId: EffectId) => {
    onAdd(effectId)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} style={S.container}>
      <button style={S.button} onClick={() => setIsOpen(!isOpen)}>
        + Add Effect
      </button>

      {isOpen && (
        <div style={S.dropdown}>
          {categoryOrder.map(category => {
            const effects = effectsByCategory[category]
            if (!effects || effects.length === 0) return null

            return (
              <div key={category}>
                <div style={S.category}>{categoryNames[category]}</div>
                {effects.map(effect => {
                  const isDisabled = disabledEffects.includes(effect.id as EffectId)
                  return (
                    <div
                      key={effect.id}
                      style={{
                        ...S.item,
                        ...(hoveredItem === effect.id && !isDisabled ? S.itemHover : {}),
                        ...(isDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
                      }}
                      onMouseEnter={() => setHoveredItem(effect.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => !isDisabled && handleSelect(effect.id as EffectId)}
                    >
                      <span>{effect.name}</span>
                      <span style={S.itemDesc}>{effect.description}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
