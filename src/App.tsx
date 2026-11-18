import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from './components/3d/Experience';
import { GestureController } from './components/GestureController';
import { AddPhotoButton, DebugButton, StatusText } from './components/UI';
import { useDebugMode, usePhotos, useSceneState, useTheme, useTreeStyle, useZoomState } from './hooks';

export default function App() {
  const { sceneState, setSceneState, toggleSceneState } = useSceneState();
  const { debugMode, toggleDebugMode } = useDebugMode();
  const { photos, addPhotos } = usePhotos();
  const { zoomState, handlePinch } = useZoomState();
  const { themeColors, cycleTheme } = useTheme();
  const { treeStyle, setStyleByFingerCount } = useTreeStyle();
  const [status, setStatus] = useState('INITIALIZING...');

  const handlePhotosAdded = (files: FileList) => {
    const skipped = addPhotos(files);
    if (skipped > 0) setStatus(`ERROR: ${skipped} file(s) skipped, not an image`);
  };

  return (
    <div className="app">
      {/* Nhấp đúp để chuyển qua lại giữa tán loạn và thành cây */}
      <div className="scene" onDoubleClick={toggleSceneState}>
        <Canvas dpr={[1, 2]}>
          <Experience
            sceneState={sceneState}
            photoUrls={photos}
            zoomState={zoomState}
            themeColors={themeColors}
            treeStyle={treeStyle}
          />
        </Canvas>
      </div>

      <GestureController
        debugMode={debugMode}
        onSceneState={setSceneState}
        onStatus={setStatus}
        onPinch={handlePinch}
        onThumbUp={cycleTheme}
        onFingerCount={setStyleByFingerCount}
      />

      <div className="toolbar">
        <AddPhotoButton photoCount={photos.length} onPhotosAdded={handlePhotosAdded} />
        <DebugButton active={debugMode} onClick={toggleDebugMode} />
      </div>

      <StatusText status={status} />
    </div>
  );
}
