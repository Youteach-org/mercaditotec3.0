// Read-only, aggregated Cloudflare Worker diagnostics. Never query visitor
// identities, log an API token, or send synthetic traffic to production.
export function parseWorkerUsage(payload) {
  if (Array.isArray(payload?.errors) && payload.errors.length) {
    throw new Error("Cloudflare GraphQL rejected capacity metrics");
  }
  const accounts = payload?.data?.viewer?.accounts;
  if (!Array.isArray(accounts) || !accounts.length ||
      !Array.isArray(accounts[0]?.workersInvocationsAdaptive)) {
    throw new Error("Cloudflare did not return Worker invocation metrics");
  }
  const rows = accounts[0].workersInvocationsAdaptive.map((row) => {
    const requests = Number(row?.sum?.requests);
    const errors = Number(row?.sum?.errors);
    const q50 = Number(row?.quantiles?.cpuTimeP50);
    const q99 = Number(row?.quantiles?.cpuTimeP99);
    if (!Number.isSafeInteger(requests) || requests < 0 ||
        !Number.isSafeInteger(errors) || errors < 0 || errors > requests) {
      throw new Error("Cloudflare returned inconsistent invocation counters");
    }
    return {
      status: String(row?.dimensions?.status ?? "unknown"),
      requests, errors,
      // Cloudflare CPU time quantiles are per status, not additive.
      cpuTimeP50: Number.isFinite(q50) && q50 >= 0 ? q50 : null,
      cpuTimeP99: Number.isFinite(q99) && q99 >= 0 ? q99 : null,
    };
  });
  const requests = rows.reduce((total, row) => total + row.requests, 0);
  const errors = rows.reduce((total, row) => total + row.errors, 0);
  const resourceFailures = rows
    .filter((row) => /exceededResources/i.test(row.status))
    .reduce((total, row) => total + row.requests, 0);
  return {
    available: rows.length > 0,
    requests,
    errors,
    resourceFailures,
    errorPercent: requests ? Math.round(errors / requests * 10000) / 100 : null,
    rows,
  };
}

export function formatCapacitySummary(data, checkedAt) {
  const lines = [
    "## Mercadito — capacidad observada en Cloudflare",
    "",
    "Consulta UTC: " + checkedAt + ". Solo datos agregados, no personas conectadas.",
    "",
    "| Ventana | Ejecuciones | Errores | Excedieron recursos | % errores |",
    "|---|---:|---:|---:|---:|",
  ];
  for (const [window, item] of Object.entries(data)) {
    lines.push("| " + window + " | " +
      (item.available ? item.requests : "Sin datos") + " | " +
      (item.available ? item.errors : "Sin datos") + " | " +
      (item.available ? item.resourceFailures : "Sin datos") + " | " +
      (item.errorPercent === null ? "N/D" : item.errorPercent.toFixed(2) + "%") + " |");
  }
  lines.push("", "### CPU por estado (cuantiles publicados por Cloudflare)");
  for (const [window, item] of Object.entries(data)) {
    lines.push("", "**" + window + "**");
    for (const row of item.rows) {
      lines.push("- " + row.status + ": " + row.requests + " ejecuciones, CPU p50=" +
        (row.cpuTimeP50 ?? "N/D") + ", p99=" + (row.cpuTimeP99 ?? "N/D") +
        " (unidades del proveedor).");
    }
  }
  lines.push("", "> Estas métricas no identifican la ruta concreta ni el número de usuarios simultáneos. Solo son una línea base para comparar cambios posteriores. Las cuotas y la facturación no se infieren del número de ejecuciones.");
  return lines.join("\n") + "\n";
}
