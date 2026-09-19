import { useAudioPlayer } from 'expo-audio';

/** Short generated tones for in-match feedback. */
export function useMatchSounds() {
  const pointPlayer = useAudioPlayer(require('../../assets/sounds/point.wav'));
  const servePlayer = useAudioPlayer(require('../../assets/sounds/serve.wav'));
  const winPlayer = useAudioPlayer(require('../../assets/sounds/win.wav'));

  // Audio is pure feedback: a released player or a device that refuses playback must never
  // take down the caller (scoring a point, or saving a finished match).
  function replay(player: ReturnType<typeof useAudioPlayer>) {
    try {
      player.seekTo(0);
      player.play();
    } catch (error) {
      console.warn('Could not play match sound', error);
    }
  }

  return {
    playPoint: () => replay(pointPlayer),
    playServeSwitch: () => replay(servePlayer),
    playWin: () => replay(winPlayer),
  };
}
