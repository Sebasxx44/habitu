import { LinkButtonTA } from "@/components/TA/LinkButtonTA";

// COMPONENT
export const LegalLinksTA = () => (
  <nav
    aria-label="Información de privacidad y uso"
    className="flex flex-wrap items-center justify-center gap-1"
  >
    <LinkButtonTA
      to="/privacy"
      variant="ghost"
      size="sm"
      className="text-xs text-muted-foreground"
    >
      Privacidad
    </LinkButtonTA>
    <LinkButtonTA
      to="/terms"
      variant="ghost"
      size="sm"
      className="text-xs text-muted-foreground"
    >
      Condiciones de uso
    </LinkButtonTA>
  </nav>
);
