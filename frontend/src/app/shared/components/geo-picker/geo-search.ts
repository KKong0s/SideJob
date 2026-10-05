// Text matching for province / district search (Thai or English, with or without prefixes)

const PREFIX = /^(จังหวัด|จ\.|อำเภอ|อ\.|เขต|ข\.)\s*/;

const ALIASES: Record<number, string[]> = {
  1: ['กทม', 'กรุงเทพ', 'bkk'], // Bangkok
};

export function normaliseQuery(text: string): string {
  return text.trim().toLowerCase().replace(PREFIX, '').replace(/\s+/g, '');
}

const compact = (text: string) => text.toLowerCase().replace(/\s+/g, '');

export interface Searchable {
  id: number;
  nameTh: string;
  nameEn: string;
}

/** Filters by query; names starting with the query come first. Keeps input order otherwise. */
export function searchPlaces<T extends Searchable>(items: T[], query: string): T[] {
  const q = normaliseQuery(query);
  if (!q) return items;

  const starts: T[] = [];
  const contains: T[] = [];
  for (const item of items) {
    const names = [compact(item.nameTh), compact(item.nameEn), ...(ALIASES[item.id] ?? [])];
    if (names.some((n) => n.startsWith(q))) starts.push(item);
    else if (names.some((n) => n.includes(q))) contains.push(item);
  }
  return [...starts, ...contains];
}
