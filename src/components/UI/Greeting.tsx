import { useEffect, type CSSProperties } from 'react';
import { useStore } from '../../store';

/** Tên dài quá thì cắt bớt để không tràn màn hình. */
const MAX_NAME_LENGTH = 32;
const TITLE = 'Merry Christmas';

/**
 * Tên người nhận lấy từ đường link, ví dụ `?to=Lan`; không có thì null.
 * Cắt theo ký tự thật (Array.from) để không xé đôi emoji hay chữ có dấu tổ hợp.
 */
const readRecipient = () => {
  try {
    const raw = new URLSearchParams(window.location.search).get('to');
    const name = raw?.replace(/\s+/g, ' ').trim();
    return name ? Array.from(name).slice(0, MAX_NAME_LENGTH).join('') : null;
  } catch {
    return null;
  }
};

const RECIPIENT = readRecipient();

/** Mỗi chữ cái một span để hiện lần lượt từng chữ (độ trễ theo thứ tự, xem .greeting__letter trong CSS). */
const Letters = ({ text, offset = 0 }: { text: string; offset?: number }) =>
  Array.from(text).map((char, i) => (
    <span key={i} className="greeting__letter" style={{ '--i': i + offset } as CSSProperties}>
      {char === ' ' ? ' ' : char}
    </span>
  ));

/**
 * Lời chúc hiện lên khi cây thành hình: "Merry Christmas," và tên người nhận ở dòng dưới.
 * Ẩn khi cây tán loạn hoặc khi đang phóng to ảnh (để không che ảnh). Tên do React hiển thị dưới dạng chữ thường,
 * nên link có chứa mã HTML cũng không chạy được.
 */
export const Greeting = () => {
  const visible = useStore((s) => s.sceneState === 'FORMED' && !s.pinch);

  useEffect(() => {
    if (RECIPIENT) document.title = `${TITLE}, ${RECIPIENT}!`;
  }, []);

  const titleLength = Array.from(TITLE).length;
  return (
    <div className={`greeting${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
      <div className="greeting__title">
        <Letters text={RECIPIENT ? `${TITLE},` : TITLE} />
      </div>
      {RECIPIENT && (
        <div className="greeting__name">
          <Letters text={RECIPIENT} offset={titleLength + 2} />
        </div>
      )}
    </div>
  );
};
