import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DepthOfField, EffectComposer, Noise, SelectiveBloom, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, type DepthOfFieldEffect, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useStore } from '../../../store';

/**
 * SelectiveBloom cảnh báo nếu không được đưa đèn nào (đèn dùng để chiếu sáng riêng các vật được chọn).
 * Ở đây vật được chọn là thứ bị loại khỏi bloom nên không cần; đưa một vật giả, không nằm trong cảnh, để tắt cảnh báo.
 */
const UNUSED_LIGHTS = [new THREE.Object3D()];

/** Ảnh phóng to nằm cách camera chừng này (khớp ZOOM.distance trong PhotoOrnaments): giữ nét ở đó, xoá mờ phần còn lại. */
const PHOTO_FOCUS = { distance: 25, range: 7 };
/** Độ nhoè hậu cảnh khi đang phóng to ảnh, và tốc độ chuyển. */
const ZOOM_BLUR = 4;
const BLUR_SPEED = 5;

/**
 * Hậu kỳ: làm mờ hậu cảnh khi xem ảnh, bloom cho đèn phát sáng, vignette tối viền, tone mapping, rồi chút hạt nhiễu.
 * - Bloom chỉ bắt những thứ thật sự phát sáng (đèn, ngôi sao, quả cầu lúc lấp lánh), không phủ cả cây.
 *   `inverted`: áp lên mọi thứ TRỪ các vật được bọc trong <Select> (ảnh Polaroid), để ảnh không bị loá.
 * - Tone mapping nén vùng quá sáng lại thay vì để cháy trắng; kiểu NEUTRAL giữ nguyên màu ở vùng sáng vừa phải.
 * - Hạt nhiễu rất nhẹ phá các dải sọc màu (banding) ở những vùng chuyển màu tối của bầu trời và nền tuyết.
 */
export const PostEffects = () => {
  const dofRef = useRef<DepthOfFieldEffect>(null);

  useFrame((_, delta) => {
    const dof = dofRef.current;
    if (!dof) return;
    const { pinch, photoUrls } = useStore.getState();
    const target = pinch && photoUrls.length > 0 ? ZOOM_BLUR : 0;
    dof.bokehScale = THREE.MathUtils.damp(dof.bokehScale, target, BLUR_SPEED, delta);
  });

  return (
    <EffectComposer>
      <DepthOfField
        ref={dofRef}
        focusDistance={PHOTO_FOCUS.distance}
        focusRange={PHOTO_FOCUS.range}
        bokehScale={0}
      />
      <SelectiveBloom
        inverted
        lights={UNUSED_LIGHTS}
        blendFunction={BlendFunction.SCREEN}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.3}
        intensity={0.7}
        radius={0.65}
        mipmapBlur
      />
      <Vignette offset={0.25} darkness={0.75} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Noise premultiply={false} blendFunction={BlendFunction.SCREEN} opacity={0.012} />
    </EffectComposer>
  );
};
