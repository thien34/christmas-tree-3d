import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Danh sách ảnh người dùng thêm vào, lưu dưới dạng object URL
 * (nhẹ hơn data URL base64 và không phải đọc cả file vào bộ nhớ JS).
 */
export const usePhotos = () => {
  const [photos, setPhotos] = useState<string[]>([]);
  const urlsRef = useRef<string[]>([]);

  /** Thêm các file ảnh; trả về số file bị bỏ qua vì không phải ảnh. */
  const addPhotos = useCallback((files: FileList | File[]) => {
    const all = Array.from(files);
    const images = all.filter((file) => file.type.startsWith('image/'));
    const urls = images.map((file) => URL.createObjectURL(file));

    urlsRef.current.push(...urls);
    setPhotos((prev) => [...prev, ...urls]);
    return all.length - images.length;
  }, []);

  // Giải phóng các object URL khi component unmount.
  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  return { photos, addPhotos };
};
