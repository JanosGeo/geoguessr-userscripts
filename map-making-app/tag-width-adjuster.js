// ==UserScript==
// @name         MMA Divider Tag Width Adjuster
// @namespace    http://example.com/
// @version      1.0
// @author       JanosGeo
// @match        *://map-making.app/maps/*
// @description  Sets width: 100% for li.tag.has-button element that are dividers
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  function adjustTags() {
    // Select all li elements with both classes inside ul.tag-list
    const items = document.querySelectorAll("ul.tag-list li.tag.has-button");
    items.forEach((li) => {
      // Trim leading/trailing spaces and check if text starts with '---'
      const text = (li.textContent || "").trim();
      if (text.startsWith("-----")) {
        li.style.width = "100%";
      }
    });
  }

  // Run once when the page loads
  adjustTags();

  // Optional: re-run when the DOM changes (useful for dynamic pages)
  const observer = new MutationObserver(adjustTags);
  observer.observe(document.body, { childList: true, subtree: true });
})();
