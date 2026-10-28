import { CalendarDays, Clock3, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";

// COMPONENT
export const BookingIntentsTA = () => {
  const { t } = useTranslation("growth");
  const intents = [
    { key: "now", icon: Clock3, to: "/cliente/on-demand" },
    { key: "schedule", icon: CalendarDays, to: "/cliente/explore" },
    { key: "home", icon: MapPin, to: "/cliente/home-service" },
    { key: "groups", icon: Users, to: "/cliente/groups" },
  ];
  return <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t("schedule")}>{intents.map(({ key, icon: Icon, to }) => <ButtonTA key={key} nativeButton={false} variant={key === "now" ? "default" : "outline"} className="min-h-12 justify-start rounded-xl" render={<Link to={to} />}><Icon className="size-4" />{t(key)}</ButtonTA>)}</nav>;
};
