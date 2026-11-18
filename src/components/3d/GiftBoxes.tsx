// @ts-nocheck
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../constants/config';
import { getWeightedTreePosition } from '../../utils/treePositions';
import type { SceneState, GiftBoxData, ThemeColors, TreeStyle } from '../../types';

interface GiftBoxesProps {
  state: SceneState;
  themeColors: ThemeColors;
  treeStyle: TreeStyle;
}

export const GiftBoxes = ({ state, themeColors, treeStyle }: GiftBoxesProps) => {
  const count = CONFIG.counts.gifts;
  const groupRef = useRef<THREE.Group>(null);

  // Store color indices for mapping to theme colors
  const colorIndices = useMemo(() => {
    return new Array(count).fill(0).map(() => Math.floor(Math.random() * 5));
  }, [count]);

  // Data is created once and updated in place
  const data = useMemo<GiftBoxData[]>(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60
      );
      const targetPos = getWeightedTreePosition(0, 'classic');
      targetPos.multiplyScalar(0.95);

      const giftColors = CONFIG.colors.metallicGiftColors || CONFIG.colors.giftColors;
      const boxColor = giftColors[Math.floor(Math.random() * giftColors.length)];
      
      const colorType = Math.floor(Math.random() * 3);
      let size: number;
      if (colorType === 0) {
        size = 0.5 + Math.random() * 0.3;
      } else if (colorType === 1) {
        size = 0.4 + Math.random() * 0.3;
      } else {
        size = 0.45 + Math.random() * 0.25;
      }

      const rotationSpeed = {
        x: (Math.random() - 0.5) * 1.0,
        y: (Math.random() - 0.5) * 1.0,
        z: (Math.random() - 0.5) * 1.0
      };
      
      return {
        chaosPos,
        targetPos,
        boxColor,
        size,
        currentPos: chaosPos.clone(),
        chaosRotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ),
        rotationSpeed,
        timeOffset: Math.random() * Math.PI * 2
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

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;
    
    groupRef.current.children.forEach((child, i) => {
      const group = child as THREE.Group;
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;
      
      objData.currentPos.lerp(target, delta * 1.2);
      group.position.copy(objData.currentPos);
      group.rotation.x += delta * objData.rotationSpeed.x;
      group.rotation.y += delta * objData.rotationSpeed.y;
      group.rotation.z += delta * objData.rotationSpeed.z;

      const targetScale = isFormed ? 1 : 1;
      group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 3);
      group.visible = true;

      // Hiệu ứng bay nhẹ nhàng khi ở trạng thái FORMED
      if (isFormed) {
        const floatOffset = Math.sin(time * 2 + objData.timeOffset) * 0.1;
        group.position.y += floatOffset;
      }
    });
  });

  // Tái sử dụng vật liệu
  const ribbonMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: themeColors.gold,
        roughness: 0.15,
        metalness: 1.0
      }),
    []
  );

  // Update colors when theme changes
  useEffect(() => {
    // Update ribbon color
    ribbonMaterial.color.set(themeColors.gold);
    
    // Update gift box colors
    if (!groupRef.current) return;
    
    groupRef.current.children.forEach((group, i) => {
      const giftGroup = group as THREE.Group;
      // First child is the main box
      if (giftGroup.children[0]) {
        const boxMesh = giftGroup.children[0] as THREE.Mesh;
        if (boxMesh.material) {
          const colorIndex = colorIndices[i] % themeColors.metallicGiftColors.length;
          const newColor = themeColors.metallicGiftColors[colorIndex];
          (boxMesh.material as THREE.MeshStandardMaterial).color.set(newColor);
          // Update data for reference
          data[i].boxColor = newColor;
        }
      }
    });
  }, [themeColors, colorIndices, data, ribbonMaterial]);

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => {
        const size = obj.size;

        return (
          <group
            key={i}
            position={[obj.currentPos.x, obj.currentPos.y, obj.currentPos.z]}
            rotation={[obj.chaosRotation.x, obj.chaosRotation.y, obj.chaosRotation.z]}>
            {/* Hộp chính */}
            <mesh
              receiveShadow
              castShadow>
              <boxGeometry args={[size, size, size]} />
              <meshStandardMaterial
                color={obj.boxColor}
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>

            {/* Ruy băng dọc */}
            <mesh
              receiveShadow
              castShadow
              material={ribbonMaterial}>
              <boxGeometry args={[size + 0.1, size, size * 0.2]} />
            </mesh>

            {/* Ruy băng ngang */}
            <mesh
              receiveShadow
              castShadow
              material={ribbonMaterial}>
              <boxGeometry args={[size * 0.2, size, size + 0.1]} />
            </mesh>

            {/* Nơ trên - Vòng trái */}
            <mesh
              position={[-size * 0.25, size / 2, 0]}
              rotation={[0, 0, Math.PI / 3]}
              castShadow
              material={ribbonMaterial}>
              <boxGeometry args={[size * 0.3, size * 0.15, size * 0.05]} />
            </mesh>

            {/* Nơ trên - Vòng phải */}
            <mesh
              position={[size * 0.25, size / 2, 0]}
              rotation={[0, 0, -Math.PI / 3]}
              castShadow
              material={ribbonMaterial}>
              <boxGeometry args={[size * 0.3, size * 0.15, size * 0.05]} />
            </mesh>

            {/* Nút nơ giữa */}
            <mesh
              position={[0, size / 2, 0]}
              castShadow
              material={ribbonMaterial}>
              <boxGeometry args={[size * 0.12, size * 0.12, size * 0.05]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

