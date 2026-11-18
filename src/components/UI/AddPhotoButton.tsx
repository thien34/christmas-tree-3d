import { useRef, type ChangeEvent } from 'react';

interface AddPhotoButtonProps {
  photoCount: number;
  onPhotosAdded: (files: FileList) => void;
}

export const AddPhotoButton = ({ photoCount, onPhotosAdded }: AddPhotoButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files?.length) onPhotosAdded(files);
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
