import { type ChangeEvent, type ReactNode } from 'react'
import { sanitizeHtml } from '@/lib/sanitizeHtml'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { 
  Bold, Italic, Underline as UnderlineIcon, List, 
  ListOrdered, Image as ImageIcon, Link as LinkIcon,
  Heading1, Heading2, Quote, Undo, Redo
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const MenuButton = ({ onClick, isActive, children, title }: { onClick: () => void; isActive?: boolean; children: ReactNode; title: string }) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={(e) => {
      e.preventDefault()
      onClick()
    }}
    className={`h-8 w-8 p-0 rounded-md ${isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
    title={title}
  >
    {children}
  </Button>
)

export const RichTextEditor = ({ content, onChange, placeholder }: { content: string; onChange: (html: string) => void; placeholder?: string }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ allowBase64: true }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: sanitizeHtml(content),
    onUpdate: ({ editor }) => {
      onChange(sanitizeHtml(editor.getHTML()))
    },
    editorProps: {
      attributes: {
        'aria-label': placeholder || 'Contenido del mensaje',
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4',
      },
    },
  })

  if (!editor) return null

  const addImage = () => {
    const url = window.prompt('URL de la imagen')
    if (url && /^https?:\/\//i.test(url)) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const handleLocalImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && ['image/png', 'image/jpeg', 'image/gif'].includes(file.type) && file.size <= 512000) {
      const reader = new FileReader()
      reader.onload = (readerEvent) => {
        const content = readerEvent.target?.result
        if (typeof content === 'string') {
          editor.chain().focus().setImage({ src: content }).run()
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const setLink = () => {
    const url = window.prompt('URL del enlace')
    if (url && /^(https?:\/\/|mailto:)/i.test(url)) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="rounded-xl border border-border/50 bg-secondary/20 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border/50 bg-background/50">
        <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Negrita">
          <Bold className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Cursiva">
          <Italic className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Subrayado">
          <UnderlineIcon className="w-4 h-4" />
        </MenuButton>
        <div className="w-px h-4 bg-border/50 mx-1" />
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Título Grande">
          <Heading1 className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Título Mediano">
          <Heading2 className="w-4 h-4" />
        </MenuButton>
        <div className="w-px h-4 bg-border/50 mx-1" />
        <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Lista">
          <List className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Lista Numerada">
          <ListOrdered className="w-4 h-4" />
        </MenuButton>
        <div className="w-px h-4 bg-border/50 mx-1" />
        <MenuButton onClick={setLink} isActive={editor.isActive('link')} title="Enlace">
          <LinkIcon className="w-4 h-4" />
        </MenuButton>
        <div className="relative group">
          <MenuButton onClick={() => {}} title="Imagen">
            <ImageIcon className="w-4 h-4" />
          </MenuButton>
          <div className="absolute top-full left-0 hidden group-hover:flex flex-col bg-popover border border-border shadow-xl rounded-lg z-50 p-1 min-w-[120px]">
            <button 
              onClick={(e) => {
                e.preventDefault()
                addImage()
              }}
              className="text-[10px] font-bold uppercase p-2 hover:bg-secondary/50 rounded-md text-left"
            >
              Desde URL
            </button>
            <label className="text-[10px] font-bold uppercase p-2 hover:bg-secondary/50 rounded-md cursor-pointer text-left">
              Subir Archivo
              <input type="file" className="hidden" accept="image/png,image/jpeg,image/gif" onChange={handleLocalImage} />
            </label>
          </div>
        </div>
        <div className="w-px h-4 bg-border/50 mx-1 ml-auto" />
        <MenuButton onClick={() => editor.chain().focus().undo().run()} title="Deshacer">
          <Undo className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().redo().run()} title="Rehacer">
          <Redo className="w-4 h-4" />
        </MenuButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
