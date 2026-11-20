/*
 * Điệp khúc "Jingle Bells" (James Lord Pierpont, 1857; đã thuộc phạm vi công cộng), 16 ô nhịp 4/4.
 * Nốt ghi bằng số MIDI (60 = Đô giữa), độ dài tính theo phách (1 = nốt đen).
 */

const C5 = 72;
const D5 = 74;
const E5 = 76;
const F5 = 77;
const G5 = 79;

type Phrase = [midi: number, beats: number][];

const BELLS: Phrase = [
  [E5, 1], [E5, 1], [E5, 2],
  [E5, 1], [E5, 1], [E5, 2],
  [E5, 1], [G5, 1], [C5, 1.5], [D5, 0.5],
  [E5, 4],
];

const MELODY: Phrase = [
  ...BELLS,
  [F5, 1], [F5, 1], [F5, 1.5], [F5, 0.5],
  [F5, 1], [E5, 1], [E5, 1], [E5, 0.5], [E5, 0.5],
  [E5, 1], [D5, 1], [D5, 1], [E5, 1],
  [D5, 2], [G5, 2],
  ...BELLS,
  [F5, 1], [F5, 1], [F5, 1], [F5, 1],
  [F5, 1], [E5, 1], [E5, 1], [E5, 0.5], [E5, 0.5],
  [G5, 1], [G5, 1], [F5, 1], [D5, 1],
  [C5, 4],
];

/** Nốt gốc của hợp âm từng ô nhịp (Đô, Fa, Son) cho bè trầm. */
const C3 = 48;
const F3 = 53;
const G2 = 43;
const BASS_ROOTS = [C3, C3, C3, C3, F3, C3, G2, G2, C3, C3, C3, C3, F3, C3, G2, C3];

export const BEATS_PER_BAR = 4;
export const SONG_BEATS = BASS_ROOTS.length * BEATS_PER_BAR;

export type Voice = 'melody' | 'bass' | 'shaker';

export interface SongEvent {
  /** Vị trí trong bài, tính theo phách. */
  beat: number;
  voice: Voice;
  midi: number;
  beats: number;
  /** Nốt thứ mấy của giai điệu (dùng để chia đèn thành nhóm nháy luân phiên); -1 với bè khác. */
  melodyIndex: number;
}

const melodyEvents = (): SongEvent[] => {
  let beat = 0;
  return MELODY.map(([midi, beats], melodyIndex) => {
    const event: SongEvent = { beat, voice: 'melody', midi, beats, melodyIndex };
    beat += beats;
    return event;
  });
};

/** Bè trầm: nốt gốc ở phách 1, quãng năm ở phách 3 của mỗi ô nhịp. */
const bassEvents = (): SongEvent[] =>
  BASS_ROOTS.flatMap((root, bar) => [
    { beat: bar * BEATS_PER_BAR, voice: 'bass' as const, midi: root, beats: 2, melodyIndex: -1 },
    { beat: bar * BEATS_PER_BAR + 2, voice: 'bass' as const, midi: root + 7, beats: 2, melodyIndex: -1 },
  ]);

/** Tiếng chuông lắc (sleigh bells) đều mỗi nửa phách; `midi` 1 = phách mạnh, 0 = phách nhẹ. */
const shakerEvents = (): SongEvent[] =>
  Array.from({ length: SONG_BEATS * 2 }, (_, i) => ({
    beat: i / 2,
    voice: 'shaker' as const,
    midi: i % 2 === 0 ? 1 : 0,
    beats: 0.5,
    melodyIndex: -1,
  }));

/** Toàn bộ bài, sắp theo thời gian để bộ phát chỉ cần đọc tuần tự. */
export const SONG: readonly SongEvent[] = [...melodyEvents(), ...bassEvents(), ...shakerEvents()].sort(
  (a, b) => a.beat - b.beat,
);
