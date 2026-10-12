// ==UserScript==
// @name         map-making.app Random Review
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Review all selected locations in a random order, sorted along a compass direction, or (shift-click) along a nearest-neighbor path
// @author       JanosGeo
// @match        https://map-making.app/maps/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=map-making.app
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "mma-travel-review-direction";
  const DEFAULT_DIRECTION = "E";

  // Bearing is degrees clockwise from north: the direction of travel.
  // The walk starts at the opposite extreme (east starts at the westernmost).
  const DIRECTIONS = [
    {
      id: "N",
      bearing: 0,
      label: "South -> North",
    },
    {
      id: "NE",
      bearing: 45,
      label: "Southwest -> Northeast",
    },
    {
      id: "E",
      bearing: 90,
      label: "West -> East",
    },
    {
      id: "SE",
      bearing: 135,
      label: "Northwest -> Southeast",
    },
    {
      id: "S",
      bearing: 180,
      label: "North -> South",
    },
    {
      id: "SW",
      bearing: 225,
      label: "Northeast -> Southwest",
    },
    {
      id: "W",
      bearing: 270,
      label: "East -> West",
    },
    {
      id: "NW",
      bearing: 315,
      label: "Southeast -> Northwest",
    },
  ];

  const SORT_GLYPH = "⬆️";
  const PATH_GLYPH = "🚗";

  function constructTitle(label, usePath) {
    const prefix = usePath
      ? "Nearest path: "
      : "Review all selected locations: ";
    const suffix = usePath ? "" : " (shift-click to path instead)";
    return prefix + label + suffix;
  }

  // The arrow emoji faces north. The car emoji faces west, wheels down.
  // Eastward headings are mirrored so the car is not upside down.
  function glyphTransform(bearing, usePath, scale) {
    if (!usePath) {
      return `rotate(${bearing}deg) scale(${scale})`;
    }
    const mirror = bearing > 0 && bearing < 180;
    const rotation = mirror ? bearing - 90 : bearing + 90;
    if (mirror) {
      return `rotate(${rotation}deg) scaleX(-1) scale(${scale})`;
    }
    return `rotate(${rotation}deg) scale(${scale})`;
  }

  const COMPASS_GRID = ["NW", "N", "NE", "W", null, "E", "SW", "S", "SE"];

  let arrowEl = null;
  let arrowScale = 1;
  let pathMode = false;
  let popover = null;
  let hideTimer = null;
  let showTimer = null;
  const SHOW_DELAY_MS = 400;
  const compassCells = new Map();

  function directionById(id) {
    return DIRECTIONS.find((direction) => direction.id === id) || null;
  }

  function getDirection() {
    let id = DEFAULT_DIRECTION;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (directionById(stored)) id = stored;
    } catch (_err) {
      // localStorage can be unavailable; keep the default.
    }
    return directionById(id);
  }

  function setDirection(id) {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch (_err) {
      // Ignore storage failures; the in-memory click still runs.
    }
  }

  function collectUniqueLocations() {
    if (
      !window.editor ||
      !window.editor.selections ||
      !window.editor.beginReview
    ) {
      console.warn("Editor not available");
      return null;
    }

    const seen = new Set();
    const unique = [];

    for (const selection of window.editor.selections) {
      for (const location of selection.locations) {
        if (!seen.has(location.id)) {
          seen.add(location.id);
          unique.push(location);
        }
      }
    }

    return unique;
  }

  function hasCoords(location) {
    return (
      location &&
      location.location &&
      Number.isFinite(location.location.lat) &&
      Number.isFinite(location.location.lng)
    );
  }

  // Smallest projection onto the travel direction is the start extreme.
  function travelScore(location, north, east, cosLat) {
    return (
      location.location.lat * north + location.location.lng * cosLat * east
    );
  }

  function squaredDistance(a, b, cosLat) {
    const dLat = a.location.lat - b.location.lat;
    const dLng = (a.location.lng - b.location.lng) * cosLat;
    return dLat * dLat + dLng * dLng;
  }

  function partitionLocations(locations) {
    const withCoords = [];
    const withoutCoords = [];
    for (const location of locations) {
      if (hasCoords(location)) withCoords.push(location);
      else withoutCoords.push(location);
    }
    return { withCoords, withoutCoords };
  }

  function projectionAxes(locations, bearingDeg) {
    const meanLat =
      locations.reduce((sum, location) => sum + location.location.lat, 0) /
      locations.length;
    const cosLat = Math.cos((meanLat * Math.PI) / 180);
    const bearing = (bearingDeg * Math.PI) / 180;
    return {
      cosLat,
      north: Math.cos(bearing),
      east: Math.sin(bearing),
    };
  }

  function orderByDirection(locations, bearingDeg) {
    const { withCoords, withoutCoords } = partitionLocations(locations);
    if (withCoords.length === 0) return withoutCoords;

    const { cosLat, north, east } = projectionAxes(withCoords, bearingDeg);
    const ordered = withCoords.slice().sort((a, b) => {
      return (
        travelScore(a, north, east, cosLat) -
        travelScore(b, north, east, cosLat)
      );
    });
    return ordered.concat(withoutCoords);
  }

  function orderByNearestNeighbor(locations, bearingDeg) {
    const { withCoords, withoutCoords } = partitionLocations(locations);
    if (withCoords.length === 0) return withoutCoords;

    const { cosLat, north, east } = projectionAxes(withCoords, bearingDeg);

    let startIndex = 0;
    let bestScore = Infinity;
    for (let i = 0; i < withCoords.length; i++) {
      const score = travelScore(withCoords[i], north, east, cosLat);
      if (score < bestScore) {
        bestScore = score;
        startIndex = i;
      }
    }

    const ordered = [withCoords[startIndex]];
    const remaining = withCoords.slice();
    remaining.splice(startIndex, 1);

    while (remaining.length > 0) {
      const current = ordered[ordered.length - 1];
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dist = squaredDistance(current, remaining[i], cosLat);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      ordered.push(remaining.splice(bestIdx, 1)[0]);
    }

    return ordered.concat(withoutCoords);
  }

  function startRandomReview() {
    const unique = collectUniqueLocations();
    if (!unique || unique.length === 0) return;
    window.editor.beginReview(unique.sort(() => Math.random() - 0.5));
  }

  function startTravelReview(directionId, usePath) {
    const direction = directionById(directionId) || getDirection();
    const unique = collectUniqueLocations();
    if (!unique || unique.length === 0) return;
    const ordered = usePath
      ? orderByNearestNeighbor(unique, direction.bearing)
      : orderByDirection(unique, direction.bearing);
    window.editor.beginReview(ordered);
  }

  function applyArrowTransform(scale) {
    if (!arrowEl) return;
    if (scale !== undefined) arrowScale = scale;
    const direction = getDirection();
    arrowEl.textContent = pathMode ? PATH_GLYPH : SORT_GLYPH;
    arrowEl.style.transform = glyphTransform(
      direction.bearing,
      pathMode,
      arrowScale,
    );
    arrowEl.title = constructTitle(direction.label, pathMode);
  }

  function paintCompass() {
    const activeId = getDirection().id;
    const glyph = pathMode ? PATH_GLYPH : SORT_GLYPH;
    for (const [id, cell] of compassCells) {
      const direction = directionById(id);
      const active = id === activeId;
      cell.dataset.active = active ? "true" : "false";
      cell.title = constructTitle(direction.label, pathMode);
      if (active) {
        cell.style.background = "#dbe7ff";
      } else if (!cell.matches(":hover")) {
        cell.style.background = "transparent";
      }
      const glyphEl = cell.firstElementChild;
      if (glyphEl) {
        glyphEl.textContent = glyph;
        glyphEl.style.transform = glyphTransform(
          direction.bearing,
          pathMode,
          1,
        );
      }
    }
  }

  function setPathMode(next) {
    if (pathMode === next) return;
    pathMode = next;
    applyArrowTransform();
    paintCompass();
  }

  function cancelShow() {
    clearTimeout(showTimer);
    showTimer = null;
  }

  function scheduleShow() {
    cancelShow();
    if (popover && popover.style.display === "block") return;
    showTimer = setTimeout(() => {
      showTimer = null;
      showPopover();
    }, SHOW_DELAY_MS);
  }

  function hidePopover() {
    clearTimeout(hideTimer);
    cancelShow();
    if (popover) popover.style.display = "none";
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hidePopover, 200);
  }

  function positionPopover() {
    if (!popover || !arrowEl) return;
    const rect = arrowEl.getBoundingClientRect();
    const placeAbove = rect.top > 140;
    popover.style.left = `${rect.left + rect.width / 2}px`;
    if (placeAbove) {
      popover.style.top = `${rect.top}px`;
      popover.style.padding = "4px 4px 10px";
      popover.style.transform = "translate(-50%, -100%)";
    } else {
      popover.style.top = `${rect.bottom}px`;
      popover.style.padding = "10px 4px 4px";
      popover.style.transform = "translate(-50%, 0)";
    }
  }

  function showPopover() {
    ensurePopover();
    paintCompass();
    popover.style.display = "block";
    positionPopover();
  }

  function ensurePopover() {
    if (popover) return;

    popover = document.createElement("div");
    popover.className = "random-review-compass";
    popover.style.position = "fixed";
    popover.style.zIndex = "100000";
    popover.style.display = "none";
    popover.style.background = "#fff";
    popover.style.color = "#222";
    popover.style.border = "1px solid rgba(0, 0, 0, 0.15)";
    popover.style.borderRadius = "8px";
    popover.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.18)";
    popover.style.userSelect = "none";

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(3, 1.75rem)";
    grid.style.gap = "2px";

    for (const id of COMPASS_GRID) {
      const cell = document.createElement("span");
      cell.style.width = "1.75rem";
      cell.style.height = "1.75rem";
      cell.style.display = "flex";
      cell.style.alignItems = "center";
      cell.style.justifyContent = "center";
      cell.style.borderRadius = "4px";
      cell.style.boxSizing = "border-box";

      if (id) {
        const glyph = document.createElement("span");
        glyph.style.display = "inline-block";
        glyph.style.lineHeight = "1";
        cell.appendChild(glyph);
        cell.style.cursor = "pointer";
        compassCells.set(id, cell);

        cell.addEventListener("mouseenter", () => {
          clearTimeout(hideTimer);
          if (cell.dataset.active !== "true") {
            cell.style.background = "rgba(0, 0, 0, 0.06)";
          }
        });
        cell.addEventListener("mouseleave", () => {
          if (cell.dataset.active === "true") {
            cell.style.background = "#dbe7ff";
          } else {
            cell.style.background = "transparent";
          }
        });
        cell.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          setDirection(id);
          applyArrowTransform(1);
          paintCompass();
          hidePopover();
          startTravelReview(id, event.shiftKey);
        });
      }

      grid.appendChild(cell);
    }

    popover.appendChild(grid);
    popover.addEventListener("mouseenter", () => {
      clearTimeout(hideTimer);
    });
    popover.addEventListener("mouseleave", (event) => {
      if (
        arrowEl &&
        (event.relatedTarget === arrowEl ||
          arrowEl.contains(event.relatedTarget))
      ) {
        return;
      }
      scheduleHide();
    });
    document.body.appendChild(popover);
  }

  function injectReviewControls() {
    const reviewButton = document.querySelector('[data-qa="selection-review"]');
    if (!reviewButton) return;
    if (reviewButton.querySelector(".random-review-die")) return;

    const die = document.createElement("span");
    die.className = "random-review-die";
    die.style.cursor = "pointer";
    die.style.marginInlineStart = "0.25rem";
    die.style.transition = "transform 0.1s ease, filter 0.1s ease";
    die.style.display = "inline-block";
    die.textContent = "🎲";
    die.title = "Review all selected locations in a randomized order";

    die.addEventListener("mouseenter", () => {
      die.style.transform = "scale(1.2) rotate(5deg)";
      die.style.filter = "brightness(1.3)";
    });

    die.addEventListener("mouseleave", () => {
      die.style.transform = "scale(1) rotate(0deg)";
      die.style.filter = "brightness(1)";
    });

    die.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startRandomReview();
    });

    const arrow = document.createElement("span");
    arrow.className = "random-review-travel";
    arrow.style.cursor = "pointer";
    arrow.style.marginInlineStart = "0.25rem";
    arrow.style.transition = "transform 0.1s ease, filter 0.1s ease";
    arrow.style.display = "inline-block";
    arrow.style.transformOrigin = "center";
    arrow.style.lineHeight = "1";
    arrowEl = arrow;
    applyArrowTransform(1);

    arrow.addEventListener("mouseenter", () => {
      clearTimeout(hideTimer);
      applyArrowTransform(1.2);
      arrow.style.filter = "brightness(1.3)";
      scheduleShow();
    });

    arrow.addEventListener("mouseleave", (event) => {
      cancelShow();
      applyArrowTransform(1);
      arrow.style.filter = "brightness(1)";
      if (popover && popover.contains(event.relatedTarget)) return;
      scheduleHide();
    });

    arrow.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      hidePopover();
      startTravelReview(getDirection().id, event.shiftKey);
    });

    reviewButton.appendChild(die);
    reviewButton.appendChild(arrow);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(injectReviewControls, 500);
    });
  } else {
    setTimeout(injectReviewControls, 500);
  }

  const bodyObserver = new MutationObserver(() => {
    injectReviewControls();
  });

  bodyObserver.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("keydown", (event) => setPathMode(event.shiftKey));
  window.addEventListener("keyup", (event) => setPathMode(event.shiftKey));
  window.addEventListener("blur", () => setPathMode(false));
})();
