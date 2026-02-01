/**
 * Sound Presets Library
 *
 * A collection of ready-to-use synthesized sounds organized by category.
 * Each preset demonstrates different synthesis techniques and can be
 * used as building blocks for game audio.
 */

import { soundEngine, type PlayingSound } from './sound-engine.ts'

export interface SoundPreset {
  id: string
  name: string
  category: 'percussion' | 'synth' | 'sfx' | 'ambient' | 'ui' | 'nature'
  description: string
  play: () => PlayingSound | null
}

// ========================
// PERCUSSION PRESETS
// ========================

const kick: SoundPreset = {
  id: 'kick',
  name: 'Kick Drum',
  category: 'percussion',
  description: 'Deep electronic kick with pitch sweep',
  play: () => {
    const sound = soundEngine.playOscillator('sine', 150, {
      gain: 0.6,
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      effects: { lowpass: { frequency: 200 } }
    })
    if (sound && sound.setFrequency) {
      // Pitch envelope
      let freq = 150
      const setFreq = sound.setFrequency
      const interval = setInterval(() => {
        freq *= 0.85
        setFreq(freq)
        if (freq < 40) clearInterval(interval)
      }, 8)
    }
    return sound
  }
}

const snare: SoundPreset = {
  id: 'snare',
  name: 'Snare Drum',
  category: 'percussion',
  description: 'Punchy snare with noise body',
  play: () => {
    // Noise body
    soundEngine.playNoise('white', {
      gain: 0.25,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.15 },
      effects: { highpass: { frequency: 2000 }, bandpass: { frequency: 3000, Q: 1 } }
    })
    // Tonal component
    return soundEngine.playOscillator('triangle', 180, {
      gain: 0.4,
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
    })
  }
}

const hihat: SoundPreset = {
  id: 'hihat',
  name: 'Hi-Hat',
  category: 'percussion',
  description: 'Crisp closed hi-hat',
  play: () => soundEngine.playNoise('white', {
    gain: 0.15,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.03 },
    effects: { highpass: { frequency: 8000, Q: 1 } }
  })
}

const openHihat: SoundPreset = {
  id: 'openHihat',
  name: 'Open Hi-Hat',
  category: 'percussion',
  description: 'Sustained open hi-hat',
  play: () => soundEngine.playNoise('white', {
    gain: 0.12,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0.2, release: 0.2 },
    effects: { highpass: { frequency: 6000 }, bandpass: { frequency: 10000, Q: 0.5 } }
  })
}

const clap: SoundPreset = {
  id: 'clap',
  name: 'Clap',
  category: 'percussion',
  description: 'Electronic hand clap',
  play: () => {
    // Multiple noise bursts for clap texture
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        soundEngine.playNoise('white', {
          gain: 0.15 - i * 0.03,
          envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 },
          effects: { bandpass: { frequency: 1500, Q: 2 } }
        })
      }, i * 10)
    }
    // Main body
    return soundEngine.playNoise('pink', {
      gain: 0.2,
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      effects: { bandpass: { frequency: 1200, Q: 1 }, reverb: { decay: 0.3, wet: 0.2 } }
    })
  }
}

const tom: SoundPreset = {
  id: 'tom',
  name: 'Tom',
  category: 'percussion',
  description: 'Mid-range tom drum',
  play: () => {
    const sound = soundEngine.playOscillator('sine', 120, {
      gain: 0.5,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.15 },
      effects: { lowpass: { frequency: 300 } }
    })
    if (sound && sound.setFrequency) {
      let freq = 120
      const setFreq = sound.setFrequency
      const interval = setInterval(() => {
        freq *= 0.92
        setFreq(freq)
        if (freq < 60) clearInterval(interval)
      }, 10)
    }
    return sound
  }
}

// ========================
// SYNTH PRESETS
// ========================

const bass: SoundPreset = {
  id: 'bass',
  name: 'Sub Bass',
  category: 'synth',
  description: 'Deep sub bass tone',
  play: () => soundEngine.playOscillator('sine', 55, {
    gain: 0.5,
    effects: { lowpass: { frequency: 200 } }
  })
}

const sawLead: SoundPreset = {
  id: 'sawLead',
  name: 'Saw Lead',
  category: 'synth',
  description: 'Classic saw wave lead with filter',
  play: () => soundEngine.playOscillator('sawtooth', 440, {
    gain: 0.25,
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.3 },
    effects: { lowpass: { frequency: 2000, Q: 2 } },
    lfo: { type: 'sine', frequency: 5, depth: 0.1, target: 'frequency' }
  })
}

const squarePad: SoundPreset = {
  id: 'squarePad',
  name: 'Square Pad',
  category: 'synth',
  description: 'Warm square wave pad with slow attack',
  play: () => soundEngine.playOscillator('square', 220, {
    gain: 0.2,
    envelope: { attack: 0.5, decay: 0.3, sustain: 0.6, release: 0.8 },
    effects: { lowpass: { frequency: 800 }, reverb: { decay: 2, wet: 0.4 } }
  })
}

const wobbleBass: SoundPreset = {
  id: 'wobbleBass',
  name: 'Wobble Bass',
  category: 'synth',
  description: 'Dubstep-style wobble bass',
  play: () => soundEngine.playOscillator('sawtooth', 55, {
    gain: 0.4,
    effects: { lowpass: { frequency: 800, Q: 8 } },
    lfo: { type: 'sine', frequency: 2, depth: 0.8, target: 'filter' }
  })
}

const pluck: SoundPreset = {
  id: 'pluck',
  name: 'Pluck',
  category: 'synth',
  description: 'Short plucky synth sound',
  play: () => soundEngine.playOscillator('triangle', 523, {
    gain: 0.35,
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
    effects: { lowpass: { frequency: 3000 } }
  })
}

const strings: SoundPreset = {
  id: 'strings',
  name: 'Strings',
  category: 'synth',
  description: 'Lush string-like pad',
  play: () => {
    // Multiple detuned oscillators for richness
    soundEngine.playOscillator('sawtooth', 220, {
      gain: 0.12,
      detune: -10,
      envelope: { attack: 0.8, decay: 0.3, sustain: 0.7, release: 1 },
      effects: { lowpass: { frequency: 2000 } }
    })
    soundEngine.playOscillator('sawtooth', 220, {
      gain: 0.12,
      detune: 10,
      envelope: { attack: 0.8, decay: 0.3, sustain: 0.7, release: 1 },
      effects: { lowpass: { frequency: 2000 } }
    })
    return soundEngine.playOscillator('sawtooth', 220, {
      gain: 0.12,
      envelope: { attack: 0.8, decay: 0.3, sustain: 0.7, release: 1 },
      effects: { lowpass: { frequency: 2000 }, reverb: { decay: 2, wet: 0.3 } }
    })
  }
}

const organ: SoundPreset = {
  id: 'organ',
  name: 'Organ',
  category: 'synth',
  description: 'Classic organ tone',
  play: () => {
    // Fundamental + harmonics
    soundEngine.playOscillator('sine', 220, { gain: 0.15 })
    soundEngine.playOscillator('sine', 440, { gain: 0.1 })
    soundEngine.playOscillator('sine', 660, { gain: 0.08 })
    return soundEngine.playOscillator('sine', 880, {
      gain: 0.05,
      lfo: { type: 'sine', frequency: 6, depth: 0.05, target: 'gain' }
    })
  }
}

// ========================
// SFX PRESETS
// ========================

const laser: SoundPreset = {
  id: 'laser',
  name: 'Laser',
  category: 'sfx',
  description: 'Sci-fi laser zap',
  play: () => {
    const sound = soundEngine.playOscillator('sawtooth', 2000, {
      gain: 0.2,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
      effects: { lowpass: { frequency: 4000, Q: 10 } }
    })
    if (sound && sound.setFrequency) {
      let freq = 2000
      const setFreq = sound.setFrequency
      const interval = setInterval(() => {
        freq *= 0.93
        setFreq(freq)
        if (freq < 100) clearInterval(interval)
      }, 8)
    }
    return sound
  }
}

const explosion: SoundPreset = {
  id: 'explosion',
  name: 'Explosion',
  category: 'sfx',
  description: 'Deep rumbling explosion',
  play: () => {
    // Low rumble
    soundEngine.playNoise('brown', {
      gain: 0.5,
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.2, release: 0.8 },
      effects: { lowpass: { frequency: 300 } }
    })
    // Mid crack
    return soundEngine.playNoise('white', {
      gain: 0.3,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.05, release: 0.3 },
      effects: { bandpass: { frequency: 800, Q: 1 }, reverb: { decay: 1.5, wet: 0.4 } }
    })
  }
}

const powerUp: SoundPreset = {
  id: 'powerUp',
  name: 'Power Up',
  category: 'sfx',
  description: 'Ascending power-up arpeggio',
  play: () => {
    const notes = [261, 329, 392, 523, 659, 784]
    let lastSound: PlayingSound | null = null
    notes.forEach((freq, i) => {
      setTimeout(() => {
        lastSound = soundEngine.playOscillator('square', freq, {
          gain: 0.15,
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 },
          effects: { lowpass: { frequency: 2000 } }
        })
      }, i * 60)
    })
    return lastSound
  }
}

const powerDown: SoundPreset = {
  id: 'powerDown',
  name: 'Power Down',
  category: 'sfx',
  description: 'Descending power-down sound',
  play: () => {
    const notes = [784, 659, 523, 392, 329, 261]
    let lastSound: PlayingSound | null = null
    notes.forEach((freq, i) => {
      setTimeout(() => {
        lastSound = soundEngine.playOscillator('square', freq, {
          gain: 0.12,
          envelope: { attack: 0.01, decay: 0.08, sustain: 0.2, release: 0.15 },
          effects: { lowpass: { frequency: 1500 } }
        })
      }, i * 80)
    })
    return lastSound
  }
}

const coin: SoundPreset = {
  id: 'coin',
  name: 'Coin',
  category: 'sfx',
  description: 'Classic coin collect sound',
  play: () => {
    soundEngine.playOscillator('square', 987, {
      gain: 0.15,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 }
    })
    setTimeout(() => {
      soundEngine.playOscillator('square', 1318, {
        gain: 0.15,
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
      })
    }, 80)
    return null
  }
}

const hit: SoundPreset = {
  id: 'hit',
  name: 'Hit/Impact',
  category: 'sfx',
  description: 'Impact sound for damage',
  play: () => soundEngine.playNoise('white', {
    gain: 0.35,
    envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
    effects: {
      bandpass: { frequency: 400, Q: 2 },
      distortion: { amount: 20 }
    }
  })
}

const jump: SoundPreset = {
  id: 'jump',
  name: 'Jump',
  category: 'sfx',
  description: 'Bouncy jump sound',
  play: () => {
    const sound = soundEngine.playOscillator('sine', 200, {
      gain: 0.3,
      envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 }
    })
    if (sound && sound.setFrequency) {
      let freq = 200
      const setFreq = sound.setFrequency
      const interval = setInterval(() => {
        freq *= 1.08
        setFreq(freq)
        if (freq > 600) clearInterval(interval)
      }, 10)
    }
    return sound
  }
}

const footstep: SoundPreset = {
  id: 'footstep',
  name: 'Footstep',
  category: 'sfx',
  description: 'Soft footstep sound',
  play: () => soundEngine.playNoise('brown', {
    gain: 0.2,
    envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 },
    effects: { bandpass: { frequency: 200, Q: 2 } }
  })
}

const swoosh: SoundPreset = {
  id: 'swoosh',
  name: 'Swoosh',
  category: 'sfx',
  description: 'Fast movement swoosh',
  play: () => {
    const sound = soundEngine.playNoise('pink', {
      gain: 0.2,
      envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
      effects: { bandpass: { frequency: 2000, Q: 1 } }
    })
    if (sound && sound.setFilterFrequency) {
      let freq = 4000
      const setFilterFreq = sound.setFilterFrequency
      const interval = setInterval(() => {
        freq *= 0.9
        setFilterFreq(freq)
        if (freq < 500) clearInterval(interval)
      }, 10)
    }
    return sound
  }
}

const alarm: SoundPreset = {
  id: 'alarm',
  name: 'Alarm',
  category: 'sfx',
  description: 'Warning alarm beep',
  play: () => soundEngine.playOscillator('square', 880, {
    gain: 0.2,
    lfo: { type: 'square', frequency: 4, depth: 0.5, target: 'gain' },
    effects: { lowpass: { frequency: 3000 } }
  })
}

// ========================
// UI PRESETS
// ========================

const click: SoundPreset = {
  id: 'click',
  name: 'UI Click',
  category: 'ui',
  description: 'Subtle button click',
  play: () => soundEngine.playOscillator('sine', 1200, {
    gain: 0.1,
    envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 }
  })
}

const hover: SoundPreset = {
  id: 'hover',
  name: 'UI Hover',
  category: 'ui',
  description: 'Soft hover feedback',
  play: () => soundEngine.playOscillator('sine', 800, {
    gain: 0.05,
    envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.03 }
  })
}

const success: SoundPreset = {
  id: 'success',
  name: 'Success',
  category: 'ui',
  description: 'Positive confirmation sound',
  play: () => {
    soundEngine.playOscillator('sine', 523, {
      gain: 0.15,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 }
    })
    setTimeout(() => {
      soundEngine.playOscillator('sine', 659, {
        gain: 0.15,
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.25 }
      })
    }, 100)
    return null
  }
}

const error: SoundPreset = {
  id: 'error',
  name: 'Error',
  category: 'ui',
  description: 'Negative error sound',
  play: () => soundEngine.playOscillator('sawtooth', 150, {
    gain: 0.2,
    envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
    effects: { lowpass: { frequency: 400 }, distortion: { amount: 30 } }
  })
}

const notification: SoundPreset = {
  id: 'notification',
  name: 'Notification',
  category: 'ui',
  description: 'Gentle notification chime',
  play: () => {
    soundEngine.playOscillator('sine', 880, {
      gain: 0.1,
      envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.15 }
    })
    setTimeout(() => {
      soundEngine.playOscillator('sine', 1108, {
        gain: 0.08,
        envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 }
      })
    }, 100)
    return null
  }
}

// ========================
// AMBIENT PRESETS
// ========================

const wind: SoundPreset = {
  id: 'wind',
  name: 'Wind',
  category: 'ambient',
  description: 'Gentle wind ambience',
  play: () => soundEngine.playNoise('pink', {
    gain: 0.1,
    effects: { lowpass: { frequency: 400 } },
    lfo: { type: 'sine', frequency: 0.2, depth: 0.3, target: 'gain' }
  })
}

const rain: SoundPreset = {
  id: 'rain',
  name: 'Rain',
  category: 'ambient',
  description: 'Soft rain ambience',
  play: () => soundEngine.playNoise('white', {
    gain: 0.08,
    effects: {
      highpass: { frequency: 1000 },
      lowpass: { frequency: 8000 },
      reverb: { decay: 1, wet: 0.3 }
    }
  })
}

const drone: SoundPreset = {
  id: 'drone',
  name: 'Drone',
  category: 'ambient',
  description: 'Dark atmospheric drone',
  play: () => {
    soundEngine.playOscillator('sine', 55, { gain: 0.15 })
    soundEngine.playOscillator('sine', 82, { gain: 0.1, detune: 5 })
    return soundEngine.playOscillator('sawtooth', 110, {
      gain: 0.05,
      effects: { lowpass: { frequency: 200 }, reverb: { decay: 3, wet: 0.5 } },
      lfo: { type: 'sine', frequency: 0.1, depth: 0.2, target: 'filter' }
    })
  }
}

const shimmer: SoundPreset = {
  id: 'shimmer',
  name: 'Shimmer',
  category: 'ambient',
  description: 'Ethereal shimmer pad',
  play: () => soundEngine.playOscillator('sine', 880, {
    gain: 0.1,
    envelope: { attack: 2, decay: 1, sustain: 0.5, release: 2 },
    effects: {
      highpass: { frequency: 500 },
      reverb: { decay: 4, wet: 0.7 },
      delay: { time: 0.3, feedback: 0.5, wet: 0.4 }
    },
    lfo: { type: 'sine', frequency: 0.5, depth: 0.3, target: 'frequency' }
  })
}

// ========================
// NATURE PRESETS
// ========================

const bird: SoundPreset = {
  id: 'bird',
  name: 'Bird Chirp',
  category: 'nature',
  description: 'Simple bird chirp',
  play: () => {
    const chirp = () => {
      const sound = soundEngine.playOscillator('sine', 2000 + Math.random() * 1000, {
        gain: 0.1,
        envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.03 }
      })
      if (sound && sound.setFrequency) {
        let freq = 2000 + Math.random() * 1000
        const direction = Math.random() > 0.5 ? 1.05 : 0.95
        const setFreq = sound.setFrequency
        const interval = setInterval(() => {
          freq *= direction
          setFreq(freq)
        }, 5)
        setTimeout(() => clearInterval(interval), 50)
      }
      return sound
    }
    chirp()
    setTimeout(chirp, 80)
    return null
  }
}

const water: SoundPreset = {
  id: 'water',
  name: 'Water Drip',
  category: 'nature',
  description: 'Water droplet',
  play: () => {
    const sound = soundEngine.playOscillator('sine', 1500, {
      gain: 0.15,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
      effects: { reverb: { decay: 0.5, wet: 0.6 } }
    })
    if (sound && sound.setFrequency) {
      let freq = 1500
      const setFreq = sound.setFrequency
      const interval = setInterval(() => {
        freq *= 0.9
        setFreq(freq)
        if (freq < 400) clearInterval(interval)
      }, 10)
    }
    return sound
  }
}

const thunder: SoundPreset = {
  id: 'thunder',
  name: 'Thunder',
  category: 'nature',
  description: 'Distant thunder rumble',
  play: () => soundEngine.playNoise('brown', {
    gain: 0.4,
    envelope: { attack: 0.1, decay: 1, sustain: 0.3, release: 1.5 },
    effects: {
      lowpass: { frequency: 200 },
      reverb: { decay: 3, wet: 0.5 }
    },
    lfo: { type: 'sine', frequency: 3, depth: 0.4, target: 'gain' }
  })
}

// ========================
// EXPORT ALL PRESETS
// ========================

export const presets: SoundPreset[] = [
  // Percussion
  kick, snare, hihat, openHihat, clap, tom,
  // Synth
  bass, sawLead, squarePad, wobbleBass, pluck, strings, organ,
  // SFX
  laser, explosion, powerUp, powerDown, coin, hit, jump, footstep, swoosh, alarm,
  // UI
  click, hover, success, error, notification,
  // Ambient
  wind, rain, drone, shimmer,
  // Nature
  bird, water, thunder
]

export const presetsByCategory = {
  percussion: presets.filter(p => p.category === 'percussion'),
  synth: presets.filter(p => p.category === 'synth'),
  sfx: presets.filter(p => p.category === 'sfx'),
  ui: presets.filter(p => p.category === 'ui'),
  ambient: presets.filter(p => p.category === 'ambient'),
  nature: presets.filter(p => p.category === 'nature')
}

export const getPresetById = (id: string): SoundPreset | undefined => {
  return presets.find(p => p.id === id)
}
