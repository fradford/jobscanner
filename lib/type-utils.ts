export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function asString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(
      `Type coercion: the value ${value} is not a non-empty string`,
    );
  }
  return value.trim();
}

export function asBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(`Type coercion: the value ${value} is not a boolean`);
  }
  return value;
}

export function asNumber(value: unknown): number {
  if (typeof value !== "number") {
    throw new TypeError(`Type coercion: the value ${value} is not a number`);
  }
  return value;
}

export function asOptionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return asString(value);
}

export function asOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  return asBoolean(value);
}

export function asOptionalNumber(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  return asNumber(value);
}

export function asStringArray(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new TypeError(
      `Type coercion: the value ${value} is not an array of strings`,
    );
  }
  return value.map((item) => asString(item));
}

export function asBooleanArray(value: unknown): boolean[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "boolean")
  ) {
    throw new TypeError(
      `Type coercion: the value ${value} is not an array of booleans`,
    );
  }
  return value.map((item) => asBoolean(item));
}

export function asNumberArray(value: unknown): number[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "number")) {
    throw new TypeError(
      `Type coercion: the value ${value} is not an array of numbers`,
    );
  }
  return value.map((item) => asNumber(item));
}

export function asOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  return asStringArray(value);
}

export function asOptionalBooleanArray(value: unknown): boolean[] | undefined {
  if (value === undefined) return undefined;
  return asBooleanArray(value);
}

export function asOptionalNumberArray(value: unknown): number[] | undefined {
  if (value === undefined) return undefined;
  return asNumberArray(value);
}
