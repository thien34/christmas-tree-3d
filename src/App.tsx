import { Canvas } from '@react-three/fiber';
import { Experience } from './components/3d/Experience';
import { GestureController } from './components/GestureController';
import { AddPhotoButton, DebugButton, StatusText } from './components/UI';
import { toggleSceneState } from './store';

export default function App() {
  return (
    <div className="app">
      {/* Nhấp đúp để chuyển qua lại giữa tán loạn và thành cây */}
      <div className="scene" onDoubleClick={toggleSceneState}>
        <Canvas dpr={[1, 2]}>
          <Experience />
        </Canvas>
      </div>

      <GestureController />

      <div className="toolbar">
        <AddPhotoButton />
        <DebugButton />
      </div>

      <StatusText />
    </div>
  );
}
