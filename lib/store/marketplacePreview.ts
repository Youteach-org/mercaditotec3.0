export function shouldUseMarketplaceDemo(
  search: string,
  hostname: string,
): boolean {
  const params = new URLSearchParams(search);
  if (params.get("visual") === "1") return true;

  const normalizedHost = hostname.trim().toLowerCase();
  return normalizedHost === "mercaditotec-preview.youteach-tk.workers.dev";
}
