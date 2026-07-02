const UTC_PLUS_8_OFFSET_MS = 8 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatUtcPlus8DateTime(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const sourceDate = value instanceof Date ? value : new Date(value);
  const timestamp = sourceDate.getTime();

  if (Number.isNaN(timestamp)) {
    return "-";
  }

  const utcPlus8Date = new Date(timestamp + UTC_PLUS_8_OFFSET_MS);

  return [
    `${utcPlus8Date.getUTCFullYear()}-${pad(utcPlus8Date.getUTCMonth() + 1)}-${pad(utcPlus8Date.getUTCDate())}`,
    `${pad(utcPlus8Date.getUTCHours())}:${pad(utcPlus8Date.getUTCMinutes())}:${pad(utcPlus8Date.getUTCSeconds())}`,
    "UTC+8"
  ].join(" ");
}
