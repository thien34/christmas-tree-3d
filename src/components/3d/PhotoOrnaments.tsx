// @ts-nocheck
import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG } from '../../constants/config';
import { getSphericalPosition, getWeightedTreePosition } from '../../utils/treePositions';
import type { SceneState, PhotoOrnamentData, ZoomState } from '../../types';

interface PhotoOrnamentsProps {
  state: SceneState;
  photoUrls: string[];
  zoomState?: ZoomState;
}

// Component con để load texture - đảm bảo hooks được gọi ổn định
const PhotoOrnamentsContent = ({ state, photoUrls, zoomState }: PhotoOrnamentsProps) => {
  const textures = useTexture(photoUrls);
  const count = photoUrls.length;
  const groupRef = useRef<THREE.Group>(null);
  const [nearestIndex, setNearestIndex] = useState<number>(-1);
  const lockedZoomIndexRef = useRef<number>(-1); // Lưu index của ảnh đang được zoom
  const { camera } = useThree();
  
  // Cache reusable objects to avoid creating new ones every frame
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const handScreenPosRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const screenPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const cameraDirectionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const centerScreenPosRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const centerRaycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const finalTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const tempQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const parentWorldQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  
  // Track khi zoom bắt đầu hoặc kết thúc
  useEffect(() => {
    if (!zoomState?.active) {
      // Khi tắt zoom, unlock và reset
      lockedZoomIndexRef.current = -1;
      setNearestIndex(-1);
    }
  }, [zoomState?.active]);

  const borderGeometry = useMemo(() => new THREE.PlaneGeometry(1.2, 1.5), []);
  const photoGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const data = useMemo<PhotoOrnamentData[]>(() => {
    return new Array(count).fill(0).map((_, i) => {
      // Tỏa ra theo hình cầu với bán kính 50
      const chaosPos = getSphericalPosition(50);
      
      // Phân bố trọng số: loại bỏ 25% phần đỉnh
      const targetPos = getWeightedTreePosition(0.25);
      targetPos.x += 0.5 * Math.cos(Math.random() * Math.PI * 2);
      targetPos.z += 0.5 * Math.sin(Math.random() * Math.PI * 2);
      targetPos.z += 0.3;

      const isBig = Math.random() < 0.2;
      const baseScale = isBig ? 1.8 : 0.8 + Math.random() * 0.4;
      const weight = 0.8 + Math.random() * 1.2;
      const borderColor = CONFIG.colors.borders[
        Math.floor(Math.random() * CONFIG.colors.borders.length)
      ];

      const rotationSpeed = {
        x: (Math.random() - 0.5) * 1.0,
        y: (Math.random() - 0.5) * 1.0,
        z: (Math.random() - 0.5) * 1.0
      };
      
      const chaosRotation = new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      return {
        chaosPos,
        targetPos,
        scale: baseScale,
        baseScale,
        zoomScale: 1.0,
        weight,
        textureIndex: i % textures.length,
        borderColor,
        currentPos: chaosPos.clone(),
        chaosRotation,
        rotationSpeed,
        wobbleOffset: Math.random() * 10,
        wobbleSpeed: 0.5 + Math.random() * 0.5
      };
    });
  }, [textures, count]);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;

    // Find nearest photo to hand position when zoom is active (works in both CHAOS and FORMED)
    let currentNearestIndex = -1;
    
    // Nếu đang zoom và đã lock một ảnh, giữ nguyên ảnh đó
    if (zoomState?.active && lockedZoomIndexRef.current >= 0) {
      currentNearestIndex = lockedZoomIndexRef.current;
    } else if (zoomState?.active && zoomState?.handPosition) {
      // Chỉ tìm ảnh mới khi chưa lock (lần đầu bắt đầu zoom)
      // Convert hand position from screen space (0-1) to world space (reuse cached vector)
      handScreenPosRef.current.set(
        zoomState.handPosition.x * 2 - 1, // Convert 0-1 to -1 to 1
        -(zoomState.handPosition.y * 2 - 1) // Flip Y and convert
      );
      
      // Reuse cached raycaster
      raycasterRef.current.setFromCamera(handScreenPosRef.current, camera);
      
      // Find photo closest to the ray from hand position
      let minDistance = Infinity;
      groupRef.current.children.forEach((group, i) => {
        // Calculate distance from hand ray to photo position
        const photoPos = group.position;
        const distanceToRay = raycasterRef.current.ray.distanceToPoint(photoPos);
        
        // Also consider screen-space distance for better selection (reuse cached vector)
        screenPosRef.current.copy(photoPos).project(camera);
        const screenDistance = Math.sqrt(
          Math.pow(screenPosRef.current.x - handScreenPosRef.current.x, 2) + 
          Math.pow(screenPosRef.current.y - handScreenPosRef.current.y, 2)
        );
        
        // Combined distance metric (weighted towards screen space for better UX)
        const combinedDistance = screenDistance * 0.7 + distanceToRay * 0.3;
        
        if (combinedDistance < minDistance) {
          minDistance = combinedDistance;
          currentNearestIndex = i;
        }
      });
      
      // Lock index khi tìm được ảnh đầu tiên và chưa lock
      if (currentNearestIndex >= 0 && lockedZoomIndexRef.current < 0) {
        lockedZoomIndexRef.current = currentNearestIndex;
        setNearestIndex(currentNearestIndex);
      }
    }
    
    // Khi đang zoom và đã lock, đảm bảo nearestIndex luôn là locked index
    if (zoomState?.active && lockedZoomIndexRef.current >= 0) {
      if (nearestIndex !== lockedZoomIndexRef.current) {
        setNearestIndex(lockedZoomIndexRef.current);
      }
    }

    groupRef.current.children.forEach((group, i) => {
      const objData = data[i];
      // Sử dụng lockedZoomIndexRef hoặc currentNearestIndex để xác định ảnh đang zoom
      const zoomedIndex = lockedZoomIndexRef.current >= 0 ? lockedZoomIndexRef.current : currentNearestIndex;
      const isZoomed = zoomState?.active && i === zoomedIndex;
      
      // Khi zoom, di chuyển ảnh về phía camera (hoạt động ở cả CHAOS và FORMED)
      let finalTarget;
      if (isZoomed) {
        // Tính toán vị trí gần camera hơn (reuse cached vector)
        camera.getWorldDirection(cameraDirectionRef.current);
        // Đặt ảnh ở khoảng cách xa hơn một chút để đảm bảo bao quát toàn bộ ảnh
        const distanceFromCamera = 25;
        finalTargetRef.current
          .copy(camera.position)
          .addScaledVector(cameraDirectionRef.current, distanceFromCamera);
        
        // Chuyển đổi world position sang local position của groupRef (vì các ornament là con của groupRef)
        // Điều này đảm bảo ảnh luôn ở giữa màn hình bất kể cây đang quay hay bị lệch position
        if (groupRef.current) {
          groupRef.current.worldToLocal(finalTargetRef.current);
        }
        
        finalTarget = finalTargetRef.current;
      } else {
        finalTarget = isFormed ? objData.targetPos : objData.chaosPos;
      }

      // Tăng tốc độ di chuyển khi zoom để ảnh di chuyển nhanh hơn, bám sát camera
      const lerpSpeed = isZoomed ? 10.0 : (isFormed ? 0.8 * objData.weight : 0.5);
      objData.currentPos.lerp(finalTarget, delta * lerpSpeed);
      group.position.copy(objData.currentPos);

      // Smooth zoom animation - only zoom the nearest photo
      const targetZoom = isZoomed ? 6.0 : 1.0;
      objData.zoomScale += (targetZoom - objData.zoomScale) * delta * 8; // Fast smooth lerp
      objData.scale = objData.baseScale * objData.zoomScale;

      // Adjust scale to fit screen if baseScale is too large when zoomed
      if (isZoomed) {
        // Limit maximum scaled size to ensure it fits screen
        const maxZoomedSize = 8.0;
        if (objData.scale > maxZoomedSize) {
          objData.scale = maxZoomedSize;
        }
      }
      
      group.scale.setScalar(objData.scale);

      // Khi zoom, ảnh hướng thẳng vào camera và dừng rotation (hoạt động ở cả CHAOS và FORMED)
      if (isZoomed) {
        // Đảm bảo ảnh luôn song song với màn hình (không bị xéo do rotation của cây)
        // Lấy quaternion của camera trong không gian thế giới
        camera.getWorldQuaternion(tempQuatRef.current);
        
        // Chuyển đổi quaternion thế giới sang không gian local của ornament
        // Ornament là con của groupRef, groupRef là con của treeGroupRef (có rotation)
        if (group.parent) {
          group.parent.getWorldQuaternion(parentWorldQuatRef.current);
          group.quaternion.copy(parentWorldQuatRef.current).invert().multiply(tempQuatRef.current);
        } else {
          group.quaternion.copy(tempQuatRef.current);
        }
      } else if (isFormed) {
        group.lookAt(0, group.position.y, 0);
        group.rotateY(Math.PI);

        const wobbleX = Math.sin(time * objData.wobbleSpeed + objData.wobbleOffset) * 0.05;
        const wobbleZ = Math.cos(time * objData.wobbleSpeed * 0.8 + objData.wobbleOffset) * 0.05;
        group.rotation.x += wobbleX;
        group.rotation.z += wobbleZ;
      } else {
        // CHAOS state - continuous rotation
        group.rotation.x += delta * objData.rotationSpeed.x;
        group.rotation.y += delta * objData.rotationSpeed.y;
        group.rotation.z += delta * objData.rotationSpeed.z;
      }
    });
  });

  return (
    <group ref={groupRef} renderOrder={100}>
      {data.map((obj, i) => {
        const isZoomed = zoomState?.active && i === nearestIndex;
        // Tăng renderOrder cao hơn khi zoom để đảm bảo render trước cây và các đối tượng khác
        // Trong Three.js, renderOrder cao hơn sẽ được vẽ sau (hiển thị trên cùng)
        const renderOrder = isZoomed ? 999 : 101;
        
        return (
          <group
            key={i}
            scale={[obj.scale, obj.scale, obj.scale]}
            rotation={state === 'CHAOS' ? obj.chaosRotation : [0, 0, 0]}>
            {/* Mặt trước */}
            <group position={[0, 0, 0.5]}>
              <mesh geometry={photoGeometry} renderOrder={renderOrder}>
                <meshStandardMaterial
                  map={textures[obj.textureIndex]}
                  roughness={0.5}
                  metalness={0}
                  side={THREE.FrontSide}
                  depthTest={true}
                  depthWrite={true}
                />
              </mesh>
              <mesh
                geometry={borderGeometry}
                position={[0, -0.15, -0.01]}
                renderOrder={renderOrder}>
                <meshStandardMaterial
                  color={obj.borderColor}
                  roughness={0.9}
                  metalness={0}
                  side={THREE.FrontSide}
                  depthTest={true}
                  depthWrite={true}
                />
              </mesh>
            </group>

            {/* Mặt sau trống (không ảnh) */}
            <group
              position={[0, 0, -0.5]}
              rotation={[0, Math.PI, 0]}>
              <mesh geometry={photoGeometry} renderOrder={renderOrder}>
                <meshStandardMaterial
                  color={obj.borderColor}
                  roughness={0.9}
                  metalness={0}
                  side={THREE.FrontSide}
                  depthTest={true}
                  depthWrite={true}
                />
              </mesh>
              <mesh
                geometry={borderGeometry}
                position={[0, -0.15, -0.01]}
                renderOrder={renderOrder}>
                <meshStandardMaterial
                  color={obj.borderColor}
                  roughness={0.9}
                  metalness={0}
                  side={THREE.FrontSide}
                  depthTest={true}
                  depthWrite={true}
                />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};

// Component chính - xử lý conditional rendering
export const PhotoOrnaments = ({ state, photoUrls, zoomState }: PhotoOrnamentsProps) => {
  // Đảm bảo photoUrls luôn là mảng hợp lệ
  const validPhotoUrls = Array.isArray(photoUrls) && photoUrls.length > 0 ? photoUrls : [];
  
  // Nếu không có ảnh, không render gì
  if (validPhotoUrls.length === 0) {
    return null;
  }
  
  // Render component con với texture loading
  return <PhotoOrnamentsContent state={state} photoUrls={validPhotoUrls} zoomState={zoomState} />;
};

