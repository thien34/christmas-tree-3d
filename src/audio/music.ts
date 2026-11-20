import { SONG, SONG_BEATS, type SongEvent } from './jingleBells';

/*
 * Bộ phát nhạc nền: tự tổng hợp "Jingle Bells" bằng Web Audio (không cần file nhạc).
 * Vì tự lên lịch từng nốt nên biết chính xác lúc nào nốt nào vang lên; đèn trên cây đọc `pulse()` để nháy đúng nhịp.
 */

const TEMPO_BPM = 132;
const BEAT_SECONDS = 60 / TEMPO_BPM;
/** Lên lịch trước chừng này giây; bộ hẹn giờ chạy mỗi SCHEDULE_INTERVAL_MS để nạp tiếp. */
const LOOKAHEAD_SECONDS = 0.2;
const SCHEDULE_INTERVAL_MS = 25;
const MASTER_VOLUME = 0.35;
const FADE_SECONDS = 0.4;
/** Nhịp sáng của đèn tắt dần theo hàm mũ với tốc độ này (càng lớn càng chớp gọn). */
const PULSE_DECAY = 7;
/**
 * Nốt đã trễ quá chừng này thì bỏ qua thay vì phát bù. Tab chạy nền bị trình duyệt hãm bộ hẹn giờ xuống ~1 lần/giây;
 * không bỏ thì lúc quay lại tab, mọi nốt bị trễ sẽ vang lên cùng một lúc.
 */
const LATE_TOLERANCE_SECONDS = 0.05;

/**
 * Kênh nháy đèn: giai điệu chia luân phiên vào MELODY_CHANNELS kênh (mỗi nốt sáng một nhóm đèn, tạo hiệu ứng đuổi
 * nhau), còn bè trầm (phách mạnh) có kênh riêng BASS_CHANNEL cho ngôi sao.
 */
export const MELODY_CHANNELS = 3;
export const BASS_CHANNEL = MELODY_CHANNELS;

const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Biên độ: vọt lên rất nhanh rồi tắt dần theo hàm mũ (kiểu tiếng chuông, tiếng gảy). */
const pluck = (gain: GainNode, time: number, peak: number, decay: number) => {
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(peak, time + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
};

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  noise: AudioBuffer;
  timer: number;
  /** Thời điểm (giờ âm thanh) bắt đầu vòng lặp hiện tại của bài, và nốt kế tiếp cần lên lịch. */
  loopStart: number;
  nextIndex: number;
  /** Các lần nháy đã lên lịch nhưng chưa tới giờ, sắp theo thời gian. */
  pending: { time: number; channel: number }[];
  /** Lần nháy gần nhất đã tới giờ của từng kênh. */
  lastPulse: number[];
}

let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let engine: Engine | null = null;
/**
 * Người dùng đang muốn nghe nhạc hay không. `startMusic` phải chờ trình duyệt mở âm thanh; nếu trong lúc chờ đã bấm
 * tắt (hoặc bấm bật thêm lần nữa) thì dựa vào cờ này để không bật nhạc ngoài ý muốn hay chạy hai bộ phát cùng lúc.
 */
let wanted = false;

/** 1 giây tiếng ồn trắng, dùng chung cho mọi tiếng chuông lắc. */
const createNoise = (context: AudioContext) => {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

const playMelody = (e: Engine, time: number, midi: number, beats: number) => {
  const { ctx: c } = e;
  const freq = midiToHz(midi);
  const gain = c.createGain();
  gain.connect(e.master);
  pluck(gain, time, 0.32, Math.max(0.9, beats * BEAT_SECONDS * 1.6));
  // Tiếng chuông: âm cơ bản + vài hoạ âm cao nhỏ dần
  [
    [1, 1],
    [2, 0.35],
    [3, 0.12],
  ].forEach(([ratio, level]) => {
    const osc = c.createOscillator();
    const partial = c.createGain();
    osc.frequency.value = freq * ratio;
    partial.gain.value = level;
    osc.connect(partial).connect(gain);
    osc.start(time);
    osc.stop(time + 3);
  });
};

const playBass = (e: Engine, time: number, midi: number, beats: number) => {
  const osc = e.ctx.createOscillator();
  const gain = e.ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = midiToHz(midi);
  pluck(gain, time, 0.35, beats * BEAT_SECONDS);
  osc.connect(gain).connect(e.master);
  osc.start(time);
  osc.stop(time + beats * BEAT_SECONDS + 0.1);
};

const playShaker = (e: Engine, time: number, accent: boolean) => {
  const source = e.ctx.createBufferSource();
  const filter = e.ctx.createBiquadFilter();
  const gain = e.ctx.createGain();
  source.buffer = e.noise;
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  pluck(gain, time, accent ? 0.09 : 0.05, 0.07);
  source.connect(filter).connect(gain).connect(e.master);
  source.start(time, Math.random() * 0.9, 0.1);
};

const play = (e: Engine, event: SongEvent, time: number) => {
  if (time < e.ctx.currentTime - LATE_TOLERANCE_SECONDS) return;
  if (event.voice === 'melody') {
    playMelody(e, time, event.midi, event.beats);
    e.pending.push({ time, channel: event.melodyIndex % MELODY_CHANNELS });
  } else if (event.voice === 'bass') {
    playBass(e, time, event.midi, event.beats);
    e.pending.push({ time, channel: BASS_CHANNEL });
  } else {
    playShaker(e, time, event.midi === 1);
  }
};

/** Lên lịch mọi nốt nằm trong khoảng nhìn trước; hết bài thì quay lại từ đầu. */
const schedule = (e: Engine) => {
  const horizon = e.ctx.currentTime + LOOKAHEAD_SECONDS;
  for (;;) {
    const event = SONG[e.nextIndex];
    const time = e.loopStart + event.beat * BEAT_SECONDS;
    if (time > horizon) break;
    play(e, event, time);
    e.nextIndex++;
    if (e.nextIndex === SONG.length) {
      e.nextIndex = 0;
      e.loopStart += SONG_BEATS * BEAT_SECONDS;
    }
  }
};

/** Bắt đầu phát từ đầu bài. Phải gọi trong một thao tác của người dùng (nhấn nút, phím): trình duyệt chặn tự phát nhạc. */
export const startMusic = async () => {
  wanted = true;
  ctx ??= new AudioContext();
  noiseBuffer ??= createNoise(ctx);
  await ctx.resume();
  // Trong lúc chờ đã bị tắt, hoặc một lần bật khác đã chạy xong trước
  if (!wanted || engine) return;

  // Mỗi lần phát dùng một đầu ra riêng: tắt rồi bật lại ngay thì các nốt cũ còn sót vẫn đi ra đầu ra cũ (đang nhỏ dần)
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(MASTER_VOLUME, ctx.currentTime + FADE_SECONDS);
  master.connect(ctx.destination);

  const e: Engine = {
    ctx,
    master,
    noise: noiseBuffer,
    timer: 0,
    loopStart: ctx.currentTime + 0.1,
    nextIndex: 0,
    pending: [],
    lastPulse: Array.from({ length: MELODY_CHANNELS + 1 }, () => -Infinity),
  };
  e.timer = window.setInterval(() => schedule(e), SCHEDULE_INTERVAL_MS);
  schedule(e);
  engine = e;
};

/** Nhỏ dần rồi dừng. */
export const stopMusic = () => {
  wanted = false;
  const e = engine;
  if (!e) return;
  engine = null;
  clearInterval(e.timer);
  const now = e.ctx.currentTime;
  e.master.gain.cancelScheduledValues(now);
  e.master.gain.setValueAtTime(Math.max(e.master.gain.value, 0.0001), now);
  e.master.gain.exponentialRampToValueAtTime(0.0001, now + FADE_SECONDS);
  setTimeout(() => {
    e.master.disconnect();
    // Không phát gì nữa thì cho bộ âm thanh nghỉ, đỡ tốn CPU (bật lại sẽ resume)
    if (!wanted) void e.ctx.suspend();
  }, FADE_SECONDS * 1000 + 100);
};

export const isMusicPlaying = () => engine !== null;

/**
 * Độ sáng 0–1 của kênh `channel` lúc này: bằng 1 đúng lúc một nốt của kênh vang lên rồi tắt dần.
 * Tính theo lúc âm thanh thật sự ra loa (trừ độ trễ đầu ra) để đèn khớp với tai nghe. Trả 0 khi không phát nhạc.
 */
export const pulse = (channel: number) => {
  const e = engine;
  if (!e) return 0;
  const heardNow = e.ctx.currentTime - (e.ctx.outputLatency || e.ctx.baseLatency || 0);
  while (e.pending.length > 0 && e.pending[0].time <= heardNow) {
    const { time, channel: ch } = e.pending.shift()!;
    e.lastPulse[ch] = time;
  }
  return Math.exp(-(heardNow - e.lastPulse[channel]) * PULSE_DECAY);
};
