import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import {
  discoveryGuidePath,
  discoveryHeroPhoto,
} from "@/modules/discovery/hero/content";

// TYPES
interface DiscoveryHeroVisualProps {
  onSearch: () => void;
}

// COMPONENT
export const DiscoveryHeroVisualTA = ({
  onSearch,
}: DiscoveryHeroVisualProps) => {
  const { t: ui } = useTranslation("discoveryUi");
  // STATE
  const [imageFailed, setImageFailed] = useState(false);

  // RENDER
  return (
    <div className="habitu-discovery-visual">
      {!imageFailed && (
        <img
          src={discoveryHeroPhoto.src}
          alt=""
          loading="eager"
          decoding="async"
          onError={() => setImageFailed(true)}
          className="habitu-discovery-photo"
        />
      )}
      <div className="habitu-discovery-shade" aria-hidden="true" />
      <div className="mx-auto max-w-7xl">
        <p className="inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 sm:text-xs">
          <span
            className="size-1.5 rounded-full bg-accent"
            aria-hidden="true"
          />
          {ui("immersiveEyebrow")}
        </p>
        <div className="habitu-discovery-heading mt-5">
          <ActionHeaderTA
            variant="plain"
            title={ui("immersiveTitle")}
            description={ui("immersiveDescription")}
          />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
          <ButtonTA
            onClick={onSearch}
            className="h-12 rounded-full bg-accent px-4 text-xs text-accent-foreground shadow-none hover:bg-accent/90 hover:text-accent-foreground sm:px-6 sm:text-sm"
          >
            {ui("immersiveAction")}
            <ArrowDownRight className="size-4" aria-hidden="true" />
          </ButtonTA>
          <ButtonTA
            variant="ghost"
            render={<a href={discoveryGuidePath} />}
            nativeButton={false}
            className="h-12 rounded-full border border-white/35 px-3 text-xs text-white hover:bg-white/15 hover:text-white focus-visible:outline-white sm:px-5 sm:text-sm"
          >
            <PlayCircle className="hidden size-4 sm:block" aria-hidden="true" />
            {ui("howItWorks")}
          </ButtonTA>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="hidden text-xs text-white/85 lg:block">
            {ui("immersiveNote")}
          </p>
          {!imageFailed && (
            <a
              href={discoveryHeroPhoto.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-lg text-[11px] leading-relaxed text-white/85 underline-offset-4 hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white lg:ml-auto"
              aria-label={ui("heroPhotoSource", {
                name: discoveryHeroPhoto.business,
              })}
            >
              {ui("heroCredit", {
                name: discoveryHeroPhoto.business,
                city: discoveryHeroPhoto.location,
              })}
              <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
