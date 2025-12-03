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
  // some timeout to avoid race condition on tag addition, should work pretty consistently
  if (EXIT_LOCATION_ON_ADD) {
    setTimeout(
      () =>
        document
          .getElementsByClassName("location-preview__actions")[0]
          .getElementsByClassName("button--primary")[0]
          .click(),
      100
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

function toggleTagsBeforeDoubleDash() {
  const tagList = document.getElementsByClassName("tag-list")[0];
  if (!tagList) return;

  const tagButtons = tagList.getElementsByClassName("tag");
  const tagLabels = tagList.getElementsByClassName("tag");
  for (let i = 0; i < tagButtons.length; i++) {
    const tag = tagButtons[i];
    console.log(tag.textContent.trim());
    if (tag.textContent.trim().startsWith("--")) {
      break;
    }
    tag.click();
  }
}

function deselectAll() {
  const deselectButton = document.querySelector('[data-qa="selection-clear"]');
  deselectButton.click();
}

window.onkeydown = function (event) {
  const charCode = event.keyCode ?? event.charCode;
  if (!charCode) return;
  // Ignore input fields
  if (event.target.tagName.toLowerCase() === "input") return;

  // Check for Shift + E, in which case activate/deactivate all tags up until the tag "--"
  // Check for Shift + E (using event.key)
  if (event.shiftKey && event.key === "E") {
    toggleTagsBeforeDoubleDash();
    return;
  }

  // Check for Shift + A, which is a shortcut for and selections
  if (event.shiftKey && event.key === "A") {
    window.editor.selectIntersection();
    return;
  }

  // Check for Shift + Q, which is used to deselect all locations
  if (event.shiftKey && event.key === "Q") {
    deselectAll();
  }

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
