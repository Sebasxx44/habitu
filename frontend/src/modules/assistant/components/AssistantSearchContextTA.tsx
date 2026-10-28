import { CalendarDays, Clock3, MapPin, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDate, formatTime } from "@/i18n/formatters";
import type { AssistantSearchContext } from "@/modules/assistant/types";

// TYPES
interface AssistantSearchContextProps {
  context: AssistantSearchContext;
}

// COMPONENT
export const AssistantSearchContextTA = ({
  context,
}: AssistantSearchContextProps) => {
  const { t } = useTranslation("marketplace");
  if (!context.q && !context.date && !context.zone && !context.time_from)
    return null;
  return (
    <ul
      aria-label={t("concierge.interpreted")}
      className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-muted-foreground"
    >
      {context.q && (
        <li className="inline-flex items-center gap-1">
          <Search aria-hidden="true" className="size-3" />
          {context.q}
        </li>
      )}
      {context.date && (
        <li className="inline-flex items-center gap-1">
          <CalendarDays aria-hidden="true" className="size-3" />
          {formatDate(context.date)}
          {context.date_to && context.date_to !== context.date
            ? ` – ${formatDate(context.date_to)}`
            : ""}
        </li>
      )}
      {context.time_from && (
        <li className="inline-flex items-center gap-1">
          <Clock3 aria-hidden="true" className="size-3" />
          {formatTime(context.time_from)}
          {context.time_to && context.time_to !== context.time_from
            ? ` – ${formatTime(context.time_to)}`
            : ""}
        </li>
      )}
      {context.zone && (
        <li className="inline-flex items-center gap-1">
          <MapPin aria-hidden="true" className="size-3" />
          {context.zone}
        </li>
      )}
    </ul>
  );
};
