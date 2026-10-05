// ==UserScript==
// @name         map-making.app Random Review
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add a clickable die-icon, that allows for reviewing all selected locations in a random order
// @author       JanosGeo
// @match        https://map-making.app/maps/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=map-making.app
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  function injectDieButton() {
    const reviewButton = document.querySelector('[data-qa="selection-review"]');
    if (!reviewButton) return;

    // Check if die already exists
    if (reviewButton.querySelector(".random-review-die")) return;

    // Create the die span
    const die = document.createElement("span");
    die.className = "random-review-die";
    die.style.cursor = "pointer";
    die.style.marginInlineStart = "0.25rem";
    die.style.transition = "transform 0.1s ease, filter 0.1s ease";
    die.style.display = "inline-block";
    die.textContent = "🎲";
    die.title = "Review all selected locations in a randomized order";

    // Add hover effects
    die.addEventListener("mouseenter", () => {
      die.style.transform = "scale(1.2) rotate(5deg)";
      die.style.filter = "brightness(1.3)";
    });

    die.addEventListener("mouseleave", () => {
      die.style.transform = "scale(1) rotate(0deg)";
      die.style.filter = "brightness(1)";
    });

    // Add click handler
    die.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (
        !window.editor ||
        !window.editor.selections ||
        !window.editor.beginReview
      ) {
        console.warn("Editor not available");
        return;
      }

      const seen = new Set();
      const unique = [];

      for (const selection of window.editor.selections) {
        for (const location of selection.locations) {
          if (!seen.has(location.id)) {
            seen.add(location.id);
            unique.push(location);
          }
        }
      }

      if (unique.length == 0) {
        return;
      }

      window.editor.beginReview(unique.sort(() => Math.random() - 0.5));
    });

    // Append die to the button (after all existing content)
    reviewButton.appendChild(die);
  }

  // Wait for the page to load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(injectDieButton, 500);
    });
  } else {
    setTimeout(injectDieButton, 500);
  }

  // Also observe for dynamic changes
  const bodyObserver = new MutationObserver(() => {
    injectDieButton();
  });

  bodyObserver.observe(document.body, { childList: true, subtree: true });
})();
