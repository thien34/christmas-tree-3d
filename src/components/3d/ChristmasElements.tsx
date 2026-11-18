import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../constants/config';
import { getWeightedTreePosition } from '../../utils/treePositions';
import type { SceneState, ChristmasElementData, ThemeColors, TreeStyle } from '../../types';

interface ChristmasElementsProps {
  state: SceneState;
  themeColors: ThemeColors;
  treeStyle: TreeStyle;
}

export const ChristmasElements = ({ state, themeColors, treeStyle }: ChristmasElementsProps) => {
  const count = CONFIG.counts.elements;
  const groupRef = useRef<THREE.Group>(null);

  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
  
  // Store color indices for mapping to theme colors
  const colorIndices = useMemo(() => {
    return new Array(count).fill(0).map(() => Math.floor(Math.random() * 3));
  }, [count]);

  // Data is created once and updated in place
  const data = useMemo<ChristmasElementData[]>(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60
      );
      const targetPos = getWeightedTreePosition(0, 'classic');
      targetPos.multiplyScalar(0.95);

      // Tất cả đều là quả cầu, chỉ khác màu và tỷ lệ
      const colorType = Math.floor(Math.random() * 3);
      let color: string;
      let scale: number;
      
      if (colorType === 0) {
        color = CONFIG.colors.giftColors[
          Math.floor(Math.random() * CONFIG.colors.giftColors.length)
        ];
        scale = 0.5 + Math.random() * 0.3;
      } else if (colorType === 1) {
        color = CONFIG.colors.giftColors[
          Math.floor(Math.random() * CONFIG.colors.giftColors.length)
        ];
        scale = 0.4 + Math.random() * 0.3;
      } else {
        color = Math.random() > 0.5 ? CONFIG.colors.red : CONFIG.colors.white;
        scale = 0.45 + Math.random() * 0.25;
      }

      const rotationSpeed = {
        x: (Math.random() - 0.5) * 2.0,
        y: (Math.random() - 0.5) * 2.0,
        z: (Math.random() - 0.5) * 2.0
      };
      
      // Chỉ một số quả cầu ngẫu nhiên sẽ lấp lánh (khoảng 25%)
      const shouldSparkle = Math.random() < 0.25;
      const sparkleOffset = Math.random() * Math.PI * 2;
      const sparkleSpeed = 1.5 + Math.random() * 1.5;
      const sparkleDuration = 1.5 + Math.random() * 2.0;
      const sparkleCooldown = 3.0 + Math.random() * 5.0;
      const sparkleStartTime = Math.random() * sparkleCooldown;
      
      return {
        chaosPos,
        targetPos,
        color,
        scale,
        currentPos: chaosPos.clone(),
        chaosRotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ),
        rotationSpeed,
        shouldSparkle,
        sparkleOffset,
        sparkleSpeed,
        sparkleDuration,
        sparkleCooldown,
        sparkleStartTime
      };
    });
  }, [count]);

  // Update target positions when tree style changes (in place, no re-render)
  useEffect(() => {
    data.forEach((objData) => {
      const newTarget = getWeightedTreePosition(0, treeStyle);
      newTarget.multiplyScalar(0.95);
      objData.targetPos.copy(newTarget);
    });
  }, [treeStyle, data]);

  // Update element colors when theme changes
  useEffect(() => {
    if (!groupRef.current) return;
    
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        const colorIndex = colorIndices[i] % themeColors.giftColors.length;
        const newColor = themeColors.giftColors[colorIndex];
        (mesh.material as THREE.MeshStandardMaterial).color.set(newColor);
        // Also update data for sparkle effects
        data[i].color = newColor;
      }
    });
  }, [themeColors.giftColors, colorIndices, data]);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;
    
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;
      
      objData.currentPos.lerp(target, delta * 1.5);
      mesh.position.copy(objData.currentPos);
      mesh.rotation.x += delta * objData.rotationSpeed.x;
      mesh.rotation.y += delta * objData.rotationSpeed.y;
      mesh.rotation.z += delta * objData.rotationSpeed.z;

      // Hiệu ứng lấp lánh vàng
      if (mesh.material && isFormed && objData.shouldSparkle) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        const cycleTime = time - objData.sparkleStartTime;
        const cyclePosition = cycleTime % (objData.sparkleDuration + objData.sparkleCooldown);
        const isSparkling = cyclePosition < objData.sparkleDuration;

        if (isSparkling) {
          const sparkle = (Math.sin(time * objData.sparkleSpeed + objData.sparkleOffset) + 1) / 2;
          material.emissiveIntensity = 1.0 + sparkle * 3.0;
          const sparkleScale = 1.0 + sparkle * 0.3;
          mesh.scale.setScalar(objData.scale * sparkleScale);
          
          const goldTint = new THREE.Color(themeColors.gold);
          goldTint.lerp(new THREE.Color(objData.color), 1 - sparkle * 0.8);
          material.emissive = goldTint;
        } else {
          material.emissiveIntensity = 0.5;
          material.emissive = new THREE.Color(objData.color);
          mesh.scale.setScalar(objData.scale);
        }
      } else if (mesh.material && isFormed) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.5;
        material.emissive = new THREE.Color(objData.color);
        mesh.scale.setScalar(objData.scale);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => (
        <mesh
          key={i}
          scale={[obj.scale, obj.scale, obj.scale]}
          geometry={sphereGeometry}
          rotation={obj.chaosRotation}
          castShadow
          receiveShadow>
          <meshStandardMaterial
            color={obj.color}
            roughness={0.15}
            metalness={0.9}
            emissive={obj.color}
            emissiveIntensity={0.5}
            envMapIntensity={1.5}
          />
        </mesh>
      ))}
    </group>
  );
};

