import type { HandPosition } from '../types';

/** Một điểm mốc bàn tay do MediaPipe trả về, toạ độ chuẩn hoá 0–1 theo khung hình camera. */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

/** Index các điểm mốc bàn tay của MediaPipe Hands. */
const LANDMARK = { WRIST: 0, THUMB_TIP: 4, INDEX_MCP: 5, INDEX_TIP: 8, MIDDLE_MCP: 9, PINKY_MCP: 17 } as const;

const distance3D = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
const distance2D = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);

/*
 * Ngưỡng chụm tính theo tỉ lệ (khoảng cách đầu ngón cái – ngón trỏ) / (cỡ lòng bàn tay), nên tay để gần hay xa
 * camera đều như nhau. Dùng hai ngưỡng (hysteresis): phải chụm khá sát mới bắt đầu, nhưng ngón hở ra một chút
 * (do tay run, hoặc model đặt điểm mốc lệch vài pixel) vẫn tính là đang chụm.
 */
const PINCH_ENTER_RATIO = 0.3;
const PINCH_EXIT_RATIO = 0.5;
/** Phải chụm liên tục chừng này mới tính là bắt đầu chụm: tay lướt qua dáng chụm khi đổi cử chỉ không bị nhận nhầm. */
const PINCH_START_MS = 60;
/** Phải hở tay (hoặc mất dấu tay) liên tục chừng này mới tính là thả: vài khung hình nhận diện hụt không làm nhảy ảnh. */
const PINCH_RELEASE_MS = 300;

/** Cỡ lòng bàn tay trên ảnh: lấy cạnh lớn nhất của tam giác cổ tay – gốc ngón trỏ – gốc ngón út, ít đổi khi tay xoay. */
const palmSize = (landmarks: Landmark[]) =>
  Math.max(
    distance2D(landmarks[LANDMARK.WRIST], landmarks[LANDMARK.MIDDLE_MCP]),
    distance2D(landmarks[LANDMARK.INDEX_MCP], landmarks[LANDMARK.PINKY_MCP]),
    1e-6,
  );

/** Tỉ lệ độ mở ngón cái – ngón trỏ so với cỡ bàn tay; null nếu thiếu điểm mốc. */
const pinchRatio = (landmarks: Landmark[]) => {
  if (landmarks.length <= LANDMARK.PINKY_MCP) return null;
  return distance2D(landmarks[LANDMARK.THUMB_TIP], landmarks[LANDMARK.INDEX_TIP]) / palmSize(landmarks);
};

/** Điểm giữa hai đầu ngón, đã lật ngang để khớp với hình ảnh soi gương người dùng nhìn thấy. */
const pinchPoint = (landmarks: Landmark[]): HandPosition => ({
  x: 1 - (landmarks[LANDMARK.THUMB_TIP].x + landmarks[LANDMARK.INDEX_TIP].x) / 2,
  y: (landmarks[LANDMARK.THUMB_TIP].y + landmarks[LANDMARK.INDEX_TIP].y) / 2,
});

/**
 * Theo dõi trạng thái chụm tay qua các khung hình, có hysteresis và chống rung theo thời gian.
 * Trả về hàm nhận điểm mốc của khung hình hiện tại (undefined nếu không thấy tay) và trả về
 * vị trí lúc bắt đầu chụm khi đang chụm, null khi không. Vị trí giữ nguyên suốt lần chụm,
 * nên ảnh được chọn không đổi dù tay hơi xê dịch.
 */
export const createPinchTracker = () => {
  let active: HandPosition | null = null;
  /** Lúc bắt đầu thấy chụm (khi chưa active) hoặc bắt đầu thấy hở tay (khi đang active). */
  let candidateSince: number | null = null;

  return (landmarks: Landmark[] | undefined, now: number): HandPosition | null => {
    const ratio = landmarks ? pinchRatio(landmarks) : null;

    if (active) {
      const released = ratio === null || ratio > PINCH_EXIT_RATIO;
      if (!released) candidateSince = null;
      else {
        candidateSince ??= now;
        if (now - candidateSince >= PINCH_RELEASE_MS) {
          active = null;
          candidateSince = null;
        }
      }
      return active;
    }

    const pinching = ratio !== null && ratio < PINCH_ENTER_RATIO;
    if (!pinching) {
      candidateSince = null;
      return null;
    }
    candidateSince ??= now;
    if (now - candidateSince >= PINCH_START_MS) {
      active = pinchPoint(landmarks!);
      candidateSince = null;
    }
    return active;
  };
};

/* ---------- ✌️ (dự phòng khi MediaPipe không nhận ra "Victory") ---------- */

const WRIST = 0;
/** Khớp giữa (PIP) và đầu ngón của từng ngón. */
const FINGER = {
  index: { pip: 6, tip: 8 },
  middle: { pip: 10, tip: 12 },
  ring: { pip: 14, tip: 16 },
  pinky: { pip: 18, tip: 20 },
} as const;

/**
 * Tỉ lệ (khoảng cách cổ tay → đầu ngón) / (cổ tay → khớp giữa): ngón duỗi thì đầu ngón xa cổ tay hơn hẳn khớp giữa
 * (~1.3–1.5), ngón gập thì đầu ngón quặp về gần lòng bàn tay (< 1). Không phụ thuộc tay đang nghiêng hay xoay.
 */
const fingerReach = (landmarks: Landmark[], { pip, tip }: { pip: number; tip: number }) =>
  distance3D(landmarks[WRIST], landmarks[tip]) / Math.max(distance3D(landmarks[WRIST], landmarks[pip]), 1e-6);

const EXTENDED_REACH = 1.15;
const FOLDED_REACH = 1.0;

/** Ngón trỏ và ngón giữa duỗi, ngón áp út và ngón út gập (ngón cái tuỳ ý). */
export const isVictoryPose = (landmarks: Landmark[]) =>
  landmarks.length > FINGER.pinky.tip &&
  fingerReach(landmarks, FINGER.index) > EXTENDED_REACH &&
  fingerReach(landmarks, FINGER.middle) > EXTENDED_REACH &&
  fingerReach(landmarks, FINGER.ring) < FOLDED_REACH &&
  fingerReach(landmarks, FINGER.pinky) < FOLDED_REACH;
