import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, CalendarDays } from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { TextareaTA } from "@/modules/benefits/components/TextareaTA";
import { useGroupCoordination } from "@/modules/groups/useGroupCoordination";

// COMPONENT
export const GroupsPage = () => {
  const { t } = useTranslation("growth");
  const { directory, editor, invitation, actions } = useGroupCoordination();
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <ActionHeaderTA
        eyebrow="habitu"
        title={t("groups")}
        description={t("groupsDescription")}
      />
      {directory.error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          {t("error")}{" "}
          <ButtonTA variant="ghost" onClick={directory.refresh}>
            {t("retry")}
          </ButtonTA>
        </p>
      )}
      {invitation.link && (
        <PanelTA title={t("share")} description={t("shareNote")}>
          <div className="px-5 pb-5">
            <InputTA
              aria-label={t("share")}
              value={invitation.link}
              readOnly
              onFocus={(event) => event.target.select()}
            />
          </div>
        </PanelTA>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <PanelTA title={t("newGroup")} description={t("pollNote")}>
          <form
            className="space-y-4 px-5 pb-5"
            onSubmit={(event) => {
              event.preventDefault();
              void editor.create();
            }}
          >
            <label className="block space-y-2 text-sm">
              {t("groupTitle")}
              <InputTA
                required
                maxLength={120}
                value={editor.title}
                onChange={(event) => editor.setTitle(event.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-2 text-sm">
                {t("appointmentId")}
                <InputTA
                  type="number"
                  min={1}
                  value={editor.appointment}
                  onChange={(event) =>
                    editor.setAppointment(event.target.value)
                  }
                />
              </label>
              <label className="block space-y-2 text-sm">
                {t("memberLimit")}
                <InputTA
                  type="number"
                  required
                  min={2}
                  max={100}
                  value={editor.limit}
                  onChange={(event) => editor.setLimit(event.target.value)}
                />
              </label>
            </div>
            <label className="block space-y-2 text-sm">
              {t("poll")}
              <TextareaTA
                rows={3}
                value={editor.options}
                onChange={(event) => editor.setOptions(event.target.value)}
              />
            </label>
            <ButtonTA type="submit" disabled={directory.busy}>
              <Users className="size-4" />
              {t("create")}
            </ButtonTA>
          </form>
        </PanelTA>
        <PanelTA title={t("invitation")}>
          <form
            className="space-y-4 px-5 pb-5"
            onSubmit={(event) => {
              event.preventDefault();
              void invitation.join();
            }}
          >
            <InputTA
              aria-label={t("invitation")}
              required
              placeholder={t("invitationPlaceholder")}
              value={invitation.token}
              onChange={(event) => invitation.setToken(event.target.value)}
            />
            <ButtonTA type="submit" disabled={directory.busy}>
              {t("join")}
            </ButtonTA>
          </form>
        </PanelTA>
      </div>
      {directory.loading ? (
        <p role="status">{t("loading")}</p>
      ) : directory.items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {t("noGroups")}
        </p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {directory.items.map((group) => (
            <PanelTA
              key={group.id}
              title={group.title}
              description={`${t(`status.${group.status}`)} · ${group.confirmed_count}/${group.member_limit} ${t("confirmed")}`}
            >
              <div className="space-y-4 px-5 pb-5">
                <p className="text-xs font-medium text-primary">
                  {t("organizerPays")}
                </p>
                {group.appointment ? (
                  <div className="rounded-xl bg-secondary p-4 text-sm">
                    <p className="font-semibold">
                      {group.appointment.service} ·{" "}
                      {group.appointment.resource ?? group.appointment.branch}
                    </p>
                    <p className="mt-1">
                      {group.appointment.date} · {group.appointment.start_time}
                    </p>
                    {group.appointment.id && (
                      <ButtonTA
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={
                          <Link
                            to={`/cliente/appointments/${group.appointment.id}`}
                          />
                        }
                      >
                        <CalendarDays className="size-4" />
                        {t("reservation")}
                      </ButtonTA>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("noReservation")}
                  </p>
                )}
                {group.options.map((option) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                    key={option.id}
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("votes", { count: option.votes })}
                      </p>
                    </div>
                    <ButtonTA
                      size="sm"
                      variant={option.selected ? "default" : "outline"}
                      disabled={directory.busy || group.status !== "OPEN"}
                      onClick={() =>
                        void actions.respond(group.id, "CONFIRMED", option.id)
                      }
                    >
                      {t("vote")}
                    </ButtonTA>
                  </div>
                ))}
                {group.is_organizer && group.members.length > 0 && (
                  <ul className="space-y-2 text-sm">
                    {group.members.map((member, index) => (
                      <li className="flex justify-between gap-3" key={index}>
                        <span>{member.name}</span>
                        <span className="text-muted-foreground">
                          {t(`response.${member.response}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {group.status === "OPEN" && (
                  <div className="flex flex-wrap gap-2">
                    {group.is_organizer ? (
                      <>
                        <ButtonTA
                          variant="outline"
                          title={t("renewNote")}
                          disabled={directory.busy}
                          onClick={() => void invitation.create(group.id)}
                        >
                          {t("renewLink")}
                        </ButtonTA>
                        <ButtonTA
                          variant="ghost"
                          disabled={directory.busy}
                          onClick={() => void actions.close(group.id)}
                        >
                          {t("closeGroup")}
                        </ButtonTA>
                        {!group.appointment && editor.appointment && (
                          <ButtonTA
                            disabled={directory.busy}
                            onClick={() =>
                              void actions.attach(
                                group.id,
                                Number(editor.appointment),
                              )
                            }
                          >
                            {t("attach")}
                          </ButtonTA>
                        )}
                      </>
                    ) : (
                      <ButtonTA
                        variant="outline"
                        disabled={directory.busy}
                        onClick={() =>
                          void actions.respond(
                            group.id,
                            group.my_response === "CONFIRMED"
                              ? "DECLINED"
                              : "CONFIRMED",
                          )
                        }
                      >
                        {t(
                          group.my_response === "CONFIRMED"
                            ? "decline"
                            : "join",
                        )}
                      </ButtonTA>
                    )}
                  </div>
                )}
              </div>
            </PanelTA>
          ))}
        </div>
      )}
    </main>
  );
};
