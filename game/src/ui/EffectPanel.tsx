import type { EffectDefAny, ControlDef } from '../audio/effects'

// ============================================================================
// STYLES
// ============================================================================

const S: Record<string, React.CSSProperties> = {
  panel: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.03)',
    cursor: 'pointer',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 500,
  },
  category: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase' as const,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  toggle: {
    width: 32,
    height: 16,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.1)',
    position: 'relative' as const,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  toggleOn: {
    background: 'rgba(78, 205, 196, 0.6)',
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: 2,
    left: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    background: '#fff',
    transition: 'left 0.2s',
  },
  toggleKnobOn: {
    left: 18,
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,100,100,0.6)',
    cursor: 'pointer',
    fontSize: 14,
    padding: '0 4px',
    lineHeight: 1,
  },
  body: {
    padding: '8px',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    width: 60,
    textTransform: 'uppercase' as const,
  },
  slider: {
    width: 80,
    height: 4,
    appearance: 'none' as const,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    outline: 'none',
  },
  value: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    width: 50,
    textAlign: 'right' as const,
  },
  select: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 4,
    color: '#fff',
    fontSize: 10,
    padding: '4px 8px',
    flex: 1,
  },
}

// ============================================================================
// TYPES
// ============================================================================

interface EffectPanelProps {
  def: EffectDefAny
  config: Record<string, unknown>
  enabled: boolean
  onUpdate: (config: Partial<Record<string, unknown>>) => void
  onToggle: (enabled: boolean) => void
  onRemove: () => void
}

// ============================================================================
// HELPERS
// ============================================================================

function formatValue(value: number, control: ControlDef & { type: 'slider' }): string {
  const v = control.scale === 'log' ? String(Math.round(value)) :
            value >= 1000 ? `${(value / 1000).toFixed(1)}k` :
            value >= 100 ? String(Math.round(value)) :
            value >= 10 ? value.toFixed(1) :
            value.toFixed(2)
  return control.unit ? `${v}${control.unit}` : v
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EffectPanel({
  def,
  config,
  enabled,
  onUpdate,
  onToggle,
  onRemove,
}: EffectPanelProps) {
  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={S.name}>{def.name}</span>
          <span style={S.category}>{def.category}</span>
        </div>
        <div style={S.headerRight}>
          <div
            style={{ ...S.toggle, ...(enabled ? S.toggleOn : {}) }}
            onClick={() => onToggle(!enabled)}
          >
            <div style={{ ...S.toggleKnob, ...(enabled ? S.toggleKnobOn : {}) }} />
          </div>
          <button style={S.removeBtn} onClick={onRemove} title="Remove effect">
            x
          </button>
        </div>
      </div>

      {enabled && (
        <div style={S.body}>
          {def.controls.map(control => (
            <div key={control.key} style={S.controlRow}>
              <span style={S.label}>{control.label}</span>

              {control.type === 'slider' && (
                <>
                  <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={config[control.key] as number ?? control.min}
                    onChange={e => onUpdate({ [control.key]: parseFloat(e.target.value) })}
                    style={S.slider}
                  />
                  <span style={S.value}>
                    {formatValue(config[control.key] as number ?? control.min, control)}
                  </span>
                </>
              )}

              {control.type === 'toggle' && (
                <div
                  style={{ ...S.toggle, ...(config[control.key] ? S.toggleOn : {}) }}
                  onClick={() => onUpdate({ [control.key]: !config[control.key] })}
                >
                  <div style={{ ...S.toggleKnob, ...(config[control.key] ? S.toggleKnobOn : {}) }} />
                </div>
              )}

              {control.type === 'select' && (
                <select
                  style={S.select}
                  value={String(config[control.key] ?? control.options[0].value)}
                  onChange={e => onUpdate({ [control.key]: e.target.value })}
                >
                  {control.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
