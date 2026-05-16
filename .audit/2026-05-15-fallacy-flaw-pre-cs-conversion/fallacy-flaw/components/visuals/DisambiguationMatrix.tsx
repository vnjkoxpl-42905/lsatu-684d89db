import { disambiguationPairs } from '../../content/disambiguation-pairs';

export function DisambiguationMatrix() {
  return (
    <section className="my-12">
      <header className="border-b border-ink pb-3">
        <div className="protocol text-ink-mute">Reference</div>
        <h3 className="display-title text-3xl text-ink">Flaw vs. Flaw · Disambiguation Matrix</h3>
        <p className="mt-2 max-w-prose text-ink-soft">
          Wrong Flaw is the trap pattern that costs the most points on hard Flaw questions. The LSAT exploits the small set of flaws students confuse with each other. This matrix names the most common pairs and gives the disambiguation question for each.
        </p>
      </header>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-ink text-paper">
              <th className="protocol px-3 py-2 text-xs">Pair</th>
              <th className="protocol px-3 py-2 text-xs">What looks similar</th>
              <th className="protocol px-3 py-2 text-xs">How to tell them apart</th>
            </tr>
          </thead>
          <tbody>
            {disambiguationPairs.map((row, i) => (
              <tr key={i} className="border-b border-rule-soft align-top">
                <td className="px-3 py-3 font-display text-ink">{row.pair}</td>
                <td className="px-3 py-3 text-sm text-ink-soft">{row.similar}</td>
                <td className="px-3 py-3 text-sm text-ink-soft">
                  <p>{row.distinction}</p>
                  <p className="mt-2 border-l-2 border-cake pl-2 italic text-cake-deep">
                    <span className="protocol mr-1 not-italic">Ask:</span>
                    {row.ask}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
