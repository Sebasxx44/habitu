import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BookingIntentsTA } from "@/modules/discovery/components/BookingIntentsTA";
import { DiscoveryIntentsTA } from "@/modules/marketplace/components/DiscoveryIntentsTA";
import type { DiscoveryFilterChange } from "@/modules/discovery/searchTypes";

// TYPES
interface DiscoveryIdeasProps {
  onChoose: (filters: DiscoveryFilterChange) => void;
}

// COMPONENT
export const DiscoveryIdeasTA = ({ onChoose }: DiscoveryIdeasProps) => {
  // COMPOSABLES
  const { t: ui } = useTranslation("discoveryUi");

  // RENDER
  return (
    <details className="group min-w-0 rounded-2xl border border-border bg-card px-4">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
        {ui("exploreIdeas")}
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-5 border-t border-border pb-4 pt-5">
        <DiscoveryIntentsTA onChoose={onChoose} />
        <BookingIntentsTA />
      </div>
    </details>
  );
};
