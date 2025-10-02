// ==UserScript==
// @name         map-making.app random location selector
// @namespace    http://tampermonkey.net/
// @version      2025-07-20
// @description  in map edition page, adds a button to select a random location
// @author       JanosGeo
// @match        https://map-making.app/maps/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=map-making.app
// @grant        none
// ==/UserScript==

function addStyle() {
  let style = document.createElement("style");
  style.type = "text/css";
  let css = ".buttonRandom {";
  css += "padding: 5px; ";
  css += "margin: 4px; ";
  css += "color: #C8A675; ";
  css += "background-color: #1A1C1D; ";
  css += "border-radius: 10px; ";
  css += "border-color: #C8A675; ";
  css += "}";
  css += ".buttonRandom:hover{";
  css += "color: #F3DCBB; ";
  css += "border-color: #F3DCBB; ";
  css += "}";
  style.innerHTML = css;
  document.head.appendChild(style);
}

function createRandomSelectButton() {
  let randomButton = document.createElement("button");
  randomButton.textContent = "Random Location";
  randomButton.id = "randomButton";
  randomButton.style.position = "fixed";
  randomButton.style.right = "15px";
  randomButton.style.bottom = "15px";
  randomButton.style.borderRadius = "18px";
  randomButton.style.fontSize = "15px";
  randomButton.style.padding = "5px 10px";
  randomButton.style.border = "none";
  randomButton.style.color = "white";
  randomButton.style.cursor = "pointer";
  randomButton.style.backgroundColor = "#4CAF50"; // Green color

  document.body.appendChild(randomButton);

  randomButton.addEventListener("click", function () {
    if (window.locations && window.locations.length > 0) {
      const randomIndex = Math.floor(Math.random() * window.locations.length);
      const randomLocation = window.locations[randomIndex];
      window.editor.selectLocations([randomLocation]);
    } else {
      console.log("No locations found to select from.");
    }
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
createRandomSelectButton();
