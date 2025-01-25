// ==UserScript==
// @name         map-making.app formula selector
// @namespace    http://tampermonkey.net/
// @version      2024-09-08
// @description  in map edition page, adds a formula button at the bottom right
// @author       .flamby.
// @match        https://map-making.app/maps/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=map-making.app
// @grant        none
// ==/UserScript==

// JanosGeo comments:
// Modified the code to
// 1. Use the order and same color for the tags
// 2. Customize the styling
// 3. Add the option to right-click to make an intersection instead of a union.

function addStyle() {
  let style = document.createElement("style");
  style.type = "text/css";
  let css = ".buttonFormula {";
  css += "padding: 5px; ";
  css += "margin: 4px; ";
  css += "color: #C8A675; ";
  css += "background-color: #1A1C1D; ";
  css += "border-radius: 10px; ";
  css += "border-color: #C8A675; ";
  css += "}";
  css += ".buttonFormula:hover{";
  css += "color: #F3DCBB; ";
  css += "border-color: #F3DCBB; ";
  css += "}";
  css += "#buttonExec{";
  css += "margin-right: 16px; ";
  css += "}";

  style.innerHTML = css;
  document.head.appendChild(style);
}

function createDivButton() {
  let divButton = document.createElement("button");
  divButton.textContent = "Selections";
  divButton.id = "divButton";
  divButton.style.position = "fixed";
  divButton.style.right = "110px";
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
    updateTagList();
    document.getElementById("divFormula").style.display = "flex";
  });
}

function unionTag(tag) {
  let original = document.getElementById("inputFormula").value;
  if (original !== "") {
    original += " || ";
  }
  document.getElementById("inputFormula").value = original + "{" + tag + "}";
}

function intersectTag(tag) {
  let original = document.getElementById("inputFormula").value;
  if (original !== "") {
    original = "(" + original + ") && ";
  }
  document.getElementById("inputFormula").value = original + "{" + tag + "}";
}

function handleClick(event, tag) {
  if (event.button == 0) {
    // Left click
    unionTag(tag);
  } else if (event.button == 1) {
    // Wheel click, do nothing for now
  } else if (event.button == 2) {
    // right click
    event.preventDefault();
    intersectTag(tag);
  }
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(arr) {
  return (
    "#" +
    componentToHex(arr[0]) +
    componentToHex(arr[1]) +
    componentToHex(arr[2])
  );
}

function textColor(arr) {
  let r = arr[0];
  let g = arr[1];
  let b = arr[2];
  return r * 0.299 + g * 0.587 + b * 0.114 >= 125 ? "black" : "white";
}

function updateTagList() {
  // Read tags in the proper order
  let tags = [];
  for (const tag in window.editor.tags) {
    tags.push(window.editor.tags[tag]);
  }
  tags.sort((a, b) => a.order - b.order);

  let strHTML = "";
  for (const tag in tags) {
    const name = tags[tag].tag;
    strHTML +=
      "<button id='buttonTag_" +
      name +
      "' class='buttonFormula'>" +
      name +
      "</button>";
  }
  document.getElementById("divTagList").innerHTML = strHTML;

  for (const tag in tags) {
    const name = tags[tag].tag;
    let button = document.getElementById("buttonTag_" + name);
    button.style.backgroundColor = rgbToHex(tags[tag].color);
    button.style.color = textColor(tags[tag].color);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
    button.addEventListener("mousedown", (event) => {
      handleClick(event, name);
    });
  }
}

function createDivFormula() {
  let divFormula = document.createElement("div");
  divFormula.id = "divFormula";
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
    "<div id='divTagList' style='display:flex;flex-direction:row;max-width:50vw;flex-wrap:wrap;'>";
  strHTML += "</div>";

  strHTML += "<div style='display:flex;flex-direction:row;margin:15px;'>";
  strHTML +=
    "<span style='margin:5px;'>Formula</span><input id='inputFormula' type='text' style='width:50vw;margin:5px;font-size:16px;' title='Example: ({black_car}||{white_car}) && !{antenna}'/>";
  strHTML +=
    "<button id='buttonExec' class='buttonFormula'>select</button><button id='buttonClear' class='buttonFormula'>clear</button><button id='buttonCancel' class='buttonFormula'>cancel</button>";
  strHTML += "</div>";

  divFormula.innerHTML = strHTML;
  document.body.appendChild(divFormula);

  document
    .getElementById("buttonCancel")
    .addEventListener("click", function () {
      document.getElementById("divFormula").style.display = "none";
    });

  document.getElementById("buttonClear").addEventListener("click", function () {
    document.getElementById("inputFormula").value = "";
  });

  document.getElementById("buttonExec").addEventListener("click", function () {
    let strFormula = document.getElementById("inputFormula").value;
    while (strFormula.includes("{")) {
      let intStart = strFormula.indexOf("{");
      let intEnd = strFormula.indexOf("}");
      if (intStart + 1 >= intEnd) {
        return 0;
      }
      let tagName = strFormula.substring(intStart + 1, intEnd);

      strFormula =
        strFormula.substring(0, intStart) +
        "window.locations[i].tags.includes('" +
        tagName +
        "')" +
        strFormula.substring(intEnd + 1, strFormula.length);
    }

    let locationList = [];
    for (let i = 0; i < window.locations.length; i++) {
      if (eval(strFormula)) {
        locationList.push(window.locations[i]);
      }
    }
    window.editor.selectLocations(locationList);
    document.getElementById("divFormula").style.display = "none";
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
