import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

/** Hậu kỳ: bloom cho đèn phát sáng + vignette tối viền. */
export const PostEffects = () => (
  <EffectComposer>
    <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.1} intensity={1.5} radius={0.6} mipmapBlur />
    <Vignette offset={0.1} darkness={1.1} />
  </EffectComposer>
);
