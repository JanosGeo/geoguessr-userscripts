// ==UserScript==
// @name         GeoGuessr Profile – Best/Worst Countries
// @namespace    http://tampermonkey.net/
// @version      0.1.4
// @description  Show a player's best and worst countries on their profile page, after the multiplayer box
// @author       JanosGeo
// @match        https://www.geoguessr.com/user/*
// @match        https://www.geoguessr.com/me/profile
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
// @grant        none
// @license      MIT
// ==/UserScript==

function checkURL() {
  return (
    location.pathname.includes("/user") ||
    location.pathname.includes("/me/profile")
  );
}

async function checkBestCountries(profileId) {
  return fetch(location.origin + "/api/v4/ranked-system/progress/" + profileId)
    .then((out) => out.json())
    .catch((err) => {
      console.log(err);
      return null;
    });
}

function codeToFlagEmoji(code) {
  const upper = code.toUpperCase();
  const flag = upper.replace(/./g, (char) =>
    String.fromCodePoint(char.charCodeAt(0) + 127397)
  );
  return `<span title="${upper}" style="font-size:24px; margin-right:4px;">${flag}</span>`;
}

function showBestWorstCountries(data) {
  const multiplayerBox = document.querySelector(
    '[class^="multiplayer_root__"]'
  );
  if (!multiplayerBox) return;

  if (document.getElementById("best-worst-countries-box")) return;

  const container = document.createElement("div");
  container.id = "best-worst-countries-box";
  container.style.marginTop = "12px";
  container.style.marginBottom = "12px";
  container.style.padding = "10px 20px 10px 10px";
  container.style.border = "2px solid #ccc";
  container.style.borderRadius = "5px";
  container.style.fontSize = "20px";
  container.style.display = "grid";
  container.style.gridTemplateColumns = "80px auto";
  container.style.rowGap = "6px";
  container.style.alignItems = "center";
  container.style.textAlign = "left";

  const best =
    data.bestCountries?.map((c) => codeToFlagEmoji(c)).join(" ") || "N/A";
  const worst =
    data.worstCountries?.map((c) => codeToFlagEmoji(c)).join(" ") || "N/A";

  container.innerHTML = `
    <div><strong>Best:</strong></div>
    <div>${best}</div>
    <div><strong>Worst:</strong></div>
    <div>${worst}</div>
  `;

  // 👇 Insert AFTER the multiplayer box
  multiplayerBox.parentNode.insertBefore(container, multiplayerBox.nextSibling);
}

// Utility to wait for elements added dynamically
function waitForElement(selector) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const obs = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  });
}

// Watch page mutations
let observer = new MutationObserver(() => {
  if (!checkURL()) return;

  waitForElement('[class^="multiplayer_root__"]').then(() => {
    const profileLink = location.pathname.includes("/me/profile")
      ? document.querySelector('[name="copy-link"]').value
      : location.href;
    const profileId = profileLink.substr(profileLink.lastIndexOf("/") + 1);

    checkBestCountries(profileId).then((data) => {
      if (data) showBestWorstCountries(data);
    });
  });
});

observer.observe(document.body, { subtree: true, childList: true });
