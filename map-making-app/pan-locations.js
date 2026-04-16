// ==UserScript==
// @name         Geoguessr Map-Making Pan Locations
// @namespace    https://greasyfork.org/en/users/1521603
// @version      1.4.0
// @description  Apply relative heading offset + pitch/zoom from a NEWPAN reference location, or set values manually
// @match        *://map-making.app/maps/*
// @grant        GM_setClipboard
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// ==/UserScript==
(function () {
  "use strict";

  function deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map((item) => deepClone(item));
    if (obj instanceof Date) return new Date(obj.getTime());

    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  function getSelection() {
    const editor = unsafeWindow.editor;
    if (editor) {
      const selectedLocs = editor.selections;
      return deepClone(
        selectedLocs.flatMap((selection) => selection.locations),
      );
    }
  }

  function updateLocation(original, updated) {
    const editor = unsafeWindow.editor;
    if (editor) {
      editor.removeLocations(original);
      editor.importLocations(updated);
    }
  }

  function normalizeHeading(heading) {
    return ((heading % 360) + 360) % 360;
  }

  function parseNumber(value, fallback) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }

  function finish(selections, updated) {
    updateLocation(selections, updated);

    const exportJSON = updated.map((loc) => ({
      lat: loc.location.lat,
      lng: loc.location.lng,
      heading: loc.heading,
      pitch: loc.pitch,
      zoom: loc.zoom,
      panoId: loc.panoId,
      extra: { tags: loc.tags },
    }));

    GM_setClipboard(JSON.stringify(exportJSON));

    Swal.fire(
      "Done!",
      "Pan settings applied. JSON copied to clipboard. Save your map and refresh.",
      "success",
    );
  }

  async function run() {
    const selections = getSelection();

    if (!selections || selections.length < 1) {
      Swal.fire(
        "No selection!",
        "Please select at least one location.",
        "warning",
      );
      return;
    }

    const { isConfirmed, value } = await Swal.fire({
      title: "Pan Locations",
      html: `
                <div style="text-align: left; display: flex; flex-direction: column; gap: 12px;">

                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="radio" name="pan-mode" value="newpan" checked />
                        <span>Apply based on REF/NEWPAN tags</span>
                    </label>

                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="radio" name="pan-mode" value="zoom" />
                        <span style="width: 160px;">Set zoom for all locations</span>
                        <input id="zoom-input" class="swal2-input" type="number" step="0.1" value="0" style="margin: 0; width: 80px;" />
                    </label>

                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="radio" name="pan-mode" value="pitch" />
                        <span style="width: 160px;">Set pitch for all locations</span>
                        <input id="pitch-input" class="swal2-input" type="number" step="0.1" value="0" style="margin: 0; width: 80px;" />
                    </label>

                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="radio" name="pan-mode" value="heading" />
                        <span style="width: 160px;">Adjust heading (offset)</span>
                        <input id="heading-input" class="swal2-input" type="number" step="1" value="180" style="margin: 0; width: 80px;" />
                    </label>

                </div>
            `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Apply",
      cancelButtonText: "Cancel",
      didOpen: () => {
        const radios = Swal.getPopup().querySelectorAll(
          'input[name="pan-mode"]',
        );
        const inputs = {
          zoom: document.getElementById("zoom-input"),
          pitch: document.getElementById("pitch-input"),
          heading: document.getElementById("heading-input"),
        };

        function updateInputStates() {
          const selected = Swal.getPopup().querySelector(
            'input[name="pan-mode"]:checked',
          )?.value;
          Object.entries(inputs).forEach(([key, input]) => {
            input.disabled = key !== selected;
            input.style.opacity = key === selected ? "1" : "0.3";
          });
        }

        radios.forEach((radio) =>
          radio.addEventListener("change", updateInputStates),
        );

        ["zoom", "pitch", "heading"].forEach((id) => {
          inputs[id].addEventListener("focus", () => {
            Swal.getPopup().querySelector(`input[value="${id}"]`).checked =
              true;
            updateInputStates();
          });
        });

        updateInputStates(); // set initial state
      },
      preConfirm: () => ({
        mode: Swal.getPopup().querySelector('input[name="pan-mode"]:checked')
          ?.value,
        zoom: parseNumber(document.getElementById("zoom-input").value, 0),
        pitch: parseNumber(document.getElementById("pitch-input").value, 0),
        heading: parseNumber(
          document.getElementById("heading-input").value,
          180,
        ),
      }),
    });

    if (!isConfirmed) return;

    const { mode, zoom, pitch, heading } = value;

    if (mode === "newpan") {
      const refLoc = selections.find((loc) => loc.tags?.includes("REF"));
      const newPanLoc = selections.find((loc) => loc.tags?.includes("NEWPAN"));

      if (!refLoc) {
        Swal.fire(
          "Missing REF location!",
          'Could not find a location tagged "REF" in your selection.',
          "warning",
        );
        return;
      }
      if (!newPanLoc) {
        Swal.fire(
          "Missing NEWPAN location!",
          'Could not find a location tagged "NEWPAN" in your selection.',
          "warning",
        );
        return;
      }

      const headingOffset = (newPanLoc.heading ?? 0) - (refLoc.heading ?? 0);
      const newPitch = newPanLoc.pitch ?? 0;
      const newZoom = newPanLoc.zoom ?? 0;

      const updated = selections.map((loc) => {
        if (loc.tags?.includes("NEWPAN")) return loc;
        return {
          ...loc,
          heading: normalizeHeading((loc.heading ?? 0) + headingOffset),
          pitch: newPitch,
          zoom: newZoom,
        };
      });

      finish(selections, updated);
    } else if (mode === "zoom") {
      finish(
        selections,
        selections.map((loc) => ({ ...loc, zoom })),
      );
    } else if (mode === "pitch") {
      finish(
        selections,
        selections.map((loc) => ({ ...loc, pitch })),
      );
    } else if (mode === "heading") {
      finish(
        selections,
        selections.map((loc) => ({
          ...loc,
          heading: normalizeHeading((loc.heading ?? 0) + heading),
        })),
      );
    }
  }

  const btn = document.createElement("button");
  btn.textContent = "Pan Locs";
  btn.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 55px;
        border-radius: 18px;
        padding: 5px 10px;
        border: none;
        color: white;
        cursor: pointer;
        background-color: #2196F3;
        z-index: 9999;
    `;
  btn.addEventListener("click", run);
  document.body.appendChild(btn);
})();
