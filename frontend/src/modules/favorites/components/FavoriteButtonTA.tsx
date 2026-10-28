import { Heart, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { useAccountFavorites } from "@/modules/favorites/FavoritesProvider";
import type { FavoriteType } from "@/modules/favorites/types";

// COMPONENT
export const FavoriteButtonTA = ({
  type,
  id,
  className,
}: {
  type: FavoriteType;
  id: number;
  className?: string;
}) => {
  const { t } = useTranslation();
  const { state, actions } = useAccountFavorites();
  const saved = state.ids[type].includes(id);
  return (
    <ButtonTA
      size="icon"
      variant="ghost"
      className={className}
      aria-label={t(saved ? "favorites.remove" : "favorites.save")}
      aria-pressed={saved}
      disabled={state.loading || state.pending !== null}
      onClick={(event) => {
        event.stopPropagation();
        void actions.toggle(type, id);
      }}
    >
      {state.pending === `${type}:${id}` ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Heart className={saved ? "fill-primary text-primary" : ""} />
      )}
    </ButtonTA>
  );
};
