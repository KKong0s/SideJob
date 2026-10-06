/** Shape of every paginated list endpoint */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasNext: boolean;
}

/** Query string values; empty / null values are left out */
export type QueryParams = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

export function toHttpParams(params: QueryParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) out[key] = value.join(',');
    } else {
      out[key] = String(value);
    }
  }
  return out;
}
