import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import type { ProfileState, AccountProfile } from "@/modules/profile/types";
// COMPONENT
export const ProfileContactTA = ({
  data,
  changes,
}: {
  data: AccountProfile;
  changes: ProfileState["changes"];
}) => {
  const { t } = useTranslation("profile");
  const [name, setName] = useState(data.user.name);
  const [phone, setPhone] = useState(data.user.phone ?? "");
  const previous = useRef({ name: data.user.name, phone: data.user.phone ?? "" });
  useEffect(() => {
    const last = previous.current;
    setName(current => current === last.name ? data.user.name : current);
    setPhone(current => current === last.phone ? data.user.phone ?? "" : current);
    previous.current = { name: data.user.name, phone: data.user.phone ?? "" };
  }, [data.user.name, data.user.phone]);
  return (
    <PanelTA title={t("personal")} description={t("personalDescription")}>
      <form
        className="space-y-5 px-5 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          void changes.contact({
            name: name.trim(),
            phone: phone.trim() || null,
          });
        }}
      >
        <label className="block space-y-2 text-sm font-medium">
          {t("name")}
          <InputTA
            autoComplete="name"
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={changes.busy}
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          {t("phone")}
          <InputTA
            type="tel"
            autoComplete="tel"
            maxLength={30}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={changes.busy}
          />
        </label>
        <ButtonTA type="submit" disabled={changes.busy || !name.trim()}>
          {t(changes.busy ? "saving" : "save")}
        </ButtonTA>
      </form>
    </PanelTA>
  );
};
