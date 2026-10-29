import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const args = process.argv.slice(2),
  apply = args.includes("--apply");
try {
  const valid =
    /^(--apply|--reminders|--prepare-invoices|--help|--after=[a-f\d]{24}|--limit=\d+)$/i;
  if (
    args.some((value) => !valid.test(value)) ||
    (args.includes("--reminders") && args.includes("--prepare-invoices"))
  )
    throw new Error("Invalid options");
  const mode = args.includes("--prepare-invoices")
    ? "prepare_invoices"
    : "weekly_reminders";
  const after = args.find((value) => value.startsWith("--after="))?.slice(8),
    limit = Number(
      args.find((value) => value.startsWith("--limit="))?.slice(8) || 50,
    );
  if (limit < 1 || limit > 100) throw new Error("Invalid limit");
  if (args.includes("--help") || !apply) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          command:
            "node scripts/finance-maintenance.mjs (--reminders | --prepare-invoices [--after=OBJECT_ID] [--limit=50]) --apply",
          action: mode,
          requires:
            "Running Servizato server, finance indexes and server-only FINANCE_COLLECTION_JOB_TOKEN",
          effects:
            mode === "weekly_reminders"
              ? "Prepare idempotent weekly in-app reminders for overdue confirmed commission. No email/WhatsApp/SMS."
              : "Prepare one pending ledger per existing invoice; saved terms only. Never invent a historical rate or customer confirmation.",
          externalPayments: false,
          automaticPayouts: false,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }
  const token = process.env.FINANCE_COLLECTION_JOB_TOKEN || "";
  if (!/^[a-f\d]{64}$/i.test(token))
    throw new Error("Missing job configuration");
  const url = new URL(
    "/api/internal/finance/maintenance",
    process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000",
  );
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  )
    throw new Error("HTTPS required");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: mode,
      ...(mode === "prepare_invoices"
        ? { ...(after ? { after } : {}), limit }
        : {}),
    }),
    redirect: "error",
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error("Maintenance request rejected");
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
} catch {
  console.error(
    "Finance maintenance failed. Review the options, HTTPS app URL, server-only job token and installed indexes. No credentials were printed.",
  );
  process.exitCode = 1;
}
