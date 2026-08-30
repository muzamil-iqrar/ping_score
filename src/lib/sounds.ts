import { useAudioPlayer } from 'expo-audio';

/** Short generated tones for in-match feedback. */
export function useMatchSounds() {
  const pointPlayer = useAudioPlayer(require('../../assets/sounds/point.wav'));
  const servePlayer = useAudioPlayer(require('../../assets/sounds/serve.wav'));
  const winPlayer = useAudioPlayer(require('../../assets/sounds/win.wav'));

  function replay(player: ReturnType<typeof useAudioPlayer>) {
    player.seekTo(0);
    player.play();
  }

  return {
    playPoint: () => replay(pointPlayer),
    playServeSwitch: () => replay(servePlayer),
    playWin: () => replay(winPlayer),
  };
}
