import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// TYPES
export interface BrandLogoTAProps {
  className?: string;
  variant?: "icon" | "horizontal" | "vertical";
  showTagline?: boolean;
  tone?: "light" | "dark";
  decorative?: boolean;
}

// COMPONENT
export const BrandLogoTA = ({
  className,
  variant = "horizontal",
  showTagline = false,
  tone,
  decorative = false,
}: BrandLogoTAProps) => {
  const { t } = useTranslation();
  const isIcon = variant === "icon";
  const isVertical = variant === "vertical";
  const lightAsset = isVertical
    ? brand.assets.stackedLight
    : brand.assets.horizontalLight;
  const darkAsset = isVertical
    ? brand.assets.stackedDark
    : brand.assets.horizontalDark;
  const label = decorative ? "" : brand.name;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 flex-col items-start justify-center",
        isIcon ? "h-10 w-10" : isVertical ? "w-28 items-center" : "w-28",
        showTagline && !isIcon && "min-w-[200px]",
        className,
      )}
    >
      {isIcon ? (
        <img
          src={brand.assets.symbol}
          alt={label}
          width={204}
          height={231}
          className="h-full w-full object-contain"
        />
      ) : tone ? (
        <img
          src={tone === "dark" ? darkAsset : lightAsset}
          alt={label}
          width={isVertical ? 258 : 566}
          height={isVertical ? 244 : 128}
          className="h-auto w-full"
        />
      ) : (
        <>
          <img
            src={lightAsset}
            alt={label}
            width={isVertical ? 258 : 566}
            height={isVertical ? 244 : 128}
            className="h-auto w-full dark:hidden"
          />
          <img
            src={darkAsset}
            alt={label}
            width={isVertical ? 258 : 566}
            height={isVertical ? 244 : 128}
            className="hidden h-auto w-full dark:block"
          />
        </>
      )}
      {showTagline && !isIcon && (
        <span
          className={cn(
            "mt-2 text-[11px] font-semibold tracking-normal",
            tone === "dark"
              ? "text-[#F5F7FF]"
              : tone === "light"
                ? "text-[#171A2B]"
                : "text-foreground",
            isVertical && "text-center",
          )}
        >
          {t("shared.tagline", { defaultValue: brand.tagline })}
        </span>
      )}
    </span>
  );
};
