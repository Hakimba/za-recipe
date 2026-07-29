// dd/mm/yyyy from an ISO 8601 string (date-only or full timestamp).
export const formatIsoDate = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split("-")
  return y !== undefined && m !== undefined && d !== undefined ? `${d}/${m}/${y}` : iso
}
