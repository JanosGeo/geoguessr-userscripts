// ==UserScript==
// @name         map-making.app Tag sanity checker
// @namespace    http://tampermonkey.net/
// @version      2025-01-25
// @description  in map edition page, adds a formula button at the bottom right
// @author       JanosGeo
// @match        https://map-making.app/maps/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=map-making.app
// @grant        none
// ==/UserScript==

function hasBadTags(
  location,
  checkNoYear,
  checkDuplicateYear,
  checkNoMonth,
  checkDuplicateMonth,
  checkNoCar,
  checkDuplicateCar,
  checkNoYYMM,
  checkDuplicateYYMM,
  checkBadUpdates,
  checkMonthFalseUpdate,
  checkNoXXXXm,
  checkDuplicateXXXXm,
  checkCopyrightYear
) {
  const currentYear = new Date().getFullYear();

  if (!Array.isArray(location.tags)) {
    return true;
  }

  const getFilteredTags = (filterFn) => location.tags.filter(filterFn);

  if (checkNoYear || checkDuplicateYear) {
    const yearTags = getFilteredTags((tag) => {
      const year = parseInt(tag, 10);
      // Check if the parsed year, when converted back to a string,
      // is identical to the original tag. This ensures no extra characters.
      return String(year) === tag && year >= 2005 && year <= currentYear;
    });
    if (checkNoYear && yearTags.length === 0) return true;
    if (checkDuplicateYear && yearTags.length > 1) return true;
  }

  if (checkNoMonth || checkDuplicateMonth) {
    const monthTags = getFilteredTags((tag) => /^(0[1-9]|1[0-2])$/.test(tag));
    if (checkNoMonth && monthTags.length === 0) return true;
    if (checkDuplicateMonth && monthTags.length > 1) return true;
  }

  if (checkNoCar || checkDuplicateCar) {
    const carTags = getFilteredTags(
      (tag) =>
        tag === "Gen2" ||
        tag === "Gen3" ||
        tag.startsWith("gen4-") ||
        tag.startsWith("gen3-") ||
        tag.startsWith("Smallcam") ||
        tag.startsWith("Shitcam")
    );
    if (checkNoCar && carTags.length === 0) return true;
    if (checkDuplicateCar && carTags.length > 1) return true;
  }

  if (checkNoYYMM || checkDuplicateYYMM) {
    // Match tags like "24-5", "24-05", "19-12", etc.
    const yymmTags = getFilteredTags((tag) => /^(\d{2})-(\d{1,2})$/.test(tag));
    if (checkNoYYMM && yymmTags.length === 0) return true;
    if (checkDuplicateYYMM && yymmTags.length > 1) return true;
  }

  if (checkNoXXXXm || checkDuplicateXXXXm) {
    const xxxxmTags = getFilteredTags((tag) => /\d{2,}m$/.test(tag));
    if (checkNoXXXXm && xxxxmTags.length === 0) return true;
    if (checkDuplicateXXXXm && xxxxmTags.length > 1) return true;
  }

  if (checkCopyrightYear) {
    const copyrightTags = getFilteredTags((tag) => {
      // Matches a 4-digit year followed by "(C)"
      return /^\d{4}\(C\)$/.test(tag);
    });
    if (copyrightTags.length == 0) return true;
  }

  if (checkBadUpdates || checkMonthFalseUpdate) {
    if (location.tags.includes("Updated")) {
      const yearTags = getFilteredTags((tag) => {
        const year = parseInt(tag, 10);
        // Check if the parsed year, when converted back to a string,
        // is identical to the original tag. This ensures no extra characters.
        return String(year) === tag && year >= 2005 && year <= currentYear;
      });
      const monthTags = getFilteredTags((tag) => /^(0[1-9]|1[0-2])$/.test(tag)); // Capture 01-12 month tags
      const yymmTags = getFilteredTags((tag) =>
        /^(\d{2})-(\d{1,2})$/.test(tag)
      );

      const latestYearTag =
        yearTags.length > 0 ? Math.max(...yearTags.map(Number)) : null;
      const latestMonthTag =
        monthTags.length > 0 ? Math.max(...monthTags.map(Number)) : null;

      if (
        yymmTags.length === 0 ||
        latestYearTag === null ||
        latestMonthTag === null
      ) {
        return false;
      }

      // Assuming yymmTags[0] is the primary/latest YY-MM tag to check against
      const latestYYMMTagStr = yymmTags[0];
      const match = latestYYMMTagStr.match(/^(\d{2})-(\d{1,2})$/);

      if (match) {
        const yyPart = parseInt(match[1], 10);
        const mmFromYYMM = parseInt(match[2], 10);

        let fullYearFromYYMM;
        const currentYearLastTwoDigits = currentYear % 100;

        if (yyPart <= currentYearLastTwoDigits) {
          fullYearFromYYMM = Math.floor(currentYear / 100) * 100 + yyPart;
        } else {
          fullYearFromYYMM = (Math.floor(currentYear / 100) - 1) * 100 + yyPart;
        }

        let ret = false;
        if (checkBadUpdates) {
          ret =
            ret ||
            (latestYearTag === fullYearFromYYMM &&
              mmFromYYMM === latestMonthTag);
        }

        if (checkMonthFalseUpdate) {
          const existingMonth = latestYearTag * 12 + latestMonthTag;
          const newMonth = fullYearFromYYMM * 12 + mmFromYYMM;
          ret = ret || Math.abs(existingMonth - newMonth) == 1;
        }

        return ret;
      }
    }
  }

  return false;
}

function addStyle() {
  let style = document.createElement("style");
  style.type = "text/css";
  let css = ".__tag_buttonFormula {";
  css += "padding: 5px; ";
  css += "margin: 4px; ";
  css += "color: #C8A675; ";
  css += "background-color: #1A1C1D; ";
  css += "border-radius: 10px; ";
  css += "border-color: #C8A675; ";
  css += "}";
  css += ".__tag_buttonFormula:hover{";
  css += "color: #F3DCBB; ";
  css += "border-color: #F3DCBB; ";
  css += "}";
  css += "#__tag_buttonExec{";
  css += "margin-right: 16px; ";
  css += "}";

  style.innerHTML = css;
  document.head.appendChild(style);
}

function createDivButton() {
  let divButton = document.createElement("button");
  divButton.textContent = "Check Tags";
  divButton.id = "__tag_divButton";
  divButton.style.position = "fixed";
  divButton.style.right = "205px";
  divButton.style.bottom = "15px";
  divButton.style.borderRadius = "18px";
  divButton.style.fontSize = "15px";
  divButton.style.padding = "5px 10px";
  divButton.style.border = "none";
  divButton.style.color = "white";
  divButton.style.cursor = "pointer";
  divButton.style.backgroundColor = "#4CAF50";

  document.body.appendChild(divButton);
  divButton.addEventListener("click", function () {
    document.getElementById("__tag_divFormula").style.display = "flex";
  });
}

function createDivFormula() {
  let divFormula = document.createElement("div");
  divFormula.id = "__tag_divFormula";
  divFormula.style.display = "none";
  divFormula.style.position = "fixed";
  divFormula.style.top = "50%";
  divFormula.style.left = "50%";
  divFormula.style.transform = "translate(-50%, -50%)";
  divFormula.style.flexDirection = "column";
  divFormula.style.zIndex = 1000;
  divFormula.style.margin = "15px";
  divFormula.style.backgroundColor = "#1A1C1D";
  divFormula.style.borderRadius = "10px";
  divFormula.style.padding = "10px";

  let strHTML =
    "<div><input style='margin-right:8px;' id='__tag_checknoyear' type='checkbox'></input><label for='__tag_checknoyear'>Check for no year</label></div>";
  strHTML +=
    "<div><input style='margin-right:8px;' id='__tag_checkduplicateyear' type='checkbox'></input><label for='__tag_checkduplicateyear'>Check for duplicate years</label></div>";
  strHTML +=
    "<div><input style='margin-right:8px;' id='__tag_checknomonth' type='checkbox'></input><label for='__tag_checknomonth'>Check for no month</label></div>";
  strHTML +=
    "<div><input style='margin-right:8px;' id='__tag_checkduplicatemonth' type='checkbox'></input><label for='__tag_checkduplicatemonth'>Check for duplicate months</label></div>";
  strHTML +=
    "<div><input style='margin-right:8px;' id='__tag_checknocar' type='checkbox'></input><label for='__tag_checknocar'>Check for no car-tags</label></div>";
  strHTML +=
    "<div><input style='margin-right:8px;' id='__tag_checkduplicatecar' type='checkbox'></input><label for='__tag_checkduplicatecar'>Check for duplicate car-tags</label></div>";
  strHTML +=
    "<div><input style='margin-right:8px;' id='__tag_checknoyymm' type='checkbox'></input><label for='__tag_checknoyymm'>Check for no YY-M tag</label></div>";
  strHTML +=
    "<div><input style='margin-right:8px;' id='__tag_checkduplicateyymm' type='checkbox'></input><label for='__tag_checkduplicateyymm'>Check for duplicate YY-M tags</label></div>";
  strHTML +=
    "<div><input style='margin-right:8px;' id='__tag_checkbadupdates' type='checkbox'></input><label for='__tag_checkbadupdates'>Check for bad updates</label></div>";
  strHTML +=
    "<div><input style='margin-right:8px;' id='__tag_checkmonthfalseupdate' type='checkbox'></input><label for='__tag_checkmonthfalseupdate'>Check for month false update</label></div>";
  strHTML +=
    "<div><input style='margin-right:8px;' id='__tag_checkno_xxxxm' type='checkbox'></input><label for='__tag_checkno_xxxxm'>Check for no XXXXm tag</label></div>";
  strHTML +=
    "<div><input style='margin-right:8px;' id='__tag_checkduplicate_xxxxm' type='checkbox'></input><label for='__tag_checkduplicate_xxxxm'>Check for duplicate XXXXm tags</label></div>";
  strHTML +=
    "<div><input style='margin-right:8px;' id='__tag_checkcopyrightyear' type='checkbox'></input><label for='__tag_checkcopyrightyear'>Check for no (C) tags</label></div>";

  strHTML += "<div style='display:flex;flex-direction:row;margin:15px;'>";
  strHTML +=
    "<button id='__tag_buttonExec' class='__tag_buttonFormula'>select</button><button id='__tag_buttonCancel' class='__tag_buttonFormula'>cancel</button>";
  strHTML += "</div>";

  divFormula.innerHTML = strHTML;
  document.body.appendChild(divFormula);

  document
    .getElementById("__tag_buttonCancel")
    .addEventListener("click", function () {
      document.getElementById("__tag_divFormula").style.display = "none";
    });

  document
    .getElementById("__tag_buttonExec")
    .addEventListener("click", function () {
      const noMonthEl = document.getElementById("__tag_checknoyear");
      const checkNoYear = noMonthEl.checked;
      const yearDupEl = document.getElementById("__tag_checkduplicateyear");
      const checkDuplicateYear = yearDupEl.checked;

      const noMonthElement = document.getElementById("__tag_checknomonth");
      const checkNoMonth = noMonthElement.checked;
      const monthDupEl = document.getElementById("__tag_checkduplicatemonth");
      const checkDuplicateMonth = monthDupEl.checked;

      const noCarElement = document.getElementById("__tag_checknocar");
      const checkNoCar = noCarElement.checked;
      const carDupEl = document.getElementById("__tag_checkduplicatecar");
      const checkDuplicateCar = carDupEl.checked;

      const noYYMMElement = document.getElementById("__tag_checknoyymm");
      const checkNoYYMM = noYYMMElement.checked;
      const dupYYMMElement = document.getElementById(
        "__tag_checkduplicateyymm"
      );
      const checkDuplicateYYMM = dupYYMMElement.checked;
      const badUpdatesElement = document.getElementById(
        "__tag_checkbadupdates"
      );
      const checkBadUpdates = badUpdatesElement.checked;

      const falseMonthUpdate = document.getElementById(
        "__tag_checkmonthfalseupdate"
      );
      const checkMonthFalseUpdate = falseMonthUpdate.checked;

      // Retrieve checked state for new XXXXm checkboxes
      const noXXXXmElement = document.getElementById("__tag_checkno_xxxxm");
      const checkNoXXXXm = noXXXXmElement.checked;
      const dupXXXXmElement = document.getElementById(
        "__tag_checkduplicate_xxxxm"
      );
      const checkDuplicateXXXXm = dupXXXXmElement.checked;

      const copyrightYearElement = document.getElementById(
        "__tag_checkcopyrightyear"
      );
      const checkCopyrightYear = copyrightYearElement.checked;

      let locationList = [];
      for (let i = 0; i < window.locations.length; i++) {
        if (
          hasBadTags(
            window.locations[i],
            checkNoYear,
            checkDuplicateYear,
            checkNoMonth,
            checkDuplicateMonth,
            checkNoCar,
            checkDuplicateCar,
            checkNoYYMM,
            checkDuplicateYYMM,
            checkBadUpdates,
            checkMonthFalseUpdate,
            checkNoXXXXm,
            checkDuplicateXXXXm,
            checkCopyrightYear
          )
        ) {
          locationList.push(window.locations[i]);
        }
      }

      window.editor.selectLocations(locationList);
      noMonthEl.checked = false;
      yearDupEl.checked = false;

      noMonthElement.checked = false;
      monthDupEl.checked = false;

      noCarElement.checked = false;
      carDupEl.checked = false;

      noYYMMElement.checked = false;
      dupYYMMElement.checked = false;
      badUpdatesElement.checked = false;
      noXXXXmElement.checked = false;
      dupXXXXmElement.checked = false;
      copyrightYearElement.checked = false;

      document.getElementById("__tag_divFormula").style.display = "none";
    });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//main

//wait for page load
while (window.editor == undefined) {
  await sleep(250);
}
await sleep(250);

//add buttons and styles
addStyle();
createDivButton();
createDivFormula();
