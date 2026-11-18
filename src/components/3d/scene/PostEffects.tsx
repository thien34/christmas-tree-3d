import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

/** Hậu kỳ: bloom cho đèn phát sáng + vignette tối viền. */
export const PostEffects = () => (
  // multisampling mặc định đã giảm từ 8 xuống 4 ở bản 3.2; giữ 8 cho viền mịn như trước
  <EffectComposer multisampling={8}>
    <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.1} intensity={1.5} radius={0.6} mipmapBlur />
    <Vignette offset={0.1} darkness={1.1} />
  </EffectComposer>
);
