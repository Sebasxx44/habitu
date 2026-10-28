import { brand } from '@/config/brand'
import type { DetailedReport, ReportRecord } from "@/modules/reports/types";
import { statusLabels } from "@/modules/dashboard/formatters";

// HELPERS
const headers = [
  "Fecha",
  "Hora",
  "Cliente",
  "Profesional",
  "Servicio",
  "Estado",
  "Sede",
  "Moneda",
  "Valor servicio",
  "Descuento",
  "Valor final",
  "Pagos registrados",
  "Métodos de pago",
];
const row = (record: ReportRecord): (string | number)[] => [
  record.fecha,
  record.hora,
  record.cliente,
  record.barbero,
  record.servicio,
  statusLabels[record.estado] ?? record.estado,
  record.sucursal,
  record.currency,
  record.valor_servicio,
  record.descuento,
  record.valor_final,
  record.total_pagado,
  record.metodo_pago,
];
const download = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const fileName = (report: DetailedReport): string =>
  `HABITU_${report.period.start}_${report.period.end}_${report.currency}`;

// EXPORTS
export const exportReportCsv = (
  report: DetailedReport,
  records: ReportRecord[],
): void => {
  const cell = (value: string | number): string => {
    const text =
      typeof value === "string" && /^[\s]*[=+@-]/.test(value)
        ? `'${value}`
        : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  download(
    new Blob(
      [
        "\uFEFF",
        [headers, ...records.map(row)]
          .map((values) => values.map(cell).join(","))
          .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8;" },
    ),
    `${fileName(report)}.csv`,
  );
};

export const exportReportExcel = async (
  report: DetailedReport,
  records: ReportRecord[],
): Promise<void> => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Citas filtradas");
  sheet.addRow(headers);
  records.forEach((record) => sheet.addRow(row(record)));
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = 23;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  download(
    new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${fileName(report)}.xlsx`,
  );
};

export const exportReportPdf = async (
  report: DetailedReport,
  records: ReportRecord[],
): Promise<void> => {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  pdf.setFontSize(19);
  pdf.text(`${brand.name} | Reporte de actividad`, 15, 20);
  pdf.setFontSize(10);
  pdf.text(
    `${report.period.start} al ${report.period.end} | ${report.currency} | ${records.length} citas filtradas`,
    15,
    30,
  );
  pdf.text(
    "Los valores corresponden a servicios; no equivalen a cobros ni ganancia neta.",
    15,
    38,
  );
  let y = 51;
  records.forEach((record) => {
    if (y > 263) {
      pdf.addPage();
      y = 20;
    }
    const label = `${record.fecha} ${record.hora} | ${record.cliente} | ${record.servicio}`;
    const lines: string[] = pdf.splitTextToSize(label, 180);
    pdf.text(lines.slice(0, 2), 15, y);
    pdf.setTextColor(90);
    pdf.text(
      `${statusLabels[record.estado] ?? record.estado} | Valor: ${record.valor_final.toFixed(2)} ${record.currency} | Pagos: ${record.total_pagado.toFixed(2)}`,
      15,
      y + 11,
    );
    pdf.setTextColor(0);
    y += 25;
  });
  pdf.save(`${fileName(report)}.pdf`);
};
