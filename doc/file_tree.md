# File Tree: the_masked_garden

```sh
file_tree --ext ts,tsx,md -r --block-lines-max 10000 ~/own/repo/the_masked_garden
```

> dirs: file count if >10, loc if >5000
> files: tok if >=500
> tags: gitignored, uncommitted, untracked
> refs: imports/exports/types/wikilinks

```
the_masked_garden/ # 9.9k lines = 77ktok = 290KB in 82 files
	Assets/
		Foliage/
		leveltest/
		Player/Player Character/MiiChar/
	claude/SESSION LOGS/
	doc/
		skill/
			table-it.md
		2026-01-31-1645-semantic-sound-tokens.md # ~1.1ktok
		2026-01-31-1650-stable-randomness-impl.md # ~1.4ktok
		2026-01-31-1700-file_tree.md # ~2.3ktok
		2026-01-31-1700-sound-workstation.md # ~850tok
		data-flow.md # ~1.8ktok
		file_tree.md # untracked
		graceful-degradation.md # ~1.9ktok
		stable-randomness.md # ~2.1ktok
		upcoming.md
	game/ # 8.0kloc, 70 files
		public/models/
			foliage/
			player/
		src/ # 8.0kloc, 69 files
			actions/
				gameActions.ts
					imports: ../store, ../store/atoms/gameAtoms, ./playerActions, ../types/game
					exports: setGameState, startGame, pauseGame, resumeGame, endGame, addScore, resetGame
				inputActions.ts
					imports: ../store, ../store/atoms/inputAtoms, ../types/game
					exports: setInputDirection, setInputSource, resetInput
				playerActions.ts
					imports: ../store, ../store/atoms/playerAtoms
					exports: setPlayerPosition, setPlayerVelocity, takeDamage, healPlayer, resetPlayer
			audio/ # 22 files
				effects/ # 19 files
					_graph.ts # ~1.5ktok
						imports: ./_types
						exports: createEffectGraphFactory, EffectGraph
					_registry.ts # ~550tok
						imports: ./_types, ./lowpass, ./highpass, ./bandpass, ./notch, ./eq3band, ./compressor, ./distortion, ./bitcrusher, ./gate, ./tremolo, ./chorus, ./phaser, ./delay, ./reverb, ./pan
						exports: effectsRegistry, effectsList, effectsByCategory, categoryNames, categoryOrder, getEffect, isValidEffectId
						types: EffectId
					_types.ts # ~600tok
						exports: effect_def
						types: SliderControl, ToggleControl, SelectControl, ControlDef, EffectInstance, EffectCategory, EffectDef, EffectDefAny, EffectRegistry, EffectIdOf, ConfigOf
					bandpass.ts
						imports: ./_types
						exports: bandpass
					bitcrusher.ts # ~550tok
						imports: ./_types
						exports: bitcrusher
					chorus.ts # ~650tok
						imports: ./_types
						exports: chorus
					compressor.ts # ~550tok
						imports: ./_types
						exports: compressor
					delay.ts # ~550tok
						imports: ./_types
						exports: delay
					distortion.ts # ~600tok
						imports: ./_types
						exports: distortion
					eq3band.ts # ~550tok
						imports: ./_types
						exports: eq3band
					gate.ts # ~650tok
						imports: ./_types
						exports: gate
					highpass.ts
						imports: ./_types
						exports: highpass
					index.ts
						exports: ...
					lowpass.ts
						imports: ./_types
						exports: lowpass
					notch.ts
						imports: ./_types
						exports: notch
					pan.ts
						imports: ./_types
						exports: pan
					phaser.ts # ~850tok
						imports: ./_types
						exports: phaser
					reverb.ts # ~650tok
						imports: ./_types
						exports: reverb
					tremolo.ts
						imports: ./_types
						exports: tremolo
				index.ts
				presets.ts # ~6.0ktok
					imports: ./sound-engine
					exports: presets, presetsByCategory, getPresetById
					types: SoundPreset
				sound-engine.ts # ~8.4ktok
					exports: soundEngine
					types: OscillatorType, NoiseType, FilterType, LFOTarget, SpatialPosition, ADSREnvelope, LFOConfig, FilterConfig, EffectChainConfig, PlayingSound, LoadedSample
			components/
				GameCanvas.tsx
					imports: react, ../engine/ThreeEngine
					exports: GameCanvas
				GhostPlayers.tsx # ~1.2ktok
					imports: react, @react-three/fiber, three, ../store, ../store/atoms/onlineAtoms
					exports: GhostPlayers
				Ground.tsx
					imports: react, @react-three/rapier, jotai, ../store/atoms/configAtoms, ../types/visualStyles
					exports: Ground
				Icosahedron.tsx
					imports: @react-three/rapier, three
					exports: Icosahedron
				Lighting.tsx
					imports: react, jotai, ../store/atoms/configAtoms, ../types/visualStyles
					exports: Lighting
				ObstacleField.tsx # ~550tok
					imports: react, jotai, ./Icosahedron, ../store/atoms/configAtoms, ../types/visualStyles, ../utils/seededRandom, three
					exports: ObstacleField
				Player.tsx # ~1.1ktok
					imports: react, @react-three/fiber, @react-three/drei, @react-three/rapier, three, ../store, ../store/atoms/inputAtoms, ../store/atoms/gameAtoms, ../store/atoms/playerAtoms, ../store/atoms/configAtoms, ../actions/playerActions, ../actions/gameActions, ../types/visualStyles, ../materials/CapeMaterial
					exports: Player
				PostProcessing.tsx
					imports: react, @react-three/fiber, @react-three/postprocessing, jotai, three, ../store/atoms/configAtoms, ../types/visualStyles
					exports: PostProcessing
			engine/
				ThreeEngine.ts # ~4.6ktok
					imports: three/addons/loaders/GLTFLoader.js, ../store, ../store/atoms/configAtoms, ../types/visualStyles, ../store/atoms/inputAtoms, ../store/atoms/gameAtoms, ../store/atoms/playerAtoms, ../actions/playerActions, ../actions/gameActions, ../particles/ParticleSystem, three
					exports: ThreeEngine
			game/
				GameLoop.ts # ~550tok
					imports: ../store, ../store/atoms/gameAtoms, ../store/atoms/playerAtoms, ../store/atoms/configAtoms
					exports: gameLoop
			input/
				GyroInput.ts # ~700tok
					imports: ../actions/inputActions
					exports: gyroInput
				KeyboardInput.ts
					imports: ../actions/inputActions
					exports: keyboardInput
			materials/
				CapeMaterial.ts # ~1.3ktok
					imports: three
					exports: CapeMaterial
					types: CapeMaterialOptions
			online/
				actorIdentity.ts
					exports: getOrCreateIdentity, deriveColorHue
					types: ActorIdentity
				wsClient.ts # ~950tok
					imports: ../store, ../store/atoms/onlineAtoms, ../store/atoms/playerAtoms, ./actorIdentity
					exports: connectWebSocket
			particles/
				index.ts
					exports: ...
				ParticleSystem.ts # ~1.5ktok
					imports: ./presets, three
					exports: ParticleSystem
				presets.ts
					exports: particlePresets
					types: ParticlePreset
			store/
				atoms/
					configAtoms.ts # ~600tok
						imports: jotai/vanilla, ../../types/visualStyles
						exports: playerSpeedAtom, playerScaleAtom, playerDampingAtom, cameraDistanceAtom, cameraSmoothingAtom, cameraViewAngleAtom, cameraTransitionSpeedAtom, cameraPresetsAtom, cameraPresetsWithPersistAtom, gravityAtom, collisionCooldownAtom, damageAmountAtom, healthEnabledAtom, scoreEnabledAtom, visualStyleAtom, treeColorVariationAtom, groundVibranceAtom, devPanelOpenAtom
						types: CameraPreset
					gameAtoms.ts
						imports: jotai/vanilla, ../../types/game
						exports: gameStateAtom, scoreAtom
					inputAtoms.ts
						imports: jotai/vanilla, ../../types/game
						exports: inputDirectionAtom, inputSourceAtom
					onlineAtoms.ts
						imports: jotai
						exports: playerCountAtom, wsConnectedAtom, myPlayerIdAtom, otherPlayersAtom, lastBuildTimeAtom
						types: PlayerState
					playerAtoms.ts
						imports: jotai/vanilla
						exports: playerPositionAtom, playerVelocityAtom, playerHealthAtom, playerColorHueAtom
						types: Vec3
				index.ts
					imports: jotai/vanilla
					exports: gameStore
			types/
				game.ts
					imports: three
					types: GameState, InputDirection, InputSource, PlayerState, ObstacleData
				visualStyles.ts # ~1.9ktok
					exports: visualStyleConfigs, visualStyleOptions
					types: VisualStyle, VisualStyleConfig
			ui/ # 13 files
				DevPanel.tsx # ~2.5ktok
					imports: react, jotai, react, ../store/atoms/configAtoms, ../types/visualStyles
					exports: DevPanel
				EffectDropdown.tsx # ~1.1ktok
					imports: react, ../audio/effects
					exports: EffectDropdown
				EffectPanel.tsx # ~1.6ktok
					imports: ../audio/effects
					exports: EffectPanel
				GameOverScreen.tsx
					imports: jotai, ../store/atoms/gameAtoms, ../actions/gameActions
					exports: GameOverScreen
				GyroPermission.tsx
					imports: react, ../input/GyroInput, ../utils/device
					exports: GyroPermission
				HealthBar.tsx
					imports: jotai, ../store/atoms/playerAtoms, ../store/atoms/configAtoms
					exports: HealthBar
				Minimap.tsx # ~1.3ktok
					imports: react, ../store, ../store/atoms/playerAtoms, ../store/atoms/onlineAtoms
					exports: Minimap
				PlayerCount.tsx
					imports: jotai, react, ../store/atoms/onlineAtoms
					exports: PlayerCount
				ScoreDisplay.tsx
					imports: jotai, ../store/atoms/gameAtoms, ../store/atoms/configAtoms
					exports: ScoreDisplay
				SoundDebug.tsx # ~8.8ktok
					imports: react, ../audio, ../audio/presets, ./TrackVisualizer, ./EffectPanel, ./EffectDropdown
					exports: SoundDebug
				StartScreen.tsx
					imports: ../actions/gameActions, ../utils/device
					exports: StartScreen
				TrackVisualizer.tsx # ~3.8ktok
					imports: react
					exports: TrackVisualizer, default
				UIOverlay.tsx
					imports: jotai, ../store/atoms/gameAtoms, ./HealthBar, ./ScoreDisplay, ./StartScreen, ./GameOverScreen, ./GyroPermission, ./DevPanel, ./PlayerCount, ./Minimap
					exports: UIOverlay
			utils/
				device.ts
					exports: isMobile, supportsGyro, requiresGyroPermission
				seededRandom.ts
					exports: GAME_SEED, seededRandom, createSeededRandom
			App.tsx
				imports: react, jotai, ./store, ./components/GameCanvas, ./ui/UIOverlay, ./game/GameLoop, ./input/KeyboardInput, ./utils/device, ./online/wsClient, ./ui/SoundDebug
				exports: App
			main.tsx
				imports: ./App, react, react-dom/client
			vite-env.d.ts
		vite.config.ts
			imports: vite, @vitejs/plugin-react
			exports: default
	server/
	CLAUDE.md # ~550tok
	README.md # ~1.2ktok
```

