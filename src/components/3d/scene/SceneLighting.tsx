import { Environment } from '@react-three/drei';
import { CONFIG } from '../../../constants/config';

/** Đèn chiếu sáng cảnh + bản đồ môi trường cho phản chiếu kim loại. */
export const SceneLighting = () => (
  <>
    <Environment preset="city" background={false} />

    <ambientLight intensity={0.5} color="#003311" />
    <ambientLight intensity={0.3} color="#666688" />
    <spotLight position={[10, 20, 10]} angle={0.3} penumbra={1} intensity={2} color="#fffaed" />
    <pointLight position={[30, 30, 30]} intensity={100} color={CONFIG.colors.warmLight} />
    <pointLight position={[-30, 10, -30]} intensity={50} color={CONFIG.colors.gold} />
    <pointLight position={[0, -20, 10]} intensity={30} color="#ffffff" />
  </>
);
