import { Stars } from '@react-three/drei';
import { Aurora } from './Aurora';
import { DistantHills } from './DistantHills';
import { Moon } from './Moon';
import { ShootingStars } from './ShootingStars';
import { SkyDome } from './SkyDome';
import { SnowBokeh } from './SnowBokeh';
import { Snowfall } from './Snowfall';

/**
 * Khung cảnh quanh cây, từ xa vào gần: bầu trời chuyển màu theo theme, sao, trăng, cực quang, sao băng,
 * dãy núi và rừng thông xa (che bớt sao ở chân trời), tuyết rơi, và vài bông tuyết sát ống kính.
 * Sao nằm xa hơn vòng núi để núi che được sao.
 */
export const Atmosphere = () => (
  <>
    <SkyDome />
    <Stars radius={215} depth={60} count={4000} factor={9} saturation={0.2} fade speed={1} />
    <Moon />
    <Aurora />
    <ShootingStars />
    <DistantHills />
    <Snowfall />
    <SnowBokeh />
  </>
);
