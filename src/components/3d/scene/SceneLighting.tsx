import { Suspense } from 'react';
import { Environment } from '@react-three/drei';
import { CONFIG } from '../../../constants/config';

/** Ảnh toàn cảnh (preset "city" của drei) nằm sẵn trong `public/`, không phụ thuộc CDN. */
const ENVIRONMENT_MAP = `${import.meta.env.BASE_URL}hdri/potsdamer_platz_1k.hdr`;

/** Đèn chiếu sáng cảnh + bản đồ môi trường cho phản chiếu kim loại. */
export const SceneLighting = () => (
  <>
    {/* Suspense riêng: trong lúc bản đồ môi trường đang tải, phần còn lại của cảnh vẫn hiện bình thường */}
    <Suspense fallback={null}>
      <Environment files={ENVIRONMENT_MAP} background={false} />
    </Suspense>

    {/* Ánh trăng xanh nhạt phủ đều, để vật không đen kịt ở mặt khuất và trong lúc bản đồ môi trường chưa tải xong */}
    <ambientLight intensity={1.2} color="#8fa3d9" />
    <spotLight position={[10, 20, 10]} angle={0.3} penumbra={1} intensity={2} color="#fffaed" />
    <pointLight position={[30, 30, 30]} intensity={100} color={CONFIG.colors.warmLight} />
    <pointLight position={[-30, 10, -30]} intensity={50} color={CONFIG.colors.gold} />
    <pointLight position={[0, -20, 10]} intensity={30} color="#ffffff" />
  </>
);
