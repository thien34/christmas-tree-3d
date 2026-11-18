import { toggleDebugMode, useStore } from '../../store';
import { CameraIcon } from './icons';

/** Bật/tắt chế độ debug: hiện khung camera kèm khung xương bàn tay và tên cử chỉ đang nhận được. */
export const DebugButton = () => {
  const active = useStore((s) => s.debugMode);
  const label = active ? 'Hide camera' : 'Show camera (debug)';
  return (
    <button
      type="button"
      className={`icon-button${active ? ' is-active' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={toggleDebugMode}
    >
      <CameraIcon />
    </button>
  );
};
