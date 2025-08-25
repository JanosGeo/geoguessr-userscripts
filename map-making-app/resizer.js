// ==UserScript==
// @name         Map Making App Resizer
// @namespace    http://tampermonkey.net/
// @version      2025-08-25
// @description  Adds a draggable resizer between map and overview panels, remembers last position per map ID, and allows reset on double-click.
// @author       JanosGeo
// @match        https://map-making.app/maps/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=map-making.app
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  let resizerInserted = false;

  // Extract map ID from URL (/maps/<id>)
  function getMapId() {
    const match = window.location.pathname.match(/\/maps\/(\d+)/);
    return match ? match[1] : null;
  }

  function insertDraggableResizer() {
    try {
      const container = document.querySelector(".page-map-editor");
      const map = document.querySelector(".page-map-editor > .map-embed");
      let sidebar = document.querySelector(".page-map-editor > .map-overview");
      if (!sidebar) {
        sidebar = document.querySelector(
          ".page-map-editor > .location-preview"
        );
      }

      if (!container || !map || !sidebar) return;

      // Prevent duplicate insertion
      const existing = container.querySelector(".window-resizer");
      if (existing) existing.remove();

      // Ensure grid layout
      container.style.display = "grid";
      container.style.position = "relative";

      // Load saved position for this map
      const mapId = getMapId();
      const storageKey = mapId ? `map-resizer-${mapId}` : "map-resizer-default";
      const savedPercent = localStorage.getItem(storageKey);

      if (savedPercent) {
        container.style.gridTemplateColumns = `${savedPercent}% ${
          100 - savedPercent
        }%`;
      } else {
        container.style.gridTemplateColumns = "1fr 1fr";
      }

      // Create resizer element
      const resizer = document.createElement("div");
      resizer.classList.add("window-resizer");
      resizer.style.position = "absolute";
      resizer.style.top = "0";
      resizer.style.bottom = "0";
      resizer.style.width = "10px";
      resizer.style.cursor = "ew-resize";
      resizer.style.background = "rgba(0,0,0,0.1)";
      resizer.style.zIndex = "9999";

      // Position resizer initially
      function updateResizerPosition() {
        const rect = map.getBoundingClientRect();
        resizer.style.left = rect.width - 5 + "px";
      }

      container.appendChild(resizer);
      updateResizerPosition();

      // Drag logic
      let dragging = false;

      resizer.addEventListener("mousedown", (e) => {
        dragging = true;
        document.body.style.cursor = "ew-resize";
        document.body.style.userSelect = "none";
        e.preventDefault();
      });

      document.addEventListener("mousemove", (e) => {
        if (!dragging) return;

        const rect = container.getBoundingClientRect();
        const totalWidth = rect.width;

        let newWidth = e.clientX - rect.left;
        const minWidth = 100;
        const maxWidth = totalWidth - 100;

        newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

        const percent = (newWidth / totalWidth) * 100;
        container.style.gridTemplateColumns = `${percent}% ${100 - percent}%`;

        // Save position per map
        if (mapId) {
          localStorage.setItem(storageKey, percent.toFixed(2));
        }

        updateResizerPosition();
      });

      document.addEventListener("mouseup", () => {
        if (dragging) {
          dragging = false;
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        }
      });

      // Double-click reset to 50/50
      resizer.addEventListener("dblclick", () => {
        container.style.gridTemplateColumns = "1fr 1fr";
        localStorage.removeItem(storageKey);
        updateResizerPosition();
        console.log("↔️ Resizer reset to 50/50 for map:", mapId);
      });

      resizerInserted = true;
      console.log("✅ Resizer inserted for map:", mapId);
    } catch (err) {
      console.error("Error inserting resizer:", err);
    }
  }

  // Watch for dynamic page changes
  const observer = new MutationObserver(() => {
    if (resizerInserted) return;

    const container = document.querySelector(".page-map-editor");
    const map = document.querySelector(".page-map-editor > .map-embed");
    let sidebar = document.querySelector(".page-map-editor > .map-overview");
    if (!sidebar) {
      sidebar = document.querySelector(".page-map-editor > .location-preview");
    }

    if (container && map && sidebar) {
      observer.disconnect();
      insertDraggableResizer();
    }
  });

  // Start observing immediately
  observer.observe(document.body, { childList: true, subtree: true });
})();
