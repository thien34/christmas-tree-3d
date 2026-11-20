import type { ReactNode } from 'react';

/** Khung chung cho icon nét mảnh 24×24, lấy màu theo chữ của phần tử chứa nó. */
const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

/** Tấm ảnh có dấu cộng: thêm ảnh. */
export const AddPhotoIcon = () => (
  <Icon>
    <path d="M14 4H6a2.5 2.5 0 0 0-2.5 2.5v11A2.5 2.5 0 0 0 6 20h11a2.5 2.5 0 0 0 2.5-2.5V10" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m19.5 15.5-4-4L6 20" />
    <path d="M19 2.5v5M16.5 5h5" />
  </Icon>
);

/** Máy quay: bật/tắt khung xem camera. */
export const CameraIcon = () => (
  <Icon>
    <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
    <path d="m15.5 10.5 6-3.5v10l-6-3.5z" />
  </Icon>
);

/** Nốt nhạc: bật/tắt nhạc nền. */
export const MusicIcon = () => (
  <Icon>
    <path d="M9 18V5.5l11-2.5v12.5" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="15.5" r="2.5" />
  </Icon>
);
