import { toggleDebugMode, useStore } from '../../store';

export const DebugButton = () => {
  const active = useStore((s) => s.debugMode);
  return (
    <button type="button" className={`button button--debug${active ? ' is-active' : ''}`} onClick={toggleDebugMode}>
      {active ? 'Debug On' : 'Debug'}
    </button>
  );
};
