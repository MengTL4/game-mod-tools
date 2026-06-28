# GUI UI Refresh Design

**Goal:** Improve the NW.js trainer UI hierarchy and interaction feedback without changing command payloads, bridge behavior, or existing DOM IDs.

**Scope:**
- Keep the generated `app/gui/index.html` runtime model and `index.template.html` source model.
- Keep all existing element IDs used by `app/gui/app.ts` and `app/gui/src/*.ts`.
- Refresh visual tokens, topbar, navigation, panels, status indicators, button intent styles, and toast feedback.
- Add small interaction logic only where it improves feedback: typed toasts and accessible selected states.

**Visual Direction:** Tactical local-control console. Use a deeper slate/steel base, copper/teal accents, sharper status affordances, and compact dense panels suited to a game tool rather than a generic web admin page.

**Interaction Rules:**
- The topbar must expose a clear product mark, connection status, and primary launch/refresh actions.
- Primary navigation buttons must carry compact labels and optional short hints without changing `data-tool-tab`.
- Secondary navigation should show accessible selected state with `aria-current`.
- High-impact actions such as kill, escape, save, backup, clear, and custom JSON send must have intent classes.
- Toasts must support `info`, `success`, `warning`, and `error` classes while preserving the existing `toast` id.

**Testing:**
- Add a GUI UI refresh test that checks required classes, ARIA state hooks, generated HTML consistency, and typed toast implementation.
- Continue running existing GUI, template, and bridge regression tests.
