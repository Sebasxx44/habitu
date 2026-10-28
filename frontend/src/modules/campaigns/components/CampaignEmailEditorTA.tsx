import { EditorContent } from "@tiptap/react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  ImagePlus,
  Link2,
  X,
} from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { useCampaignContent } from "@/modules/campaigns/composables/useCampaignContent";

// COMPONENT
export const CampaignEmailEditorTA = ({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => {
  const { editor, media, actions } = useCampaignContent(
    value,
    onChange,
    disabled,
  );
  if (!editor)
    return (
      <div
        role="status"
        className="min-h-64 rounded-xl border border-border"
        aria-label="Cargando editor"
      />
    );
  return (
    <div className="overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-primary/20">
      <div
        className="flex flex-wrap gap-1 border-b border-border p-2"
        role="toolbar"
        aria-label="Formato del correo"
      >
        <ButtonTA
          type="button"
          variant="ghost"
          size="icon"
          title="Negrita"
          aria-label="Negrita"
          aria-pressed={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ButtonTA>
        <ButtonTA
          type="button"
          variant="ghost"
          size="icon"
          title="Cursiva"
          aria-label="Cursiva"
          aria-pressed={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ButtonTA>
        <ButtonTA
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          Título
        </ButtonTA>
        <ButtonTA
          type="button"
          variant="ghost"
          size="icon"
          title="Lista"
          aria-label="Lista"
          aria-pressed={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ButtonTA>
        <ButtonTA
          type="button"
          variant="ghost"
          size="icon"
          title="Lista numerada"
          aria-label="Lista numerada"
          aria-pressed={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ButtonTA>
        <ButtonTA
          type="button"
          variant="ghost"
          size="icon"
          title="Deshacer"
          aria-label="Deshacer"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="size-4" />
        </ButtonTA>
        <ButtonTA
          type="button"
          variant="ghost"
          size="icon"
          title="Rehacer"
          aria-label="Rehacer"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="size-4" />
        </ButtonTA>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-border px-3 py-2">
        <ButtonTA
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => actions.choose("image")}
        >
          <ImagePlus className="size-4" />
          Imagen
        </ButtonTA>
        <ButtonTA
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => actions.choose("link")}
        >
          <Link2 className="size-4" />
          Enlace
        </ButtonTA>
        {editor.isActive("link") && (
          <ButtonTA
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            Quitar enlace
          </ButtonTA>
        )}
      </div>
      {media.kind && (
        <div className="space-y-2 border-b border-border bg-secondary/30 p-3">
          <label
            className="block text-xs font-medium"
            htmlFor="campaign-media-url"
          >
            {media.kind === "image" ? "URL de la imagen" : "Destino del enlace"}
          </label>
          <div className="flex gap-2">
            <InputTA
              id="campaign-media-url"
              type="text"
              maxLength={2048}
              placeholder="https://…"
              value={media.url}
              disabled={disabled}
              onChange={(event) => actions.setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  actions.insert();
                }
              }}
            />
            <ButtonTA
              type="button"
              disabled={disabled || !media.url.trim()}
              onClick={actions.insert}
            >
              Insertar
            </ButtonTA>
            <ButtonTA
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cerrar inserción"
              disabled={disabled}
              onClick={() => actions.choose(null)}
            >
              <X className="size-4" />
            </ButtonTA>
          </div>
          {media.error && (
            <p role="alert" className="text-xs text-destructive">
              {media.error}
            </p>
          )}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
