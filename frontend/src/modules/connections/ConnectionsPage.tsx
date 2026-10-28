import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { CalendarConnectionTA } from "@/modules/connections/components/CalendarConnectionTA";
import { PushConnectionTA } from "@/modules/connections/components/PushConnectionTA";

// COMPONENT
export const ConnectionsPage = () => {
  // COMPOSABLES
  const { user } = useAuth();
  const { i18n } = useTranslation();
  // COMPUTED
  const english = i18n.language.startsWith("en");
  // RENDER
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <ActionHeaderTA
        eyebrow={english ? "Your preferences" : "Tus preferencias"}
        title={english ? "Calendar and connections" : "Calendario y conexiones"}
        description={
          english
            ? "Manage your calendar access and device permissions."
            : "Gestiona el acceso a tu calendario y los permisos del dispositivo."
        }
      />
      <PushConnectionTA />
      {user?.role !== "CLIENTE" && <CalendarConnectionTA />}
    </div>
  );
};
