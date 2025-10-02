// ==UserScript==
// @name         GeoGuessr Profile – Best/Worst Countries
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Show a player's best and worst countries on their profile page, above the daily challenge streak box
// @author       JanosGeo
// @match        https://www.geoguessr.com/user/*
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
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
}

function showBestWorstCountries(data) {
  const streakBox = document.querySelector(
    '[class^="daily-challenge-streak_root__"]'
  );
  if (!streakBox) return;

  if (document.getElementById("best-worst-countries-box")) return;

  console.log(data);
  const container = document.createElement("div");
  container.id = "best-worst-countries-box";
  container.style.marginBottom = "12px";
  container.style.padding = "10px";
  container.style.paddingRight = "20px";

  container.style.border = "2px solid #ccc";
  container.style.borderRadius = "5px";
  container.style.fontSize = "20px";
  container.style.display = "grid";
  container.style.gridTemplateColumns = "80px auto"; // left column label, right column flags
  container.style.rowGap = "6px";
  container.style.alignItems = "center";
  container.style.textAlign = "left"; // 👈 ensures text is left aligned

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

  // Insert before the daily streak block
  streakBox.parentNode.insertBefore(container, streakBox);
}

let observer = new MutationObserver(() => {
  if (!checkURL()) return;

  const profileLink = location.pathname.includes("/me/profile")
    ? document.querySelector('[name="copy-link"]').value
    : location.href;
  const profileId = profileLink.substr(profileLink.lastIndexOf("/") + 1);

  checkBestCountries(profileId).then((data) => {
    if (data) showBestWorstCountries(data);
  });
});

observer.observe(document.body, { subtree: true, childList: true });
