import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PanelTA } from "@/components/TA/PanelTA";
import { ExternalBookingButtonTA } from "@/modules/businesses/components/ExternalBookingButtonTA";
import {
  listingSourceUrl,
  type BusinessBooking,
} from "@/modules/businesses/booking";

// TYPES
interface ExternalBookingPanelProps {
  business: BusinessBooking & { name: string };
}

// COMPONENT
export const ExternalBookingPanelTA = ({
  business,
}: ExternalBookingPanelProps) => {
  const { t } = useTranslation("discoveryUi");
  const source = listingSourceUrl(business);
  return (
    <PanelTA
      title={t("externalBooking")}
      description={t("externalBookingDescription")}
      icon={ArrowUpRight}
    >
      <div className="space-y-4 p-5 pt-4 md:px-6">
        <ExternalBookingButtonTA business={business} className="w-full" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("externalBookingNotice")}
        </p>
        {source && (
          <a
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t("listingSource")}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </PanelTA>
  );
};
