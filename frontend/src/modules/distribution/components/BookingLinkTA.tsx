import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { OperationFieldTA } from "@/modules/operations/components/OperationFieldsTA";
import { InputTA } from "@/components/TA/InputTA";
import type { BookingLink } from "@/modules/distribution/types";

// COMPONENT
export const BookingLinkTA = ({
  link,
  remove,
  busy,
}: {
  link: BookingLink;
  remove: () => void;
  busy: boolean;
}) => {
  const { t } = useTranslation("distribution");
  const [qr, setQr] = useState("");
  const [qrError, setQrError] = useState(false);
  // EFFECTS
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(link.url, {
      width: 320,
      margin: 4,
      errorCorrectionLevel: "M",
    })
      .then((value) => {
        if (active) setQr(value);
      })
      .catch(() => {
        if (active) setQrError(true);
      });
    return () => {
      active = false;
    };
  }, [link.url]);
  const snippet = `<iframe src="${link.widget_url}" title="Habitu" width="100%" height="220" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-popups allow-popups-to-escape-sandbox" style="border:0"></iframe>`;
  return (
    <PanelTA
      title={link.label}
      description={t(link.active ? "active" : "inactive")}
    >
      <div className="space-y-4 px-5 pb-5">
        <p className="text-sm text-muted-foreground">
          {t("opens", { count: link.opens_count })}
        </p>
        <OperationFieldTA label={t("link")}>
          <InputTA
            readOnly
            value={link.url}
            onFocus={(event) => event.target.select()}
          />
        </OperationFieldTA>
        <OperationFieldTA label={t("embed")}>
          <textarea
            className="min-h-24 w-full rounded-xl border border-border bg-background p-3 text-xs"
            readOnly
            value={snippet}
            onFocus={(event) => event.target.select()}
          />
        </OperationFieldTA>
        <div className="flex flex-wrap items-center gap-5">
          {qr && (
            <>
              <img src={qr} alt={t("qr")} className="size-40 rounded-xl" />
              <a
                href={qr}
                download={`habitu-${link.id}.png`}
                className="text-sm font-medium text-primary underline"
              >
                {t("download")}
              </a>
            </>
          )}
          {qrError && <p role="alert">{t("qrError")}</p>}
          {link.active && (
            <ButtonTA variant="outline" onClick={remove} disabled={busy}>
              {t("disable")}
            </ButtonTA>
          )}
        </div>
      </div>
    </PanelTA>
  );
};
