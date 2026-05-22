/**
 * Footnote — static footer bar with InChI definition text and keyboard hints.
 *
 * Copy is exact from design_handoff_explain_that_inchi/app.jsx lines 475-488.
 * Uses GLOBAL CSS classes .footnote and .key-hint from src/styles.css lines 666-689.
 * Do NOT create Footnote.module.css — all required classes are already global.
 */
export function Footnote() {
  return (
    <div className="footnote">
      <span>
        InChI · IUPAC International Chemical Identifier ·
        {' '}an open-standard line notation for chemical structure
      </span>
      <span className="key-hint">
        <kbd>Hover</kbd> a coloured chunk to highlight ·
        {' '}<kbd>Click</kbd> a molecule on the right to switch
      </span>
    </div>
  );
}
