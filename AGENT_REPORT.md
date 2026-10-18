# Aran Technocrafts upgrade report

## Step 0: Baseline and safety

- Created baseline commit `4fd20a3`, tag `baseline`, and branch `story-upgrade`.
- Started a local preview at `http://127.0.0.1:5500/`.
- The baseline rendered five gallery cards. At 1440×900, the browser reported the missing GSAP target `.slide-down .down-arrow`.
- The local Playwright package was not available, so no dependency was added; browser checks use the integrated preview tools.

## Step 1: Dead-code cleanup

- Removed the never-invoked background-grid, hover-gradient, and antigravity initializers, including the dormant carousel hook for the hover effect.
- Removed the GSAP animation for the absent `.slide-down .down-arrow` and `.section-rule`; simplified the title reveal to `.section-title`.
- Removed the unused `.hero-scroll` styling, FOUC handling for an absent class, and unused `nav-init-pending` cleanup.
- Removed the redundant early `handleScroll()` call; retained the call after page enhancement setup.
- Verification: `node --check script.js` passes; the local page renders five gallery cards with no console errors or warnings after the cleanup.

## Step 2: Gallery filter removal

- Before: the gallery exposed a single `ALL` filter, and gallery startup was nested inside that filter initializer. After: the filter markup, script, styles, and responsive rules are removed; `loadCarousel()` loads all five projects directly.
- Kept project category data, carousel entrance animation, destroy/recreate behavior, heading, project studies line, carousel, hint, and no-JavaScript fallback.
- Browser checks exposed that the carousel always selected horizontal mode, disabling its existing desktop drag and wheel handlers. It now uses horizontal scrolling only in mobile mode; desktop drag and wheel navigation use the existing carousel layout.
- Verification: `node --check script.js` and `git diff --check` pass. At 1440×900, 1024×768, and 390×844, five cards render, the filter is absent, and the document has no horizontal overflow.
- Interaction checks: desktop drag moved the active card from 01 to 02; wheel moved it to 03; keyboard activation of a dot moved it to 04. On mobile, horizontal wheel input and keyboard/dot navigation changed the active card. Opening a project started its muted video; Escape closed the modal and returned focus to the triggering card.
- Fallback checks: with `script.js` blocked, all five static gallery cards and the contact-form fallback remained visible. Under reduced motion, all five carousel cards remained available and `.motion-ready` was absent. Normal page loads reported no console errors or warnings; the JavaScript-disabled check produced the expected blocked-script resource error.
- Visual checks: captured and reviewed the gallery at 1440×900, 1024×768, and 390×844 in the integrated browser. Screenshots are shown in the review conversation; local Playwright is unavailable, so no screenshot files were written to `.agent-checks/`.

## Step 3: Motion tokens and shared plumbing

- Added the four shared story motion tokens and a head script that reads the saved motion preference before page scripts run.
- Made the runtime reduced-motion gate honor `data-motion="off"` and added matching static CSS rules for the opening and existing process layout.
- Added one centered-section `IntersectionObserver` registry and set `--story-progress` in the existing scroll animation-frame handler.
- Added `id="difference"` to the existing Value section without changing its markup or copy.
- Verification: `node --check script.js` and `git diff --check` pass. Browser checks selected each of the eight story sections in sequence, observed `--story-progress` change, and confirmed saved motion-off state is applied before animation setup.

## Step 4: Background story layer

- Added one JavaScript-created, fixed inline SVG layer with restrained baseline, measuring-grid, process-path, modular-cell, and loop states. It starts at the Approach section; selected work fades to 2.5% layer opacity, and Contact returns to the baseline.
- Set line tone from the current section, placed the layer at z-index 1 beneath `.container` content at z-index 2, and drove the process path/nodes from `updateProcessNodes(progress)`.
- Kept the existing scroll-frame `--story-progress` as the page trace driver. Mobile/coarse-pointer styling hides fine detail and does not scrub the page trace; reduced motion and motion-off show only the static baseline.
- Verification: JavaScript syntax and whitespace checks pass. Browser checks confirmed all eight chapter/tone states, mobile simplification without horizontal overflow, and a static baseline with other motifs hidden under reduced motion and motion-off. The process-layer screenshot was reviewed at 1440×900; content and navigation remain above the lines.

## Step 5: Accessible motion toggle

- Added the approved “Motion: On” / “Motion: Off” button to the navigation and mobile menu, with `aria-pressed` state and a 44px minimum touch target.
- The control persists the selected value in `localStorage` and reloads so all motion setup consistently follows the choice. The early head script now reads both saved values; reduced-motion CSS respects an explicit motion-on override.
- Verification: `node --check script.js` and `git diff --check` pass. Browser checks confirmed the default On state, Off and On persistence across reloads, system reduced-motion defaulting to Off, explicit On overriding the system preference, and mobile-menu visibility, pressed state, and 44px height. No public deployment was performed.

## Step 6: Story chapter indicator

- Added a fixed chapter rail with numbered, directly navigable links derived from the existing section kickers; it appears when a story section is current and marks that section with `aria-current="location"`.
- Kept all eight links keyboard-accessible and adapted the rail to a horizontally scrollable bottom strip on narrow screens, retaining 44px link targets.
- Verification: `node --check script.js` and `git diff --check` pass. Browser checks confirmed correct current-chapter updates for all eight sections, navigation to Industries through the rail, visibility on desktop and mobile, and no document overflow at 390px or 320px viewport widths.

## Step 7: Headline and About reveals

- Added a scroll-triggered reveal for the hero headline and staggered reveals for the existing About paragraphs and statistic rows. Removed the broad About-grid animation so the section's text and stats can enter independently; the existing section-title reveals remain in place.
- Kept all animation runtime-only and behind the existing reduced-motion gate, without changing page copy or static layout.
- Verification: `node --check script.js` and `git diff --check` pass. Browser checks observed each reveal progress from hidden to fully visible under normal motion, while emulated reduced motion left the headline, paragraphs, and stats visible and did not add `motion-ready`.
