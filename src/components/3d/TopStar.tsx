// @ts-nocheck
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG } from '../../constants/config';
import type { SceneState, ThemeColors } from '../../types';

interface TopStarProps {
  state: SceneState;
  themeColors: ThemeColors;
}

export const TopStar = ({ state, themeColors }: TopStarProps) => {
  const groupRef = useRef<THREE.Group>(null);

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.3;
    const innerRadius = 0.7;
    const points = 5;
    
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      i === 0
        ? shape.moveTo(radius * Math.cos(angle), radius * Math.sin(angle))
        : shape.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
    }
    shape.closePath();
    return shape;
  }, []);

  const starGeometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(starShape, {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3
    });
  }, [starShape]);

  const goldMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: themeColors.gold,
        emissive: themeColors.gold,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        metalness: 1.0
      }),
    []
  );

  // Update star color when theme changes
  useEffect(() => {
    goldMaterial.color.set(themeColors.gold);
    goldMaterial.emissive.set(themeColors.gold);
  }, [themeColors.gold, goldMaterial]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
      const targetScale = state === 'FORMED' ? 1 : 0;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 3
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={[0, CONFIG.tree.height / 2 + 1.8, 0]}>
      <Float
        speed={2}
        rotationIntensity={0.2}
        floatIntensity={0.2}>
        <mesh
          geometry={starGeometry}
          material={goldMaterial}
        />
      </Float>
    </group>
  );
};

