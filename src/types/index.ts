import * as THREE from 'three';

export type SceneState = 'CHAOS' | 'FORMED';

export interface TreeConfig {
  height: number;
  radius: number;
}

export interface CountsConfig {
  foliage: number;
  ornaments: number;
  elements: number;
  lights: number;
  gifts: number;
}

export interface ColorsConfig {
  emerald: string;
  gold: string;
  silver: string;
  red: string;
  white: string;
  warmLight: string;
  lights: string[];
  borders: string[];
  giftColors: string[];
  metallicGiftColors: string[];
}

export interface PhotosConfig {
  body: string[];
}

export interface Config {
  colors: ColorsConfig;
  counts: CountsConfig;
  tree: TreeConfig;
  photos: PhotosConfig;
}

export interface ObjectData {
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  chaosRotation: THREE.Euler;
  rotationSpeed: { x: number; y: number; z: number };
}

export interface PhotoOrnamentData extends ObjectData {
  scale: number;
  weight: number;
  textureIndex: number;
  borderColor: string;
  wobbleOffset: number;
  wobbleSpeed: number;
  baseScale: number;
  zoomScale: number;
}

/** Toạ độ màn hình chuẩn hoá 0–1, gốc ở góc trên bên trái. */
export interface HandPosition {
  x: number;
  y: number;
}

export type FingerCount = 1 | 2 | 3;

export interface ZoomState {
  active: boolean;
  /** Vị trí tay lúc bắt đầu chụm, dùng để chọn ảnh cần phóng to. */
  handPosition?: HandPosition;
}

export interface ChristmasElementData extends ObjectData {
  color: string;
  scale: number;
  shouldSparkle: boolean;
  sparkleOffset: number;
  sparkleSpeed: number;
  sparkleDuration: number;
  sparkleCooldown: number;
  sparkleStartTime: number;
}

export interface FairyLightData {
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  color: string;
  speed: number;
  currentPos: THREE.Vector3;
  timeOffset: number;
}

export interface GiftBoxData extends ObjectData {
  boxColor: string;
  size: number;
  timeOffset: number;
}

// Tree style types
export type TreeStyle = 'classic' | 'tiered' | 'spiral';

// Theme types
export type ThemeType = 'christmas' | 'pink' | 'purple' | 'blue';

export interface ThemeColors {
  primary: string;        // Màu chính (lá cây)
  secondary: string;      // Màu phụ
  accent: string;         // Màu nhấn
  gold: string;           // Màu vàng
  lights: string[];       // Màu đèn
  giftColors: string[];   // Màu hộp quà
  metallicGiftColors: string[];
}

