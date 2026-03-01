# SPEECHY Project Memory

## Architecture
Electron app : main process (Node) + renderer process (React/Vite). Communication via IPC.
Flux : uiohook-napi shortcut → WebSocket OpenAI Realtime → PCM16 audio → transcript → clipboard+robotjs inject.

## Key Files
- Entry: `src/main/main.ts` — session start/stop, IPC handlers, tray
- Shortcuts: `src/main/globalShortcuts.ts` — uiohook-napi keydown/keyup
- Transcription: `src/main/streamingTranscription.ts` — OpenAI Realtime WebSocket
- Audio capture: `src/renderer/audioCapture.ts` — Web Audio API, ScriptProcessorNode
- Text inject: `src/main/textInjection.ts` — clipboard + robotjs Cmd+V
- Settings: `src/config/settings.ts` — electron-store chiffré
- Settings UI: `src/renderer/settings.html` — HTML standalone (pas React)

## Bugs Fixés
1. **Port Vite** : vite.config.ts utilisait port 5173 mais tout le reste attendait 5174 → changé à 5174 + strictPort: true
2. **OpenAI Realtime API format** : endpoint `?intent=transcription` nécessite `transcription_session.update` (pas `session.update`) et format flat (`input_audio_format`, `input_audio_transcription`) pas la structure imbriquée `audio.input.*`
3. **commitAudioBuffer** : jamais appelé dans stopStreamingSession → audio non transcrit si VAD n'a pas détecté fin. Ajouté avant le timeout de 800ms.
4. **Keymap** : `UiohookKey` importé mais jamais utilisé, keycodes hardcodés incomplets. Remplacé par `UiohookKey.*` pour les lettres/F-keys et `(UiohookKey as any)[n]` pour les chiffres (propriétés numériques).
5. **stealthMode** : défaut `true` → `false` pour voir l'overlay au démarrage
6. **ELECTRON_RUN_AS_NODE=1** : variable d'environnement système désactivait les APIs Electron → ajouté `ELECTRON_RUN_AS_NODE=` dans le script dev:electron pour la désactiver
7. **Electron 28 → 33** : Electron 28 incompatible avec macOS 15 (Darwin 24.6.0) → upgradé à ^33.0.0
8. **window-all-closed type error** : Electron 33 ne passe plus d'Event au handler → supprimé le paramètre `(e: Event)`
9. **NODE_ENV manquant** : windowManager chargeait le fichier build au lieu du dev server → ajouté `NODE_ENV=development` dans le script dev:electron

## OpenAI Realtime Transcription API
- URL: `wss://api.openai.com/v1/realtime?intent=transcription`
- Auth: `Authorization: Bearer sk-...` + `OpenAI-Beta: realtime=v1`
- Init event: `transcription_session.update` avec `input_audio_format: 'pcm16'`, `input_audio_transcription.model`, `turn_detection`, `noise_reduction`
- Audio: `input_audio_buffer.append` avec audio base64 PCM16 24kHz
- Commit: `input_audio_buffer.commit`
- Events reçus: `transcription_session.created`, `transcription_session.updated`, `conversation.item.input_audio_transcription.delta`, `conversation.item.input_audio_transcription.completed`

## Dev Setup
```bash
ELECTRON_RUN_AS_NODE= npm run dev  # IMPORTANT: désactiver ELECTRON_RUN_AS_NODE
```
Electron attend `http://localhost:5174` via wait-on. Vite doit démarrer en premier.

## macOS Prérequis
- **Accessibility permission** : requis pour uiohook-napi (raccourcis globaux)
  → System Settings → Privacy & Security → Accessibility → ajouter Electron.app
- Le code dans main.ts appelle `systemPreferences.isTrustedAccessibilityClient(true)` pour déclencher le prompt macOS

## uiohook-napi Key Names
- Lettres: `UiohookKey.A` ... `UiohookKey.Z`
- Chiffres: `(UiohookKey as any)[0]` ... `(UiohookKey as any)[9]` (propriétés numériques)
- Fonction: `UiohookKey.F1` ... `UiohookKey.F12`
- Espace: `UiohookKey.Space`

## Environnement
- macOS 15 Sequoia / Darwin 24.6.0 / Intel x86_64
- Node.js v24.13.0 (Volta)
- `ELECTRON_RUN_AS_NODE=1` est défini dans le shell → toujours préfixer avec `ELECTRON_RUN_AS_NODE=`
