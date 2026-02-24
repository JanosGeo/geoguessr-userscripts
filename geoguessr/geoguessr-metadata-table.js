// ==UserScript==
// @name         Geoguessr Challenge metadata table
// @namespace    http://tampermonkey.net/
// @version      1.4
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
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m${seconds}s`;
  }

  // Format date to readable string
  function formatDate(date) {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
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
      const guesses = game.player.guesses;

      const startTimes = rounds.map((r) => new Date(r.startTime).getTime());
      const roundsPlayed = rounds.length;

      // Calculate time differences between consecutive rounds (excluding guess time)
      const roundDiffs = [];
      for (let i = 1; i < startTimes.length; i++) {
        // Gap = time between round starts minus the time player spent guessing in the previous round
        // guessTime is in seconds, so multiply by 1000 to convert to milliseconds
        const guessTime = (guesses[i - 1]?.time || 0) * 1000;
        const gap = startTimes[i] - startTimes[i - 1] - guessTime;
        roundDiffs.push(gap);
      }

      const firstStart = startTimes[0];
      const lastStart = startTimes[startTimes.length - 1];
      const lastGuessTime = (guesses[guesses.length - 1]?.time || 0) * 1000;
      const lastRoundEnd = lastStart + lastGuessTime;

      // Build per-round data
      const roundDetails = [];
      for (let i = 0; i < rounds.length; i++) {
        roundDetails.push({
          roundNumber: i + 1,
          points: guesses[i]?.roundScore.amount || 0,
          startTime: startTimes[i],
          guessTime: (guesses[i]?.time || 0) * 1000,
        });
      }

      results.push({
        name: player.nick,
        startFirst: firstStart,
        startLast: lastRoundEnd,
        lastRoundGuessTime: lastGuessTime,
        totalElapsed: lastRoundEnd - firstStart,
        roundsPlayed: roundsPlayed,
        medianBetweenRounds: getMedian(roundDiffs),
        maxBetweenRounds: Math.max(...roundDiffs, 0),
        roundDetails: roundDetails,
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
                ">Challenge Data (ordered by start time, click on row to show per-round stats)</h3>
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
                            ">Last round ended</th>
                            <th style="
                                text-align: left;
                                padding: 10px 8px;
                                color: #888;
                                font-weight: 600;
                            ">Time on last round</th>
                            <th style="
                                text-align: left;
                                padding: 10px 8px;
                                color: #888;
                                font-weight: 600;
                            ">Rounds</th>
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
                <tr class="results-row" data-index="${index}" style="cursor: pointer; border-bottom: 1px solid #333;">
                    <td style="padding: 10px 8px; color: #666;">${index + 1}</td>
                    <td style="padding: 10px 8px; font-weight: 500;">${r.name}</td>
                    <td style="padding: 10px 8px;">${formatDate(firstDate)}</td>
                    <td style="padding: 10px 8px;">${formatDate(lastDate)}</td>
                    <td style="padding: 10px 8px;">${formatTime(r.lastRoundGuessTime)}</td>
                    <td style="padding: 10px 8px;">${r.roundsPlayed}</td>
                    <td style="padding: 10px 8px;">${formatTime(r.totalElapsed)}</td>
                    <td style="padding: 10px 8px;">${formatTime(r.medianBetweenRounds)}</td>
                    <td style="padding: 10px 8px;">${formatTime(r.maxBetweenRounds)}</td>
                </tr>
                <tr class="details-row" data-index="${index}" style="display: none; border-bottom: 1px solid #333;">
                    <td colspan="9" style="padding: 0;">
                        <table style="width: auto; background: #252525; border-collapse: collapse; min-width: 0;">
                            <thead>
                                <tr style="border-bottom: 1px solid #444;">
                                    <th style="text-align: left; padding: 4px 8px; color: #aaa; font-weight: 600; white-space: nowrap;">Round</th>
                                    <th style="text-align: left; padding: 4px 8px; color: #aaa; font-weight: 600; white-space: nowrap;">Points</th>
                                    <th style="text-align: left; padding: 4px 8px; color: #aaa; font-weight: 600; white-space: nowrap;">Time before</th>
                                    <th style="text-align: left; padding: 4px 8px; color: #aaa; font-weight: 600; white-space: nowrap;">Time Started</th>
                                    <th style="text-align: left; padding: 4px 12px; color: #aaa; font-weight: 600; white-space: nowrap;">Time Spent</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

      r.roundDetails.forEach((rd, rdIndex) => {
        const roundStartDate = new Date(rd.startTime);

        // Calculate gap from previous round (excluding guess time)
        let gap = "";
        if (rdIndex > 0) {
          const prevRound = r.roundDetails[rdIndex - 1];
          const prevGuessTime = prevRound.guessTime;
          gap = formatTime(rd.startTime - prevRound.startTime - prevGuessTime);
        }

        tableHtml += `
                                <tr style="border-bottom: 1px solid #333;">
                                    <td style="padding: 3px 8px; color: #888; white-space: nowrap;">${rd.roundNumber}</td>
                                    <td style="padding: 3px 8px; white-space: nowrap;">${rd.points}</td>
                                    <td style="padding: 3px 8px; white-space: nowrap;">${gap}</td>
                                    <td style="padding: 3px 8px; white-space: nowrap;">${formatDate(roundStartDate)}</td>
                                    <td style="padding: 3px 12px; white-space: nowrap;">${formatTime(rd.guessTime)}</td>
                                </tr>
        `;
      });

      tableHtml += `
                            </tbody>
                        </table>
                    </td>
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

    // Add click handlers for expandable rows
    document.querySelectorAll(".results-row").forEach((row) => {
      row.addEventListener("click", () => {
        const index = row.getAttribute("data-index");
        const detailsRow = document.querySelector(
          `.details-row[data-index="${index}"]`,
        );
        if (detailsRow) {
          detailsRow.style.display =
            detailsRow.style.display === "none" ? "table-row" : "none";
        }
      });
    });
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
