import { useTranslation } from 'react-i18next';
import { useState } from "react";
import {
  Search,
  ArrowUpRight,
  MapPin,
  Scissors,
  User,
  Layers,
} from "lucide-react";
import { InputTA } from "@/components/TA/InputTA";
import { cn } from "@/lib/utils";
import type { DiscoverySearchState } from "@/modules/discovery/searchTypes";

// COMPONENT
export const DiscoverySearchTA = ({
  search,
}: {
  search: DiscoverySearchState["search"];
}) => {
  const { t: ui } = useTranslation("discoveryUi");
  const [active, setActive] = useState(-1);
  const expanded = search.suggest && search.suggestions.length > 0;
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
          search.setSuggest(false);
      }}
    >
      <label htmlFor="discovery-search" className="absolute left-12 top-2 z-10 text-[11px] font-bold">
        {ui("what")}
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary" />
      <InputTA
        id="discovery-search"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? "discovery-suggestions" : undefined}
        aria-activedescendant={
          expanded && active >= 0 ? `discovery-suggestion-${active}` : undefined
        }
        value={search.draft}
        placeholder={ui("searchPlaceholder")}
        className="h-14 rounded-xl border-transparent bg-transparent pb-1 pl-12 pt-5 text-xs shadow-none focus-visible:-outline-offset-2"
        onFocus={() => search.setSuggest(true)}
        onChange={(event) => {
          setActive(-1);
          search.setDraft(event.target.value);
          search.setSuggest(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") search.setSuggest(false);
          if (!expanded) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((value) =>
              Math.min(value + 1, search.suggestions.length - 1),
            );
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((value) => Math.max(value - 1, 0));
          }
          if (
            event.key === "Enter" &&
            active >= 0 &&
            search.suggestions[active]
          ) {
            event.preventDefault();
            search.choose(search.suggestions[active]);
            setActive(-1);
          }
        }}
      />
      {expanded && (
        <ul
          role="listbox"
          id="discovery-suggestions"
          aria-label={ui("suggestions")}
          className="absolute left-0 right-0 top-full z-[800] mt-2 max-h-80 overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-xl"
        >
          {search.suggestions.map((suggestion, index) => {
            const Icon = icons[suggestion.type];
            return (
              <li
                role="option"
                aria-selected={active === index}
                id={`discovery-suggestion-${index}`}
                key={`${suggestion.type}:${suggestion.id}:${suggestion.label}`}
              >
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-secondary",
                    active === index && "bg-secondary",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => search.choose(suggestion)}
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
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
