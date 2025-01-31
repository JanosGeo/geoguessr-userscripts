// ==UserScript==
// @name         map-making.app Keyboard shortcuts
// @namespace    http://tampermonkey.net/
// @version      2024-09-28
// @description  Adding keyboard shortcuts to map-making
// @author       JanosGeo
// @match        https://map-making.app/maps/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=map-making.app
// @grant        none
// ==/UserScript==

const EXIT_LOCATION_ON_ADD = true;

function toggleSelectValueVisibility() {
  document.querySelectorAll(".select__value").forEach((element) => {
    element.style.display = element.style.display === "none" ? "block" : "none";
  });
}

function addNthTag(n) {
  // find the tag add buttons
  const tagButtons = document.getElementsByClassName("tag__button--add");
  // not enough tags, leave
  if (tagButtons.length < n) return;
  // add the tag
  tagButtons[n - 1].click();
  // 0.01 second timeout to avoid race condition on tag addition, should work pretty consistently
  if (EXIT_LOCATION_ON_ADD) {
    setTimeout(
      () =>
        document
          .getElementsByClassName("location-preview__actions")[0]
          .getElementsByClassName("button--primary")[0]
          .click(),
      10
    );
  }
}

function toggleNthTag(n) {
  // find the tag buttons
  const tagList = document.getElementsByClassName("tag-list")[0];
  const tagButtons = tagList.getElementsByClassName("tag");
  // not enough tags, leave
  if (tagButtons.length < n) return;
  // Select the tag
  tagButtons[n - 1].click();
}

window.onkeydown = function (event) {
  const charCode = event.keyCode ?? event.charCode;
  if (!charCode) return;
  // Ignore input fields
  if (event.target.tagName.toLowerCase() === "input") return;
  // numbers are in the [48, 57] range
  if (charCode < 48) return;
  if (charCode > 57) return;
  if (event.shiftKey) {
    // 0 stands for the 10th tag, add a special case for that
    if (charCode === 48) toggleNthTag(10);
    else toggleNthTag(charCode - 48);
  } else {
    // 0 stands for the 10th tag, add a special case for that
    if (charCode === 48) addNthTag(10);
    else addNthTag(charCode - 48);
  }
};
