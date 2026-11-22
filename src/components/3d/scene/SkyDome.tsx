import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fadeColor, THEMES } from '../../../constants/themes';
import { useStore } from '../../../store';

/*
 * Bầu trời: quả cầu rất lớn nhìn từ bên trong, tô gradient theo hướng nhìn lên/xuống:
 * xanh đêm đậm ở đỉnh trời, sáng dần về chân trời, tối lại phía dưới. Màu theo theme, đổi theme thì chuyển mượt.
 * Thay cho background tĩnh vì background không nội suy màu được.
 */

const RADIUS = 450;

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  varying vec3 vDir;

  void main() {
    float y = normalize(vDir).y;
    vec3 color = y > 0.0
      ? mix(uHorizon, uTop, smoothstep(0.0, 0.55, y))
      : mix(uHorizon, uBottom, smoothstep(0.0, 0.25, -y));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export const SkyDome = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => {
    const [top, horizon, bottom] = THEMES.christmas.sky;
    return {
      uTop: { value: new THREE.Color(top) },
      uHorizon: { value: new THREE.Color(horizon) },
      uBottom: { value: new THREE.Color(bottom) },
    };
  }, []);

  useFrame((_, delta) => {
    const live = materialRef.current?.uniforms;
    if (!live) return;
    const [top, horizon, bottom] = THEMES[useStore.getState().theme].sky;
    fadeColor(live.uTop.value, top, delta);
    fadeColor(live.uHorizon.value, horizon, delta);
    fadeColor(live.uBottom.value, bottom, delta);
  });

  return (
    // Vẽ đầu tiên và không ghi depth: mọi thứ khác luôn nằm trước bầu trời
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[RADIUS, 32, 16]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};
