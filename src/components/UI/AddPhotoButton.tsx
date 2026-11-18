import { useRef, type ChangeEvent } from 'react';
import { addPhotos, useStore } from '../../store';

export const AddPhotoButton = () => {
  const photoCount = useStore((s) => s.photoUrls.length);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    addPhotos(event.target.files ?? []);
    // Reset để có thể chọn lại đúng file vừa chọn
    event.target.value = '';
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handleChange} />
      <button type="button" className="button button--photo" onClick={() => inputRef.current?.click()}>
        <span>Photos</span>
        {photoCount > 0 && <span className="button__badge">{photoCount}</span>}
      </button>
    </>
  );
};
