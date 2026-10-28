import {
  Activity,
  Building2,
  Dumbbell,
  Flower2,
  House,
  Scissors,
  Sparkles,
} from "lucide-react";

// HELPERS
export const categoryAppearance = (name: string) => {
  const normalized = name.toLocaleLowerCase("es");
  if (/barb|peluq|belleza|estét|beauty|salon/.test(normalized))
    return {
      Icon: Scissors,
      description: "beauty",
      tone: "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
    } as const;
  if (/spa|bienestar|masaj|wellness/.test(normalized))
    return {
      Icon: Flower2,
      description: "wellness",
      tone: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    } as const;
  if (/gym|gimn|deport|entren|cancha|fútbol|padel|pádel/.test(normalized))
    return {
      Icon: Dumbbell,
      description: "sports",
      tone: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
    } as const;
  if (/espacio|cowork|sala|oficina/.test(normalized))
    return {
      Icon: Building2,
      description: "spaces",
      tone: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
    } as const;
  if (/hogar|limpieza|home/.test(normalized))
    return {
      Icon: House,
      description: "home",
      tone: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    } as const;
  if (/salud|fisio|dental|odont/.test(normalized))
    return {
      Icon: Activity,
      description: "health",
      tone: "bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200",
    } as const;
  return {
    Icon: Sparkles,
    description: "explore",
    tone: "bg-secondary text-secondary-foreground",
  } as const;
};
