interface DebugButtonProps {
  active: boolean;
  onClick: () => void;
}

export const DebugButton = ({ active, onClick }: DebugButtonProps) => (
  <button type="button" className={`button button--debug${active ? ' is-active' : ''}`} onClick={onClick}>
    {active ? 'Debug On' : 'Debug'}
  </button>
);
