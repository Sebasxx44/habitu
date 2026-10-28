import { useState } from "react";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

// COMPONENT
export const RatingInputTA = ({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (rating: number) => void;
}) => {
  const { t } = useTranslation();
  const [hover, setHover] = useState(0);
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={t("reviews.stars", { count: star })}
            aria-pressed={value === star}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(value === star ? 0 : star)}
            className="grid size-11 place-items-center rounded-xl focus-visible:outline focus-visible:outline-primary"
          >
            <Star
              className={`size-6 ${star <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
            />
          </button>
        ))}
      </div>
    </fieldset>
  );
};
