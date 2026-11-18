import { EffectComposer, SelectiveBloom, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { Object3D } from 'three';

/**
 * SelectiveBloom cảnh báo nếu không được đưa đèn nào (đèn dùng để chiếu sáng riêng các vật được chọn).
 * Ở đây vật được chọn là thứ bị loại khỏi bloom nên không cần; đưa một vật giả, không nằm trong cảnh, để tắt cảnh báo.
 */
const UNUSED_LIGHTS = [new Object3D()];

/**
 * Hậu kỳ: bloom cho đèn phát sáng, vignette tối viền, rồi tone mapping.
 * - Bloom chỉ bắt những thứ thật sự phát sáng (đèn, ngôi sao, quả cầu lúc lấp lánh), không phủ cả cây.
 *   `inverted`: áp lên mọi thứ TRỪ các vật được bọc trong <Select> (ảnh Polaroid), để ảnh không bị loá.
 * - Tone mapping nén vùng quá sáng lại thay vì để cháy trắng; kiểu NEUTRAL giữ nguyên màu ở vùng sáng vừa phải.
 */
export const PostEffects = () => (
  <EffectComposer>
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
  </EffectComposer>
);
