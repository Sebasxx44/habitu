import { useState } from "react";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { benefitAdminPath } from "@/modules/benefits/adminPresentation";
import type { AdminBenefitsData } from "@/modules/benefits/adminTypes";

// COMPONENT
export const AdminLoyaltyCardsTA = ({ cards, setPage, businessId }: { cards: AdminBenefitsData["cards"]; setPage: (page: number) => void; businessId: number }) => {
  // STATE
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  // COMPUTED
  const items = cards.data.filter((card) => `${card.client.name} ${card.program.name}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <PanelTA title="Tarjetas de clientes" description={`${cards.total} tarjetas registradas. Consulta el historial o registra un sello manual desde su ficha.`}>
    <div className="px-5 pb-4 md:px-6"><InputTA placeholder="Buscar cliente o programa en esta página…" aria-label="Buscar tarjetas en la página actual" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    {items.length ? <div className="divide-y divide-border border-t border-border">{items.map((card) => <article className="flex flex-wrap items-center gap-4 px-5 py-4 md:px-6" key={card.id}><span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{card.client.name.split(" ").slice(0, 2).map((word) => word[0]).join("")}</span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{card.client.name}</h3><p className="mt-1 text-xs text-muted-foreground">{card.program.name}</p><div className="mt-2 flex max-w-60 items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, card.current_stamps / Math.max(1, card.program.stamps_required) * 100)}%` }} /></div><span className="text-[11px] text-muted-foreground">{card.current_stamps}/{card.program.stamps_required}</span></div></div>{card.reward_available && <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400"><BadgeCheck className="size-3.5" />Recompensa lista</span>}<ButtonTA variant="outline" onClick={() => navigate(benefitAdminPath("programs", businessId, `/cards/${card.id}`))}>Ver tarjeta<ArrowRight /></ButtonTA></article>)}</div> : <StateTA title="Sin tarjetas en esta selección" description={cards.total ? "Busca otro nombre o cambia de página." : "Las tarjetas se crean cuando tus clientes se inscriben en un programa."} />}
    {cards.last_page > 1 && <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4"><ButtonTA variant="outline" disabled={cards.current_page <= 1} onClick={() => { setSearch(""); setPage(cards.current_page - 1); }}>Anterior</ButtonTA><span className="text-xs text-muted-foreground">{cards.current_page} de {cards.last_page}</span><ButtonTA variant="outline" disabled={cards.current_page >= cards.last_page} onClick={() => { setSearch(""); setPage(cards.current_page + 1); }}>Siguiente</ButtonTA></div>}
  </PanelTA>;
};
