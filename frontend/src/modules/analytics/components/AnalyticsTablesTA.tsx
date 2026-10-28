import { AnalyticsPerformanceChartTA } from "@/modules/analytics/components/AnalyticsPerformanceChartTA";
import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { AnalyticsEntityDetailTA } from "@/modules/analytics/components/AnalyticsEntityDetailTA";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { formatCurrency, formatNumber } from "@/i18n/formatters";
import type {
  AnalyticsOverview,
  PerformanceRow,
  PlatformAnalytics,
} from "@/modules/analytics/types";

// COMPONENTS
export const AnalyticsPerformanceTA = ({
  title,
  rows,
  currency,
  service = false,
  professional = false,
  conversion = [],
}: {
  title: string;
  rows: PerformanceRow[];
  currency: string;
  service?: boolean;
  professional?: boolean;
  conversion?: AnalyticsOverview["telemetry"]["serviceConversion"];
}) => {
  const { t } = useTranslation("analytics");
  const [ascending, setAscending] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const sorted = [...rows].sort((a, b) =>
    ascending
      ? a.reservations - b.reservations
      : b.reservations - a.reservations,
  );
  const headings = [
    "name",
    "reservations",
    "completed",
    "cancelled",
    ...(service ? ["averagePrice", "change"] : ["clients"]),
    "revenue",
    ...(service ? ["conversion"] : []),
  ];
  return (
    <PanelTA
      title={title}
      description={t(service ? "serviceDescription" : "performanceDescription")}
      action={
        <label className="text-xs text-muted-foreground">
          <span className="sr-only">{t("sort")}</span>
          <select
            value={ascending ? "ascending" : "descending"}
            onChange={(event) =>
              setAscending(event.target.value === "ascending")
            }
            className="min-h-10 max-w-full rounded-lg border border-input bg-background px-3"
          >
            <option value="descending">{t("mostBooked")}</option>
            <option value="ascending">{t("leastBooked")}</option>
          </select>
        </label>
      }
    >
      {rows.length ? (
        <div>
          <AnalyticsPerformanceChartTA rows={sorted} currency={currency} title={title} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground">
                <tr>
                  {headings.map((key) => (
                    <th
                      key={key}
                      scope="col"
                      className="whitespace-nowrap px-5 py-3 font-medium"
                    >
                      {t(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((row) => (
                  <Fragment key={row.id}>
                    <tr>
                      <th
                        scope="row"
                        className="min-w-[190px] px-5 py-4 font-medium"
                      >
                        {row.name}
                        {!service && (
                          <ButtonTA
                            className="mt-1 block min-h-8 px-0 text-xs"
                            variant="ghost"
                            aria-expanded={expanded === row.id}
                            aria-controls={`analytics-${title}-${row.id}`}
                            onClick={() =>
                              setExpanded(expanded === row.id ? null : row.id)
                            }
                          >
                            {t(expanded === row.id ? "hideDetails" : "details")}
                          </ButtonTA>
                        )}
                      </th>
                      <td className="px-5 py-4 tabular-nums">
                        {formatNumber(row.reservations)}
                      </td>
                      <td className="px-5 py-4 tabular-nums">
                        {formatNumber(row.completed)}
                      </td>
                      <td className="px-5 py-4 tabular-nums">
                        {formatNumber(row.cancelled)}
                      </td>
                      {service ? (
                        <>
                          <td className="whitespace-nowrap px-5 py-4 tabular-nums">
                            {row.averagePrice == null
                              ? t("noData")
                              : formatCurrency(row.averagePrice, currency)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 tabular-nums">
                            {row.change == null
                              ? "—"
                              : `${formatNumber(row.change, { maximumFractionDigits: 1 })}%`}
                          </td>
                        </>
                      ) : (
                        <td className="px-5 py-4 tabular-nums">
                          {row.clients == null
                            ? "—"
                            : formatNumber(row.clients)}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-5 py-4 font-medium tabular-nums">
                        {formatCurrency(row.revenue, currency)}
                      </td>
                      {service && (
                        <td className="whitespace-nowrap px-5 py-4 tabular-nums">
                          {conversion.find((entry) => entry.id === row.id)
                            ? `${formatNumber(conversion.find((entry) => entry.id === row.id)?.rate ?? 0, { maximumFractionDigits: 1 })}%`
                            : t("noData")}
                        </td>
                      )}
                    </tr>
                    {!service && expanded === row.id && (
                      <tr id={`analytics-${title}-${row.id}`}>
                        <td
                          colSpan={headings.length}
                          className="bg-secondary/20"
                        >
                          <AnalyticsEntityDetailTA
                            row={row}
                            professional={professional}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {service && (
            <p className="border-t border-border px-5 py-3 text-xs leading-relaxed text-muted-foreground">
              {t("serviceConversionDescription")}
            </p>
          )}
        </div>
      ) : (
        <StateTA title={t("empty")} description={t("emptyDescription")} />
      )}
    </PanelTA>
  );
};
export const AnalyticsPromotionsTA = ({ data }: { data: AnalyticsOverview }) => {
  const { t } = useTranslation("analytics");
  return <div className="grid min-w-0 gap-6 xl:grid-cols-2">
    <InteractiveChartTA title={`${t("promotions")} · ${t("reservations")}`} data={data.promotions.map((row) => ({ label: `${row.name} · #${row.id}`, values: { count: row.reservations } }))} series={[{ key: "count", label: t("reservations") }]} initialType="bar" allowedTypes={["bar", "pie", "table"]} />
    <InteractiveChartTA title={`${t("promotions")} · ${t("discount")}`} data={data.promotions.map((row) => ({ label: `${row.name} · #${row.id}`, values: { discount: row.discount } }))} series={[{ key: "discount", label: t("discount"), format: "currency" }]} currency={data.currency} initialType="bar" allowedTypes={["bar", "pie", "table"]} />
  </div>;
};
export const AnalyticsGeographyTA = ({
  data,
}: {
  data: PlatformAnalytics["geography"];
}) => {
  const { t } = useTranslation("analytics");
  const [country, setCountry] = useState("all");
  const cities = data.cities.filter(
    (city) => country === "all" || city.countryId === Number(country),
  );
  return (
    <PanelTA
      title={t("geography")}
      description={t("geographicDescription", { count: data.minimumGroup })}
      action={
        <label className="text-xs">
          <span className="sr-only">{t("country")}</span>
          <select
            className="min-h-10 max-w-full rounded-lg border border-input bg-background px-3"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            <option value="all">{t("allCountries")}</option>
            {data.countries.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
      }
    >
      {cities.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>
                {["cities", "reservations", "people", "businessesCount"].map(
                  (key) => (
                    <th
                      scope="col"
                      className="whitespace-nowrap px-5 py-3 font-medium"
                      key={key}
                    >
                      {t(key)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cities.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="px-5 py-4 font-medium">
                    {row.name}
                  </th>
                  <td className="px-5 py-4">
                    {formatNumber(row.reservations)}
                  </td>
                  <td className="px-5 py-4">{formatNumber(row.clients)}</td>
                  <td className="px-5 py-4">{formatNumber(row.businesses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <StateTA
          title={t("noGeography")}
          description={t("geographicDescription", { count: data.minimumGroup })}
        />
      )}
    </PanelTA>
  );
};
