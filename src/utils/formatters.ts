export function formatTitle(attributes: Record<string, unknown>): string {
  const title = attributes.place ?? attributes.PLACE ?? attributes.name ?? attributes.NAME;
  if (typeof title === "string" && title.trim().length > 0) {
    return title;
  }
  const objectId = attributes.OBJECTID ?? attributes.objectid ?? attributes.FID;
  return typeof objectId === "number" ? `Feature ${objectId}` : "Feature";
}

export function formatDescription(attributes: Record<string, unknown>): string {
  const magnitude = attributes.mag ?? attributes.MAG;
  const timeValue = attributes.time ?? attributes.TIME;
  const parsedTime = typeof timeValue === "number" ? new Date(timeValue).toLocaleString() : "Unknown time";
  const parsedMagnitude = typeof magnitude === "number" || typeof magnitude === "string" ? `Magnitude ${magnitude}` : "Magnitude n/a";
  return `${parsedMagnitude} | ${parsedTime}`;
}
