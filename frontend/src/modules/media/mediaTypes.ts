// TYPES
export interface GalleryMedia {
  url: string;
  type: "image" | "video";
  caption?: string;
}
export interface MediaEditorState {
  state: { pending: boolean; error: string };
  actions: {
    image: (file: File, save: (url: string) => void) => Promise<void>;
    gallery: (
      files: File[],
      currentCount: number,
      save: (items: GalleryMedia[]) => void,
    ) => Promise<void>;
  };
}
