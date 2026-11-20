import { toggleMusic, useStore } from '../../store';
import { MusicIcon } from './icons';

/** Bật/tắt nhạc Jingle Bells; khi có nhạc, đèn trên cây nháy theo từng nốt. */
export const MusicButton = () => {
  const active = useStore((s) => s.musicOn);
  const label = active ? 'Stop music (M)' : 'Play music (M)';
  return (
    <button
      type="button"
      className={`icon-button${active ? ' is-active' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={toggleMusic}
    >
      <MusicIcon />
    </button>
  );
};
