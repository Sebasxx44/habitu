import { useEffect, useState } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import type { CampaignContentState } from "@/modules/campaigns/types";

// COMPOSABLE
export const useCampaignContent = (
  value: string,
  onChange: (value: string) => void,
  disabled: boolean,
): CampaignContentState => {
  // STATE
  const [kind, setKind] = useState<"image" | "link" | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ allowBase64: true }),
    ],
    content: sanitizeHtml(value),
    editable: !disabled,
    onUpdate: ({ editor: instance }) =>
      onChange(sanitizeHtml(instance.getHTML())),
    editorProps: {
      attributes: {
        "aria-label": "Contenido del correo",
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-64 p-5 outline-none [&_img]:max-w-full",
      },
    },
  });
  // EFFECTS
  useEffect(() => {
    if (editor && value !== editor.getHTML())
      editor.commands.setContent(sanitizeHtml(value), { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  // ACTIONS
  const choose = (next: "image" | "link" | null): void => {
    setKind(next);
    setUrl("");
    setError(null);
  };
  const insert = (): void => {
    if (!editor || disabled || !kind) return;
    const href = url.trim();
    try {
      const parsed = new URL(href);
      if (
        !["https:", "http:", ...(kind === "link" ? ["mailto:"] : [])].includes(
          parsed.protocol,
        )
      )
        throw new Error("Invalid protocol");
      if (kind === "image")
        editor
          .chain()
          .focus()
          .setImage({ src: href, alt: "Imagen de la campaña" })
          .run();
      else if (editor.state.selection.empty)
        editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text: href,
            marks: [{ type: "link", attrs: { href } }],
          })
          .run();
      else editor.chain().focus().setLink({ href }).run();
      choose(null);
    } catch {
      setError(
        kind === "image"
          ? "Escribe una URL de imagen que empiece por https://."
          : "Escribe una URL válida (https:// o mailto:).",
      );
    }
  };
  // RETURN
  return {
    editor,
    media: { kind, url, error },
    actions: { choose, setUrl, insert },
  };
};
