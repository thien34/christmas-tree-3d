interface StatusTextProps {
  status: string;
}

export const StatusText = ({ status }: StatusTextProps) => (
  <div className={`status${status.startsWith('ERROR') ? ' is-error' : ''}`}>{status}</div>
);
