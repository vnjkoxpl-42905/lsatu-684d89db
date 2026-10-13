export function Masthead() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto grid max-w-6xl grid-cols-3 items-baseline gap-4 px-6 py-5">
        <div className="protocol text-ink-mute">
          Vol. I · No. 01
        </div>
        <span className="text-center display-title text-2xl md:text-3xl text-ink">
          Flaw &amp; Famous Flaws
        </span>
        <div className="protocol text-right text-ink-mute">
          LSAT&nbsp;U · Logical&nbsp;Reasoning
        </div>
      </div>
    </header>
  );
}
