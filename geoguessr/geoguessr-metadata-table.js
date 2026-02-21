// ==UserScript==
// @name         Geoguessr Challenge metadata table
// @namespace    http://tampermonkey.net/
// @version      1.1
// @license      MIT
// @description  Creates a table with some metadata for challenges
// @author       JanosGeo
// @match        https://www.geoguessr.com/results/*
// @grant        GM_xmlhttpRequest
// @connect      www.geoguessr.com
// @run-at       document-idle
// @downloadURL https://update.greasyfork.org/scripts/567040/Geoguessr%20Challenge%20metadata%20table.user.js
// @updateURL https://update.greasyfork.org/scripts/567040/Geoguessr%20Challenge%20metadata%20table.meta.js
// ==/UserScript==

(function () {
  "use strict";

  // Format milliseconds to XXmYYs
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m${seconds}s`;
  }

  // Get game ID from URL
  function getGameId() {
    const match = window.location.pathname.match(/\/results\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  // Calculate median from array of values
  function getMedian(values) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  // Create the results table
  function createTable(data) {
    const items = data.items;
    const results = [];

    for (const pd of items) {
      const game = pd.game;
      const player = game.player;
      const rounds = game.rounds;

      const startTimes = rounds.map((r) => new Date(r.startTime).getTime());

      // Calculate time differences between consecutive rounds
      const roundDiffs = [];
      for (let i = 1; i < startTimes.length; i++) {
        roundDiffs.push(startTimes[i] - startTimes[i - 1]);
      }

      const firstStart = startTimes[0];
      const lastStart = startTimes[startTimes.length - 1];

      results.push({
        name: player.nick,
        startFirst: firstStart,
        startLast: lastStart,
        totalElapsed: lastStart - firstStart,
        medianBetweenRounds: getMedian(roundDiffs),
        maxBetweenRounds: Math.max(...roundDiffs, 0),
      });
    }

    // Sort by first round start time
    results.sort((a, b) => a.startFirst - b.startFirst);

    // Build the table HTML
    let tableHtml = `
            <div class="custom-results-table" style="
                margin-top: 20px;
                padding: 16px;
                background: #1a1a1a;
                border-radius: 8px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                overflow-x: auto;
            ">
                <h3 style="
                    margin: 0 0 16px 0;
                    color: #fff;
                    font-size: 18px;
                ">Challenge Results (ordered by start time)</h3>
                <table style="
                    width: 100%;
                    border-collapse: collapse;
                    color: #fff;
                    font-size: 14px;
                ">
                    <thead>
                        <tr style="
                            border-bottom: 2px solid #333;
                        ">
                            <th style="
                                text-align: left;
                                padding: 10px 8px;
                                color: #888;
                                font-weight: 600;
                            ">#</th>
                            <th style="
                                text-align: left;
                                padding: 10px 8px;
                                color: #888;
                                font-weight: 600;
                            ">Player</th>
                            <th style="
                                text-align: left;
                                padding: 10px 8px;
                                color: #888;
                                font-weight: 600;
                            ">First round started</th>
                            <th style="
                                text-align: left;
                                padding: 10px 8px;
                                color: #888;
                                font-weight: 600;
                            ">Last Round started</th>
                            <th style="
                                text-align: left;
                                padding: 10px 8px;
                                color: #888;
                                font-weight: 600;
                            ">Total Time for challenge</th>
                            <th style="
                                text-align: left;
                                padding: 10px 8px;
                                color: #888;
                                font-weight: 600;
                            ">Median time between rounds</th>
                            <th style="
                                text-align: left;
                                padding: 10px 8px;
                                color: #888;
                                font-weight: 600;
                            ">Maximum time between rounds</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

    results.forEach((r, index) => {
      const firstDate = new Date(r.startFirst);
      const lastDate = new Date(r.startLast);

      tableHtml += `
                <tr style="border-bottom: 1px solid #333;">
                    <td style="padding: 10px 8px; color: #666;">${index + 1}</td>
                    <td style="padding: 10px 8px; font-weight: 500;">${r.name}</td>
                    <td style="padding: 10px 8px;">${firstDate.toLocaleDateString()} ${firstDate.toLocaleTimeString()}</td>
                    <td style="padding: 10px 8px;">${lastDate.toLocaleDateString()} ${lastDate.toLocaleTimeString()}</td>
                    <td style="padding: 10px 8px;">${formatTime(r.totalElapsed)}</td>
                    <td style="padding: 10px 8px;">${formatTime(r.medianBetweenRounds)}</td>
                    <td style="padding: 10px 8px;">${formatTime(r.maxBetweenRounds)}</td>
                </tr>
            `;
    });

    tableHtml += `
                    </tbody>
                </table>
            </div>
        `;

    return tableHtml;
  }

  // Inject the table into the page
  function injectTable(container, data) {
    // Check if table already exists
    if (document.querySelector(".custom-results-table")) {
      return;
    }

    const tableHtml = createTable(data);
    container.insertAdjacentHTML("afterend", tableHtml);
  }

  // Fetch data from Geoguessr API
  function fetchResults() {
    const gameId = getGameId();

    if (!gameId) {
      console.error("Could not extract game ID from URL");
      return;
    }

    const apiUrl = `https://www.geoguessr.com/api/v3/results/highscores/${gameId}?friends=false&limit=9999&minRounds=1`;

    GM_xmlhttpRequest({
      method: "GET",
      url: apiUrl,
      onload: function (response) {
        try {
          const data = JSON.parse(response.responseText);

          if (data.items && data.items.length > 0) {
            const container = document.querySelector(
              '[class^="results_container__"]',
            );

            if (container) {
              injectTable(container, data);
            } else {
              console.error("Results container not found");
            }
          } else {
            console.log("No results found");
          }
        } catch (e) {
          console.error("Error parsing response:", e);
        }
      },
      onerror: function (error) {
        console.error("Error fetching results:", error);
      },
    });
  }

  // Wait for the container to appear
  function waitForContainer() {
    const container = document.querySelector('[class^="results_container__"]');

    if (container) {
      fetchResults();
    } else {
      // Retry after a short delay if not found yet
      setTimeout(waitForContainer, 500);
    }
  }

  // Start the process
  waitForContainer();
})();
