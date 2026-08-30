# GUI UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh GUI visual hierarchy and interaction feedback while preserving bridge/runtime behavior.

**Architecture:** Keep `index.template.html` + HTML fragments as the editable source and generate `index.html`. Keep TypeScript namespace modules and existing DOM IDs. Add UI behavior in `app/gui/app.ts` and styling in existing split CSS files.

**Tech Stack:** NW.js HTML/CSS, TypeScript namespaces, Node.js verification scripts.

---

### Task 1: UI Guard Test

**Files:**
- Create: `tools/test-gui-ui-refresh.ts`
- Modify: `tools/test-template-sync.ts`

- [ ] Add a test that asserts topbar shell classes, navigation label hints, action intent classes, typed toast classes, and `aria-current` support.
- [ ] Run `node .\tools\test-gui-ui-refresh.ts` and confirm it fails before implementation.

### Task 2: HTML Semantics and Intent Classes

**Files:**
- Modify: `app/gui/index.template.html`
- Modify: `app/gui/html/sidebar.html`
- Modify: `app/gui/html/tools-core-actions.html`
- Modify: matching template files

- [ ] Add brand/status wrapper classes to the topbar.
- [ ] Add `data-nav-label` and `data-nav-hint` spans inside top-level nav buttons.
- [ ] Add `primary`, `danger`, `warning`, or `ghost` classes to high-impact buttons without changing IDs.
- [ ] Run `node .\tools\build-gui-html.ts`.

### Task 3: Visual System CSS

**Files:**
- Modify: `app/gui/styles/base.css`
- Modify: `app/gui/styles/layout.css`
- Modify: `app/gui/styles/feedback.css`
- Modify: `app/gui/styles/responsive.css`
- Modify: matching template files

- [ ] Update color tokens and typography tokens.
- [ ] Redesign topbar, navigation, panels, and status styles.
- [ ] Add typed toast styles and button intent styles.
- [ ] Preserve responsive behavior and reduced motion rules.

### Task 4: Interaction Logic

**Files:**
- Modify: `app/gui/app.ts`
- Modify: `app/gui/src/bindings.ts` if needed
- Modify: matching template files

- [ ] Update `showToast` to accept typed toasts while existing callers keep working.
- [ ] Use success/warning/error toast types for command send, launch/save errors, JSON parse errors, and clear/backup feedback.
- [ ] Add `aria-current="page"` to active top-level nav and `aria-current="true"` to active section nav.
- [ ] Run `npm run build` in `app/gui`.

### Task 5: Verification

**Files:** Existing test suite.

- [ ] Run GUI build and syntax checks.
- [ ] Run `node .\tools\test-gui-ui-refresh.ts`.
- [ ] Run existing GUI and bridge regression scripts.
- [ ] Run `node .\tools\test-template-sync.ts`.

No commit step because this workspace is not a normal Git repository.
