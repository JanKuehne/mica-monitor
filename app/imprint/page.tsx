export default function ImprintPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Imprint</h1>
        <p className="text-sm text-muted-foreground mt-1">The fine print. Won&apos;t take long.</p>
      </div>

      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          Built by one person with too many browser tabs open and an unhealthy interest in
          crypto EU financial regulation. Data is sourced from public registers and, with the
          kind help of Claude — who&apos;s also responsible for most of what you see here —
          turned into something hopefully useful. If you base actual compliance decisions on
          this, that&apos;s a you problem. Spotted something wrong or missing, want to exchange
          notes?{" "}
          <a
            href="https://www.linkedin.com/in/jan-kuehne/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            DM me on LinkedIn.
          </a>
        </p>

        <p>
          One caveat on freshness: the ESMA register is a downstream aggregator. Local regulators
          grant licenses first, notify ESMA second, and the CSV updates last — so expect a lag of
          weeks to months between a license being live and showing up here. If something looks
          missing, check the NCA register of the relevant country first.
        </p>

        <p>
          Not affiliated with ESMA or any national regulator. Not a financial service, not
          legal advice, and definitely not investment advice. Just a dashboard. Do your own
          research.
        </p>

        <p>
          Non-commercial. No ads. No tracking. No funny business.
        </p>

        <p className="text-xs">
          Source:{" "}
          <a
            href="https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            ESMA MiCA register
          </a>
          {" "}and national competent authority registers under MiCA Regulation (EU) 2023/1114.
        </p>
      </div>
    </div>
  );
}
