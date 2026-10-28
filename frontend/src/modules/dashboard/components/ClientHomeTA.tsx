import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { visibleNavigation } from "@/components/TA/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { HomeDiscoveryTA } from "@/modules/discovery/components/HomeDiscoveryTA";
import { HomePromotionsTA } from "@/modules/discovery/components/HomePromotionsTA";

// CONSTANTS
const shortcutPaths = [
  "/cliente/appointments",
  "/cliente/favorites",
  "/cliente/benefits",
  "/cliente/on-demand",
  "/cliente/analytics",
];

// COMPONENT
export const ClientHomeTA = () => {
  const { t } = useTranslation();
  const { permissions } = useAuth();
  const shortcuts = visibleNavigation("CLIENTE", permissions).filter((item) =>
    shortcutPaths.includes(item.path),
  );

  return (
    <div className="dashboard-enter space-y-7">
      <HomeDiscoveryTA />
      <HomePromotionsTA />
      <PanelTA title={t("shared.shortcuts")}>
        <nav
          aria-label={t("shared.shortcuts")}
          className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-3 md:px-6"
        >
          {shortcuts.map(({ path, label, icon: Icon }) => (
            <ButtonTA
              key={path}
              variant="outline"
              render={<Link to={path} />}
              nativeButton={false}
              className="min-w-0 justify-start whitespace-normal text-left"
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </ButtonTA>
          ))}
        </nav>
      </PanelTA>
    </div>
  );
};
