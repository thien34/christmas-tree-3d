import { useStore } from '../../store';

const ERROR_PREFIX = 'ERROR: ';

/** Dòng trạng thái nhỏ ở trên cùng; lỗi thì chấm báo chuyển sang đỏ. */
export const StatusText = () => {
  const status = useStore((s) => s.status);
  const isError = status.startsWith(ERROR_PREFIX);
  return (
    <div className={`status${isError ? ' is-error' : ''}`} role="status">
      {isError ? status.slice(ERROR_PREFIX.length) : status}
    </div>
  );
};
