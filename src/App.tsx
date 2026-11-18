import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Experience } from './components/3d';
import { GestureController } from './components/GestureController';
import { DebugButton, StatusText, AddPhotoButton, uiStyles } from './components/UI';
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
    addPhotos(files).catch((error) => {
      console.error('Error adding photos:', error);
      setAiStatus(`ERROR: ${error.message}`);
    });
  };

  return (
    <div style={uiStyles.container}>
      <div 
        style={uiStyles.canvasWrapper}
        onDoubleClick={toggleSceneState}>
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

      <div style={uiStyles.buttonContainer}>
        <AddPhotoButton onPhotosAdded={handlePhotosAdded} photoCount={photos.length} />
        <DebugButton debugMode={debugMode} onClick={toggleDebugMode} />
      </div>

      <StatusText aiStatus={aiStatus} />
    </div>
  );
}
