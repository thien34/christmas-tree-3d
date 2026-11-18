import { useStore } from '../../store';

export const StatusText = () => {
  const status = useStore((s) => s.status);
  return <div className={`status${status.startsWith('ERROR') ? ' is-error' : ''}`}>{status}</div>;
};
