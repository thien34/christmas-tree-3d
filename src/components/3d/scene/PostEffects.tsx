import { EffectComposer, SelectiveBloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Object3D } from 'three';

/**
 * SelectiveBloom cảnh báo nếu không được đưa đèn nào (đèn dùng để chiếu sáng riêng các vật được chọn).
 * Ở đây vật được chọn là thứ bị loại khỏi bloom nên không cần; đưa một vật giả, không nằm trong cảnh, để tắt cảnh báo.
 */
const UNUSED_LIGHTS = [new Object3D()];

/**
 * Hậu kỳ: bloom cho đèn phát sáng + vignette tối viền.
 * `inverted`: bloom áp lên mọi thứ TRỪ các vật được bọc trong <Select> (ảnh Polaroid), để ảnh không bị loá.
 */
export const PostEffects = () => (
  <EffectComposer>
    <SelectiveBloom
      inverted
      lights={UNUSED_LIGHTS}
      blendFunction={BlendFunction.SCREEN}
      luminanceThreshold={0.5}
      luminanceSmoothing={0.1}
      intensity={1.5}
      radius={0.6}
      mipmapBlur
    />
    <Vignette offset={0.1} darkness={1.1} />
  </EffectComposer>
);
