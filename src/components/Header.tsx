export function Header() {
  return (
    <header className="header">
      <div>
        <h1>
          Explain that <em>InChI</em>
        </h1>
        <p className="header-tagline">
          InChI · IUPAC International Chemical Identifier · an open-standard line notation for chemical structure
        </p>
      </div>
      <div className="meta">
        <div>InChI v<b>1.07.3</b> · standard</div>
        <div>Hover any coloured chunk · the structure responds</div>
      </div>
    </header>
  );
}
