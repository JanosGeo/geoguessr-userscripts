// ==UserScript==
// @name         GeoGuessr Hide Score
// @description  Hides your score and guesses while playing the game and only shows it at the end. Toggle it with the eye button in the header.
// @version      2.1
// @author       JanosGeo, miraclewhips
// @match        *://*.geoguessr.com/*
// @icon         https://www.google.com/s2/favicons?domain=geoguessr.com
// @grant        GM_addStyle
// @copyright    2024, miraclewhips (https://github.com/miraclewhips)
// @license      MIT
// ==/UserScript==

// This script is adopted by JanosGeo from the original script by miraclewhips.
// The original script can be found at https://greasyfork.org/en/scripts/460322-geoguessr-styles-scan
// The changes in this script are:
// - Added a toggle button in the header to enable/disable hiding scores
// - Fixed the selectors so that they work with UI-changes of Geoguessr

const STORAGE_KEY = "mwhsHideScore";

GM_addStyle(`
	body.mwhs-should-hide-scores div[class^="status_section__"][data-qa="score"],
	body.mwhs-should-hide-scores div[class^="rounds-status_panel__"][data-qa="rounds-status"],
	body.mwhs-should-hide-scores div[class^="round-result_distanceIndicatorWrapper__"],
	body.mwhs-should-hide-scores div[class^="round-result_pointsIndicatorWrapper__"],
	body.mwhs-should-hide-scores div[class^="current-standings_container__"],
	body.mwhs-should-hide-scores div[id^="streak-score-panel-summary-"],
	body.mwhs-should-hide-scores div[id^="streak-counter-panel-"] {
		display: none !important;
	}

	body.mwhs-should-hide-scores div[class^="result-layout_root__"] {
		background-color: #000 !important;
	}

	body.mwhs-should-hide-scores div[class^="result-layout_root__"]:after {
		content: 'results hidden';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: #555;
		font-style: italic;
	}

	body.mwhs-should-hide-scores div[class^="coordinate-result-map_map__"] {
		visibility: hidden !important;
	}

	#mwhsHeaderToggle img {
		width: 15px;
		filter: brightness(0) invert(1);
		opacity: 1;
	}

	#mwhsHeaderToggle[data-enabled="true"] img {
		opacity: 0.4;
	}
`);

// Resolves GeoGuessr's hashed CSS-module class names. Same approach as
// https://greasyfork.org/en/scripts/460322-geoguessr-styles-scan
const classNames = {};
const scannedStylesheets = new Set();

async function scanStyles() {
  const nodes = document.querySelectorAll(
    'head link[rel="stylesheet"], head style[data-n-href*=".css"]',
  );
  for (const node of nodes) {
    const href = node.href || location.origin + node.dataset.nHref;
    if (scannedStylesheets.has(href)) continue;
    scannedStylesheets.add(href);
    try {
      const stylesheet = await fetch(href).then((res) => res.text());
      for (const className of stylesheet.split(".")) {
        const separator = className.indexOf("__");
        if (separator === -1) continue;
        classNames[className.slice(0, separator + 2)] = className.slice(
          0,
          separator + 7,
        );
      }
    } catch {
      scannedStylesheets.delete(href);
    }
  }
}

const cn = (classNameStart) => classNames[classNameStart];

const checkAllStylesFound = (classNamesUsed) =>
  classNamesUsed.every((className) => cn(className));

if (localStorage.getItem(STORAGE_KEY) == null) {
  localStorage.setItem(STORAGE_KEY, "enabled");
}

const isHideScoreEnabled = () =>
  localStorage.getItem(STORAGE_KEY) === "enabled";

const updateHideState = () => {
  const gameRoot = document.querySelector(`div[class^="in-game_root__"]`);
  const finalResults = document.querySelector(
    `div[class^="result-overlay_overlay__"], div[class^="result-overlay-2025_overlay__"]`,
  );
  document.body.classList.toggle(
    "mwhs-should-hide-scores",
    isHideScoreEnabled() && !!gameRoot && !finalResults,
  );
};

const syncToggleButton = () => {
  const root = document.querySelector("#mwhsHeaderToggle");
  if (!root) return;
  const hiding = isHideScoreEnabled();
  const label = hiding
    ? "Hiding scores between rounds"
    : "Showing scores between rounds";
  root.dataset.enabled = hiding ? "true" : "false";
  const button = root.querySelector("button");
  if (!button) return;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", hiding ? "false" : "true");

  const surface = root.querySelector(".mwhs-toggle-surface");
  const activeVariant = cn("slanted-wrapper_variantPurple__");
  const inactiveVariant = cn("slanted-wrapper_variantGrayTransparent__");
  if (!surface || !activeVariant || !inactiveVariant) return;
  surface.classList.toggle(activeVariant, !hiding);
  surface.classList.toggle(inactiveVariant, hiding);
};

const guiHeaderClasses = [
  "menu-item_container__",
  "quick-search_wrapper__",
  "slanted-wrapper_root__",
  "slanted-wrapper_variantGrayTransparent__",
  "quick-search_searchInputWrapper__",
  "quick-search_searchInputButton__",
  "quick-search_iconSection__",
];

const guiHTMLHeader = () => `
<div id="mwhsHeaderToggle" class="${cn("menu-item_container__")}">
  <div class="${cn("quick-search_wrapper__")}">
    <div class="mwhs-toggle-surface ${cn("slanted-wrapper_root__")} ${cn("slanted-wrapper_variantGrayTransparent__")}">
      <div class="${cn("quick-search_searchInputWrapper__")}">
        <button type="button" style="width: 59.19px" class="${cn("quick-search_searchInputButton__")}">
          <picture class="${cn("quick-search_iconSection__")}" style="justify-content: center">
            <img src="https://www.svgrepo.com/show/149753/scoreboard.svg" alt="">
          </picture>
        </button>
      </div>
    </div>
  </div>
</div>
`;

const guiPartyHeaderClasses = [
  "header_item__",
  "quick-search_wrapper__",
  "slanted-wrapper_root__",
  "slanted-wrapper_variantGrayTransparent__",
  "slanted-wrapper_start__",
  "slanted-wrapper_right__",
  "slanted-wrapper_end__",
  "quick-search_iconSection__",
];

const guiPartyHeader = () => `
<div id="mwhsHeaderToggle" class="${cn("header_item__")}" style="margin-right: 1rem;">
  <div class="${cn("quick-search_wrapper__")}">
    <div class="mwhs-toggle-surface ${cn("slanted-wrapper_root__")} ${cn("slanted-wrapper_variantGrayTransparent__")}">
      <div class="${cn("slanted-wrapper_start__")} ${cn("slanted-wrapper_right__")}"></div>
      <div>
        <button type="button" style="width: 59.19px; background-color: inherit; border: initial; cursor: pointer; min-height: 2rem; min-width: 2rem; padding: var(--padding-y) var(--padding-x);">
          <picture class="${cn("quick-search_iconSection__")}" style="justify-content: center">
            <img src="https://www.svgrepo.com/show/40039/eye.svg" alt="">
          </picture>
        </button>
      </div>
      <div class="${cn("slanted-wrapper_end__")} ${cn("slanted-wrapper_right__")}"></div>
    </div>
  </div>
</div>
`;

const insertHeaderGui = (header, gui) => {
  header.insertAdjacentHTML("afterbegin", gui);
  const button = document.querySelector("#mwhsHeaderToggle button");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    localStorage.setItem(
      STORAGE_KEY,
      isHideScoreEnabled() ? "disabled" : "enabled",
    );
    syncToggleButton();
    updateHideState();
  });
  syncToggleButton();
};

const checkInsertGui = () => {
  if (document.querySelector("#mwhsHeaderToggle")) return;

  const desktopHeader = document.querySelector(
    "[class*=header-desktop_desktopSectionRight__]",
  );
  if (desktopHeader && checkAllStylesFound(guiHeaderClasses)) {
    insertHeaderGui(desktopHeader, guiHTMLHeader());
    return;
  }

  const partyHeader = document.querySelector("[class*=party-header_right__]");
  if (
    document.querySelector("[class*=party-header_root__]") &&
    partyHeader &&
    checkAllStylesFound(guiPartyHeaderClasses)
  ) {
    insertHeaderGui(partyHeader, guiPartyHeader());
  }
};

let guiCheckQueued = false;

const queueGui = () => {
  if (guiCheckQueued || document.querySelector("#mwhsHeaderToggle")) return;
  const header =
    document.querySelector("[class*=header-desktop_desktopSectionRight__]") ||
    document.querySelector("[class*=party-header_root__]");
  if (!header) return;

  guiCheckQueued = true;
  scanStyles()
    .catch(() => {})
    .then(() => {
      checkInsertGui();
    })
    .finally(() => {
      guiCheckQueued = false;
    });
};

const init = () => {
  const observer = new MutationObserver(() => {
    updateHideState();
    queueGui();
  });

  observer.observe(document.body, { subtree: true, childList: true });
  updateHideState();
  queueGui();
};

init();
