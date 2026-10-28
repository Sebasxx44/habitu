import { Mail, TicketPercent } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { PanelTA } from "@/components/TA/PanelTA";

// COMPONENT
export const CampaignEmailPreviewTA = ({
  subject,
  body,
  promotion,
}: {
  subject: string;
  body: string;
  promotion?: { title: string; promo_code: string | null } | null;
}) => (
  <PanelTA
    title="Vista previa del correo"
    description="El enlace de reserva se añade al enviar."
  >
    <div className="px-5 pb-5 md:px-6">
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-4 py-3">
          <Mail className="size-4 shrink-0 text-primary" />
          <p className="min-w-0 break-words text-sm font-semibold">
            {subject || "El asunto de tu campaña"}
          </p>
        </div>
        <div
          className="prose prose-sm dark:prose-invert max-w-none break-words p-5 [&_img]:max-w-full"
          onClick={(event) => event.preventDefault()}
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(body || "<p>Tu mensaje aparecerá aquí.</p>"),
          }}
        />
        {promotion && (
          <div className="mx-4 mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <TicketPercent className="mb-2 size-5 text-primary" />
            <p className="text-sm font-semibold">{promotion.title}</p>
            {promotion.promo_code && (
              <p className="mt-2 font-mono text-sm text-primary">
                {promotion.promo_code}
              </p>
            )}
          </div>
        )}
        <div className="px-4 pb-5">
          <span className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            Reservar ahora
          </span>
        </div>
      </div>
    </div>
  </PanelTA>
);
