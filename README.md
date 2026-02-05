# HeyClaw

Voice companion app for hands-free AI assistant interaction.

## Requirements

### Core
- Hands-free operation - always ready, no touch required
- Works with display off
- Wake word detection - always listening
- Voice recording and transmission
- Async voice response playback - incoming responses play automatically

### Android
- Full background operation
- Wake word detection while app is in background
- Screen off support
- Auto-start on boot
- Async voice responses can be played anytime

### iOS (Workaround)
- Wake word detection requires app to be in foreground (Apple restriction)
- Full voice control while app is open
- Async voice responses can be played while app is open

## Tech Stack
- React Native
- Wake word detection (e.g. Porcupine)
- Async communication (e.g. WebSocket)

## License
MIT
