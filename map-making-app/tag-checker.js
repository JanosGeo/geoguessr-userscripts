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
  checkDuplicateCar
) {
  const currentYear = new Date().getFullYear();

  if (!Array.isArray(location.tags)) {
    return true;
  }

  const getFilteredTags = (filterFn) => location.tags.filter(filterFn);

  if (checkNoYear || checkDuplicateYear) {
    const yearTags = getFilteredTags((tag) => {
      const year = parseInt(tag, 10);
      return year >= 2005 && year <= currentYear;
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
      (tag) => tag === "Gen2" || tag === "Gen3" || tag.startsWith("gen4-")
    );
    if (checkNoCar && carTags.length === 0) return true;
    if (checkDuplicateCar && carTags.length > 1) return true;
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
      console.log("run");
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
            checkDuplicateCar
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
