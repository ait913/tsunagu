import { readFile } from "node:fs/promises";

import { parse } from "csv-parse/sync";

import { upsertAedDevice } from "./geo.js";

type CsvRecord = Record<string, string | undefined>;

const valueFromAliases = (record: CsvRecord, aliases: string[]): string | undefined => {
  for (const alias of aliases) {
    const value = record[alias];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const parseNumber = (value?: string): number | null => {
  if (!value) {
    return null;
  }
  const numeric = Number(value.replaceAll(",", "").trim());
  return Number.isFinite(numeric) ? numeric : null;
};

const parseIndoor = (value?: string): boolean | undefined => {
  if (!value) {
    return undefined;
  }
  if (/屋内|indoor|inside/i.test(value)) {
    return true;
  }
  if (/屋外|outdoor|outside/i.test(value)) {
    return false;
  }
  return undefined;
};

export const importAedNaviCsv = async (csvPath: string): Promise<{ imported: number; skipped: number }> => {
  const raw = await readFile(csvPath, "utf8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as CsvRecord[];

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const externalId =
      valueFromAliases(row, ["externalId", "id", "AED_ID", "aed_id", "管理番号", "識別子"]) ??
      `aed-${imported + skipped + 1}`;
    const name =
      valueFromAliases(row, ["name", "名称", "設置施設名", "施設名", "device_name"]) ?? "AED";
    const lat = parseNumber(valueFromAliases(row, ["lat", "latitude", "緯度"]));
    const lng = parseNumber(valueFromAliases(row, ["lng", "lon", "longitude", "経度"]));

    if (lat === null || lng === null) {
      skipped += 1;
      continue;
    }

    await upsertAedDevice({
      externalId,
      name,
      manufacturer: valueFromAliases(row, ["manufacturer", "メーカー", "製造元"]),
      model: valueFromAliases(row, ["model", "機種", "型番"]),
      installedAt: valueFromAliases(row, ["installedAt", "設置場所", "location", "所在地詳細"]),
      address: valueFromAliases(row, ["address", "住所", "所在地"]),
      hours: valueFromAliases(row, ["hours", "利用可能時間", "開放時間"]),
      indoor: parseIndoor(valueFromAliases(row, ["indoor", "屋内外", "indoor_outdoor"])),
      lat,
      lng,
    });
    imported += 1;
  }

  return { imported, skipped };
};
