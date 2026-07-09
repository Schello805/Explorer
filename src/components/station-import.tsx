"use client";

import { useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import type { Category, Station, StationStatus } from "@/lib/types";

type Row = Record<string, string>;

export function StationImport({ tenantId, categories, onImport }: {
  tenantId: string;
  categories: Category[];
  onImport: (stations: Station[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  async function readFile(file: File) {
    setErrors([]);
    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const lines = (await file.text()).split(/\r?\n/).filter(Boolean);
        const separator = lines[0].includes(";") ? ";" : ",";
        const headers = lines[0].split(separator).map(normalize);
        setRows(lines.slice(1).map((line) => Object.fromEntries(line.split(separator).map((value, index) => [headers[index], value.trim()]))));
      } else {
        const { readSheet } = await import("read-excel-file/browser");
        const sheet = await readSheet(file);
        const headers = sheet[0].map((value) => normalize(String(value ?? "")));
        setRows(sheet.slice(1).map((line) => Object.fromEntries(line.map((value, index) => [headers[index], String(value ?? "").trim()]))));
      }
    } catch {
      setErrors(["Datei konnte nicht gelesen werden."]);
    }
  }

  async function importRows() {
    const nextErrors: string[] = [];
    const stations = rows.flatMap((row, index) => {
      const latitude = Number(row.breitengrad || row.latitude);
      const longitude = Number(row.laengengrad || row.longitude);
      const name = row.name?.trim();
      if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        nextErrors.push(`Zeile ${index + 2}: Name oder Koordinaten fehlen.`);
        return [];
      }
      const category = categories.find((item) => item.id === row.kategorie || item.name.toLowerCase() === row.kategorie?.toLowerCase()) ?? categories[0];
      const status = ["open", "closed", "limited", "maintenance"].includes(row.status) ? row.status as StationStatus : "open";
      return [{ id: crypto.randomUUID(), tenantId, categoryId: category.id, name, shortDescription: row.kurzbeschreibung ?? "", description: row.beschreibung ?? "", openingHours: row.oeffnungszeiten || "Keine Angabe", status, latitude, longitude, position: { x: 50, y: 50 }, image: "linear-gradient(135deg, #c9d8c2, #527761)" }];
    });
    setErrors(nextErrors);
    if (nextErrors.length) return;
    await onImport(stations);
    setRows([]);
    setOpen(false);
  }

  if (!open) return <button onClick={() => setOpen(true)} className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold"><Upload size={17} className="mr-2 inline" /> Import</button>;
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/35 p-4">
    <section className="max-h-full w-full max-w-5xl overflow-x-hidden overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words font-display text-2xl">Stationen importieren</h2><p className="text-sm text-black/45">CSV oder XLSX · Vorschau vor dem Speichern</p></div><button aria-label="Import schließen" className="shrink-0" onClick={() => setOpen(false)}><X /></button></div>
      <label className="mt-5 grid cursor-pointer place-items-center rounded-xl border border-dashed border-black/20 bg-[#f7f7f4] p-5 text-center"><FileSpreadsheet className="text-[#286551]" /><strong className="mt-2 text-sm">Datei auswählen</strong><span className="break-words text-xs text-black/40">Name, Kategorie, Breitengrad, Längengrad, Status, Öffnungszeiten</span><input type="file" accept=".csv,.xlsx" className="sr-only" onChange={(event) => event.target.files?.[0] && readFile(event.target.files[0])} /></label>
      {errors.map((error) => <p key={error} className="mt-3 break-words rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>)}
      {rows.length > 0 && <><div className="mt-5 max-w-full overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b">{Object.keys(rows[0]).map((header) => <th key={header} className="p-2">{header}</th>)}</tr></thead><tbody>{rows.slice(0, 20).map((row, index) => <tr key={index} className="border-b border-black/5">{Object.keys(rows[0]).map((header) => <td key={header} className="p-2">{row[header]}</td>)}</tr>)}</tbody></table></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-bold">{rows.length} Datensätze</span><button onClick={importRows} className="rounded-xl bg-[#173c32] px-5 py-3 text-sm font-bold text-white">Prüfen und importieren</button></div></>}
    </section>
  </div>;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replaceAll("ä", "ae").replaceAll("ö", "oe").replaceAll("ü", "ue").replaceAll("ß", "ss").replaceAll(" ", "");
}
