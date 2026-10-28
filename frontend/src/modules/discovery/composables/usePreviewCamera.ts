import { useEffect, useRef, useState } from "react";
import type { PreviewCameraState } from "@/modules/discovery/types";

// COMPOSABLE
export const usePreviewCamera = (): PreviewCameraState => {
  // STATE
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const photoUrl = useRef("");
  const mounted = useRef(true);
  const request = useRef(0);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");

  // EFFECTS
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current++;
      stream.current?.getTracks().forEach((track) => track.stop());
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    };
  }, []);

  // ACTIONS
  const stop = () => {
    request.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setStarting(false);
  };
  const start = async () => {
    if (starting || active) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("La cámara no está disponible. Puedes cargar una foto.");
      return;
    }
    setStarting(true);
    setError("");
    const sequence = ++request.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 640 },
        audio: false,
      });
      if (!mounted.current || request.current !== sequence) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      if (mounted.current)
        setError(
          "No se pudo abrir la cámara. Revisa el permiso o carga una foto.",
        );
    } finally {
      if (mounted.current && request.current === sequence) setStarting(false);
    }
  };
  const upload = (file?: File) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError("Selecciona una imagen JPG, PNG o WebP de hasta 8 MB.");
      return;
    }
    stop();
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = URL.createObjectURL(file);
    setPhoto(photoUrl.current);
    setError("");
  };
  return {
    media: { videoRef, active, starting, photo, error },
    actions: { start, stop, upload },
  };
};
