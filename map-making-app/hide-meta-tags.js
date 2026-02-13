// ==UserScript==
// @name         map-making.app toggle tags with name
// @namespace    http://tampermonkey.net/
// @version      1.1
// @author       JanosGeo
// @match        *://map-making.app/maps/*
// @description  Toggle visibility of tags starting with "Meta -" (per map)
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  function getMapId() {
    const match = window.location.pathname.match(/\/maps\/(\d+)/);
    return match ? match[1] : "unknown";
  }

  const mapId = getMapId();
  const storageKey = `mma-hide-meta-tags-${mapId}`;

  let hideMetaTags = localStorage.getItem(storageKey) === "true";

  function updateMetaTags() {
    const items = document.querySelectorAll("ul.tag-list li.tag.has-button");

    items.forEach((li) => {
      const text = (li.textContent || "").trim();
      if (text.startsWith("Meta -")) {
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
    checkbox.id = "mma-toggle-meta-tags";
    checkbox.checked = hideMetaTags;

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = " Hide Info tags";
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
