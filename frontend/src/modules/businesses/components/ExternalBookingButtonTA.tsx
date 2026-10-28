import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { cn } from "@/lib/utils";
import {
  externalBookingUrl,
  type BusinessBooking,
} from "@/modules/businesses/booking";

// TYPES
interface ExternalBookingButtonProps {
  business: BusinessBooking & { name: string };
  className?: string;
}

// COMPONENT
export const ExternalBookingButtonTA = ({
  business,
  className,
}: ExternalBookingButtonProps) => {
  const { t } = useTranslation("discoveryUi");
  const href = externalBookingUrl(business);
  if (!href)
    return (
      <ButtonTA disabled className={cn("min-w-0", className)}>
        {t("externalBookingUnavailable")}
      </ButtonTA>
    );
  return (
    <ButtonTA
      render={<a href={href} target="_blank" rel="noopener noreferrer" />}
      nativeButton={false}
      aria-label={t("externalBookingLabel", { name: business.name })}
      className={cn("h-auto min-h-10 min-w-0 whitespace-normal", className)}
    >
      {t("externalBooking")}
      <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
    </ButtonTA>
  );
};
