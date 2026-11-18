import { Sparkles, Stars } from '@react-three/drei';
import { CONFIG } from '../../../constants/config';

/** Nền trời: màu nền, sao và bụi lấp lánh. */
export const Atmosphere = () => (
  <>
    <color attach="background" args={['#000300']} />
    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    <Sparkles count={600} scale={50} size={8} speed={0.4} opacity={0.4} color={CONFIG.colors.silver} />
  </>
);
