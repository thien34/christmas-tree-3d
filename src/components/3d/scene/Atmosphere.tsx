import { GradientTexture, Stars } from '@react-three/drei';
import { Snowfall } from './Snowfall';

/** Khung cảnh quanh cây: bầu trời đêm chuyển màu, sao và tuyết rơi. */
export const Atmosphere = () => (
  <>
    {/* Từ đỉnh trời xuống: xanh đêm đậm, sáng dần về phía chân trời, rồi tối lại ở mặt đất */}
    <GradientTexture attach="background" stops={[0, 0.55, 1]} colors={['#070d24', '#1b2a52', '#080c18']} />
    <Stars radius={100} depth={50} count={4000} factor={5} saturation={0.2} fade speed={1} />
    <Snowfall />
  </>
);
