import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Experience } from './components/3d';
import { GestureController } from './components/GestureController';
import { AddPhotoButton, DebugButton, StatusText } from './components/UI';
import { useSceneState, useDebugMode, useAIStatus, usePhotos, useZoomState, useTheme, useTreeStyle } from './hooks';

export default function GrandTreeApp() {
  const { sceneState, setSceneState, toggleSceneState } = useSceneState();
  const { debugMode, toggleDebugMode } = useDebugMode();
  const { aiStatus, setAiStatus } = useAIStatus();
  const { photos, addPhotos } = usePhotos();
  const { zoomState, handlePinch } = useZoomState();
  const { themeColors, cycleTheme } = useTheme();
  const { treeStyle, setStyleByFingerCount } = useTreeStyle();

  const handlePhotosAdded = (files: FileList) => {
    const skipped = addPhotos(files);
    if (skipped > 0) setAiStatus(`ERROR: ${skipped} file(s) skipped, not an image`);
  };

  return (
    <div className="app">
      {/* Nhấp đúp để chuyển qua lại giữa tán loạn và thành cây */}
      <div className="scene" onDoubleClick={toggleSceneState}>
        <Canvas
          dpr={[1, 2]}
          gl={{ toneMapping: THREE.ReinhardToneMapping }}
          shadows="percentage">
          <Experience sceneState={sceneState} photoUrls={photos} zoomState={zoomState} themeColors={themeColors} treeStyle={treeStyle} />
        </Canvas>
      </div>

      <GestureController
        onGesture={setSceneState}
        onStatus={setAiStatus}
        debugMode={debugMode}
        onPinch={handlePinch}
        onThumbUp={cycleTheme}
        onFingerCount={setStyleByFingerCount}
      />

      <div className="toolbar">
        <AddPhotoButton photoCount={photos.length} onPhotosAdded={handlePhotosAdded} />
        <DebugButton active={debugMode} onClick={toggleDebugMode} />
      </div>

      <StatusText status={aiStatus} />
    </div>
  );
}
