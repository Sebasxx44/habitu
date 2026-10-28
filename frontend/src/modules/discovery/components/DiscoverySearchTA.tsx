import { useTranslation } from 'react-i18next';
import {
  Search,
  ArrowUpRight,
  MapPin,
  Scissors,
  User,
  Layers,
} from "lucide-react";
import { InputTA } from "@/components/TA/InputTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { cn } from "@/lib/utils";
import { useDiscoveryCombobox } from "@/modules/discovery/composables/useDiscoveryCombobox";
import type { DiscoverySearchState } from "@/modules/discovery/searchTypes";

// COMPONENT
export const DiscoverySearchTA = ({
  search,
}: {
  search: DiscoverySearchState["search"];
}) => {
  const { t: ui } = useTranslation("discoveryUi");
  const { combobox, actions } = useDiscoveryCombobox(search);
  const icons = {
    business: MapPin,
    service: Scissors,
    professional: User,
    category: Layers,
    zone: MapPin,
  };
  const labels = {
    business: ui("suggestion.business"),
    service: ui("suggestion.service"),
    professional: ui("suggestion.professional"),
    category: ui("suggestion.category"),
    zone: ui("suggestion.zone"),
  };
  return (
    <div
      className="relative min-w-0 flex-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          actions.close();
      }}
    >
      <label htmlFor={combobox.inputId} className="absolute left-10 top-2 z-10 text-[11px] font-bold">
        {ui("what")}
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-primary" aria-hidden="true" />
      <InputTA
        id={combobox.inputId}
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={combobox.expanded}
        aria-controls={combobox.expanded ? combobox.listId : undefined}
        aria-activedescendant={combobox.activeId}
        value={search.draft}
        placeholder={ui("searchPlaceholder")}
        className="h-14 min-w-0 rounded-xl border-transparent bg-transparent pb-1 pl-10 pt-5 text-base shadow-none focus-visible:-outline-offset-2"
        onFocus={actions.open}
        onChange={(event) => actions.change(event.target.value)}
        onKeyDown={actions.navigate}
      />
      {combobox.expanded && (
        <ul
          role="listbox"
          id={combobox.listId}
          aria-label={ui("suggestions")}
          className="absolute left-0 right-0 top-full z-[800] mt-2 max-h-80 min-w-[min(24rem,calc(100vw-5rem))] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-xl"
        >
          {search.suggestions.map((suggestion, index) => {
            const Icon = icons[suggestion.type];
            return (
              <li
                role="presentation"
                key={`${suggestion.type}:${suggestion.id}:${suggestion.label}`}
              >
                <ButtonTA
                  type="button"
                  variant="ghost"
                  role="option"
                  tabIndex={-1}
                  aria-selected={combobox.isActive(index)}
                  id={combobox.optionId(index)}
                  className={cn(
                    "flex h-auto min-h-12 w-full justify-start gap-3 whitespace-normal rounded-xl p-3 text-left hover:bg-secondary",
                    combobox.isActive(index) && "bg-secondary",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => actions.choose(suggestion)}
                >
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {suggestion.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {labels[suggestion.type]}
                    </span>
                  </span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground" />
                </ButtonTA>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
