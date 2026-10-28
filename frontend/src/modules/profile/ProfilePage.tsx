import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Gift,
  Heart,
  Bell,
  Camera,
  LogOut,
  UserRound,
} from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { StateTA } from "@/components/TA/StateTA";
import { SkeletonTA } from "@/components/TA/SkeletonTA";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/modules/profile/composables/useProfile";
import { ProfileContactTA } from "@/modules/profile/components/ProfileContactTA";
import { ProfilePreferencesTA } from "@/modules/profile/components/ProfilePreferencesTA";
import { ProfileSecurityTA } from "@/modules/profile/components/ProfileSecurityTA";
import { AnalyticsPreferencesTA } from "@/modules/analytics/components/AnalyticsPreferencesTA";
import { formatDate } from "@/i18n/formatters";
// PAGE
export const ProfilePage = () => {
  const { t } = useTranslation("profile");
  const { account, changes } = useProfile();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const file = useRef<HTMLInputElement>(null);
  const data = account.data;
  return (
    <div className="page-enter mx-auto min-w-0 max-w-6xl space-y-7 pb-10">
      <ActionHeaderTA
        icon={UserRound}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      {account.error && data && <p role="alert" className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">{account.error}</p>}
      {account.loading ? (
        <SkeletonTA variant="dashboard" label={t("loading")} />
      ) : !data ? (
        <StateTA
          error
          title={t("loadError")}
          description={account.error}
          onRetry={account.reload}
        />
      ) : (
        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-5 lg:sticky lg:top-6">
            <section className="surface-card rounded-2xl border border-primary/15 bg-primary/5 p-6">
              <Avatar className="size-24 rounded-3xl">
                {data.user.avatar_url && (
                  <AvatarImage src={data.user.avatar_url} alt={t("photo")} />
                )}
                <AvatarFallback className="rounded-3xl bg-primary/10 text-2xl font-semibold text-primary">
                  {data.user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-5 break-words text-xl font-semibold">
                {data.user.name}
              </h2>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {data.user.email}
              </p>
              {data.user.created_at && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {t("memberSince", { date: formatDate(data.user.created_at) })}
                </p>
              )}
              <input
                ref={file}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={t("upload")}
                disabled={changes.busy}
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) void changes.avatar(selected);
                  event.target.value = "";
                }}
              />
              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonTA
                  variant="outline"
                  className="text-xs"
                  disabled={changes.busy}
                  onClick={() => file.current?.click()}
                >
                  <Camera className="size-3.5" />
                  {t("upload")}
                </ButtonTA>
                {data.user.avatar_url && (
                  <ButtonTA
                    variant="ghost"
                    className="text-xs"
                    disabled={changes.busy}
                    onClick={() => void changes.removeAvatar()}
                  >
                    {t("removePhoto")}
                  </ButtonTA>
                )}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                {t("photoHelp")}
              </p>
            </section>
            {data.user.role === "CLIENTE" && (
              <nav
                aria-label={t("activity")}
                className="divide-y divide-border rounded-2xl border border-border bg-card"
              >
                {[
                  {
                    title: "appointments",
                    path: "/cliente/appointments",
                    icon: CalendarDays,
                  },
                  { title: "benefits", path: "/cliente/benefits", icon: Gift },
                  {
                    title: "favorites",
                    path: "/cliente/favorites",
                    icon: Heart,
                  },
                  {
                    title: "inbox",
                    path: "/cliente/notifications",
                    icon: Bell,
                  },
                ].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex min-h-14 items-center gap-3 px-5 py-3 text-sm hover:text-primary"
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    {t(item.title)}
                    <ArrowUpRight className="ml-auto size-3.5" />
                  </Link>
                ))}
              </nav>
            )}
            <ButtonTA
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="size-4" />
              {t("logout")}
            </ButtonTA>
          </aside>
          <div className="min-w-0 space-y-6">
            {changes.error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
              >
                {changes.error}
              </p>
            )}
            {changes.saved && !changes.error && (
              <p
                role="status"
                className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary"
              >
                {t("saved")}
              </p>
            )}
            <ProfileContactTA data={data} changes={changes} />
            <ProfilePreferencesTA data={data} changes={changes} />
            <ProfileSecurityTA data={data} changes={changes} />
            <AnalyticsPreferencesTA />
          </div>
        </div>
      )}
    </div>
  );
};
