import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  GalleryMedia,
  MediaEditorState,
} from "@/modules/media/mediaTypes";

// PROCESSING
const readFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("read"));
    reader.readAsDataURL(file);
  });
const optimizeImage = async (file: File): Promise<string> => {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 8 * 1024 * 1024
  )
    throw new Error("size");
  const source = await readFile(file);
  const image = new Image();
  image.src = source;
  await image.decode();
  const scale = Math.min(
    1,
    1600 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const result = canvas.toDataURL("image/webp", 0.82);
  if (result.length > 2800000) throw new Error("size");
  return result;
};

// COMPOSABLE
export const useMediaEditor = (): MediaEditorState => {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const image = async (file: File, save: (url: string) => void) => {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setError("");
    try {
      save(await optimizeImage(file));
    } catch {
      setError(t("media.imageError"));
    } finally {
      locked.current = false;
      setPending(false);
    }
  };
  const gallery = async (
    files: File[],
    currentCount: number,
    save: (items: GalleryMedia[]) => void,
  ) => {
    if (locked.current) return;
    if (currentCount + files.length > 12) {
      setError(t("media.limit"));
      return;
    }
    locked.current = true;
    setPending(true);
    setError("");
    try {
      const items: GalleryMedia[] = [];
      for (const file of files) {
        if (["video/mp4", "video/webm"].includes(file.type)) {
          if (file.size > 2 * 1024 * 1024) throw new Error("size");
          items.push({ type: "video", url: await readFile(file) });
        } else items.push({ type: "image", url: await optimizeImage(file) });
      }
      save(items);
    } catch {
      setError(t("media.galleryError"));
    } finally {
      locked.current = false;
      setPending(false);
    }
  };
  return { state: { pending, error }, actions: { image, gallery } };
};
