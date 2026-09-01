// ==UserScript==
// @name         map-making.app toggle tags with names
// @namespace    http://tampermonkey.net/
// @version      1.2
// @author       JanosGeo
// @match        *://map-making.app/maps/*
// @description  Toggle visibility of some tags
// @grant        none
// ==/UserScript==

function shouldHide(text) {
  const raw = text == null ? "" : String(text);
  const cleaned = raw.replace(/^[✔️✓]\s*/, "").trim();

  if (cleaned.startsWith("Meta -")) {
    return true;
  }

  // YY-MM format (e.g., "23-05", "99-12")
  if (/^\d{2}-\d{2}$/.test(cleaned)) {
    return true;
  }

  // Literal "----YY-MM----"
  if (cleaned.includes("----YY-MM----")) {
    return true;
  }
  // Literal "----MISC----"
  if (cleaned.includes("----MISC----")) {
    return true;
  }

  if (/^Pt\d+$/.test(cleaned)) {
    return true;
  }

  if (
    cleaned === "Exposedness treated" ||
    cleaned === "Color treated" ||
    cleaned === "Brakelight treated"
  ) {
    return true;
  }

  // Conf: with percentage, including <50%
  if (/Conf:\s*(?:[<>]\d+|\d+(?:-\d+)?)%/.test(cleaned)) {
    return true;
  }

  return false;
}

(function () {
  "use strict";

  function getMapId() {
    const match = window.location.pathname.match(/\/maps\/(\d+)/);
    return match ? match[1] : "unknown";
  }

  const mapId = getMapId();
  const storageKey = `mma-map-nerds-hide-tags-${mapId}`;

  let hideMetaTags = localStorage.getItem(storageKey) === "true";

  function updateMetaTags() {
    const items = document.querySelectorAll("ul.tag-list li.tag.has-button");

    items.forEach((li) => {
      const label = li.querySelector("label.tag__text");
      let text = "";

      if (label) {
        // Clone to avoid modifying the real DOM
        const clone = label.cloneNode(true);
        // Remove the count <small> if present
        const small = clone.querySelector("small");
        if (small) {
          small.remove();
        }
        text = (clone.textContent || "").trim();
      } else {
        // Fallback to raw textContent if structure is unexpected
        text = (li.textContent || "").trim();
      }

      if (shouldHide(text)) {
        li.style.display = hideMetaTags ? "none" : "";
      }
    });
  }

  function createCheckbox() {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.bottom = "12px";
    container.style.right = "400px";
    container.style.zIndex = "9999";
    container.style.background = "rgba(0, 0, 0, 0.7)";
    container.style.color = "#fff";
    container.style.padding = "8px 10px";
    container.style.borderRadius = "6px";
    container.style.fontSize = "12px";
    container.style.fontFamily = "sans-serif";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "mma-map-nerds-hide-tags";
    checkbox.checked = hideMetaTags;

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = " Hide detailed tags";
    label.style.cursor = "pointer";

    checkbox.addEventListener("change", () => {
      hideMetaTags = checkbox.checked;
      localStorage.setItem(storageKey, String(hideMetaTags));
      updateMetaTags();
    });

    container.appendChild(checkbox);
    container.appendChild(label);
    document.body.appendChild(container);
  }

  // Initial setup
  createCheckbox();
  updateMetaTags();

  // Handle dynamically added tags
  const observer = new MutationObserver(updateMetaTags);
  observer.observe(document.body, { childList: true, subtree: true });
})();
