/**
 * InitiaArcade SDK v1.0.1
 *
 * Connect your Unity WebGL game to the InitiaArcade platform.
 * Include this file in your WebGL build to enable on-chain scoring,
 * token rewards, and blockchain interactions.
 *
 * Documentation: https://initia-arcade.vercel.app/sdk
 * Platform:      https://initia-arcade.vercel.app
 * GitHub:        https://github.com/YOUR_USERNAME/initia-arcade
 */

(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────────
  // Internal state
  // ─────────────────────────────────────────────────────────────
  let _gameId   = null;
  let _debug    = false;
  let _ready    = false;
  let _platform = window.parent;

  // ─────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────

  function _log(...args) {
    if (_debug) console.log("[ArcadeSDK]", ...args);
  }

  function _warn(...args) {
    console.warn("[ArcadeSDK]", ...args);
  }

  function _send(type, data) {
    if (!_ready && type !== "SDK_READY") {
      _warn("SDK not initialized. Call ArcadeSDK.init() first.");
      return;
    }
    try {
      _platform.postMessage(
        { type, ...data, _sdk: true, gameId: _gameId, sdkVersion: "1.0.1" },
        "*"
      );
      _log("Event sent →", type, data);
    } catch (e) {
      console.error("[ArcadeSDK] postMessage failed:", e);
    }
  }

  // Listen for responses from the platform
  window.addEventListener("message", function (event) {
    if (!event.data || !event.data._platform) return;

    const { type } = event.data;

    if (type === "TRANSACTION_SUCCESS") {
      _log("Transaction confirmed on-chain:", event.data.txHash);
    }

    if (type === "TRANSACTION_FAILED") {
      _warn("Transaction failed:", event.data.error);
    }

    if (type === "PLAYER_INFO") {
      _log("Player info received:", event.data.player);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  const ArcadeSDK = {

    version: "1.0.1",

    /**
     * Initialize the SDK. Must be called once when the game loads.
     *
     * @param {string|number} gameId   - Your game ID from the platform dashboard.
     * @param {object}        [options]
     * @param {boolean}       [options.debug=false] - Enable verbose console logging.
     *
     * @example
     * ArcadeSDK.init("42");
     * ArcadeSDK.init(42, { debug: true });
     */
    init: function (gameId, options) {
      _gameId = String(gameId);
      _debug  = options?.debug === true;
      _ready  = true;
      _log("SDK initialized — Game ID:", _gameId);
      _send("SDK_READY", { gameId: _gameId });
    },

    /**
     * Send a real-time score update to the platform UI.
     * Call this frequently during gameplay to keep the sidebar current.
     * Does NOT trigger a blockchain transaction.
     *
     * @param {number} score - The player's current score.
     *
     * @example
     * ArcadeSDK.updateScore(1500);
     */
    updateScore: function (score) {
      _send("SCORE_UPDATE", { score: Number(score) });
    },

    /**
     * Signal game over and submit the final score on-chain.
     * If auto-sign is enabled, this triggers a silent blockchain transaction.
     * Otherwise, the player will see a wallet approval prompt.
     *
     * @param {number} finalScore - The player's final score for this session.
     *
     * @example
     * ArcadeSDK.gameOver(9800);
     */
    gameOver: function (finalScore) {
      _log("Game over — submitting score:", finalScore);
      _send("GAME_OVER", { score: Number(finalScore) });
    },

    /**
     * Award ARCADE tokens to the player for in-game achievements.
     * Triggers a mint transaction on the Initia blockchain.
     *
     * @param {number} amount - Number of ARCADE tokens to award.
     *
     * @example
     * ArcadeSDK.earnTokens(50);
     */
    earnTokens: function (amount) {
      _send("EARN_TOKENS", { amount: Number(amount) });
      _log("Earn tokens:", amount, "ARCADE");
    },

    /**
     * Deduct ARCADE tokens from the player's wallet for an in-game purchase.
     * The platform handles the on-chain token transfer.
     *
     * @param {string} itemId - Unique identifier for the item.
     * @param {number} price  - Cost of the item in ARCADE tokens.
     *
     * @example
     * ArcadeSDK.buyItem("sword_001", 100);
     */
    buyItem: function (itemId, price) {
      _send("BUY_ITEM", { itemId: String(itemId), price: Number(price) });
      _log("Buy item:", itemId, "| Price:", price, "ARCADE");
    },

    /**
     * Unlock an on-chain achievement badge for the player.
     * Achievements are minted as NFTs and stored permanently in the player's wallet.
     *
     * @param {string} achievementId - Unique identifier for the achievement.
     *
     * @example
     * ArcadeSDK.unlockAchievement("first_kill");
     */
    unlockAchievement: function (achievementId) {
      _send("UNLOCK_ACHIEVEMENT", { achievementId: String(achievementId) });
      _log("Achievement unlocked:", achievementId);
    },

    /**
     * Record level completion on-chain and update the leaderboard.
     *
     * @param {number} level - The level number that was completed.
     * @param {number} score - Score achieved on this level.
     *
     * @example
     * ArcadeSDK.levelComplete(5, 2400);
     */
    levelComplete: function (level, score) {
      _send("LEVEL_COMPLETE", { level: Number(level), score: Number(score) });
      _log("Level complete:", level, "| Score:", score);
    },

    /**
     * Request the connected player's wallet information from the platform.
     * Returns the player's Initia address, .init username, and ARCADE balance.
     *
     * @param {function} callback - Called with a player info object.
     * @param {string}   callback.address  - Player's Initia wallet address.
     * @param {string}   callback.username - Player's .init username (or null).
     * @param {string}   callback.balance  - Player's ARCADE token balance.
     *
     * @example
     * ArcadeSDK.getPlayerInfo(function(player) {
     *   console.log(player.address);  // init1amxe...
     *   console.log(player.username); // blockraj.init
     *   console.log(player.balance);  // 1250
     * });
     */
    getPlayerInfo: function (callback) {
      if (typeof callback !== "function") {
        _warn("getPlayerInfo requires a callback function.");
        return;
      }
      _send("GET_PLAYER_INFO", {});
      const handler = function (event) {
        if (event.data?.type === "PLAYER_INFO" && event.data?._platform) {
          callback(event.data.player);
          window.removeEventListener("message", handler);
        }
      };
      window.addEventListener("message", handler);
      // Auto-cleanup after 10 seconds if no response
      setTimeout(function () {
        window.removeEventListener("message", handler);
      }, 10000);
    },

    /**
     * Check whether the SDK has been initialized.
     *
     * @returns {boolean}
     */
    isReady: function () {
      return _ready;
    },

    /**
     * Returns the current game ID.
     *
     * @returns {string|null}
     */
    getGameId: function () {
      return _gameId;
    },
  };

  // ─────────────────────────────────────────────────────────────
  // Unity C# bridge
  // Use these with Application.ExternalCall() in your C# scripts.
  //
  // Example:
  //   Application.ExternalCall("arcade_gameOver", finalScore);
  // ─────────────────────────────────────────────────────────────

  window.arcade_init = function (gameId, debug) {
    ArcadeSDK.init(gameId, { debug: debug === "true" || debug === true });
  };

  window.arcade_updateScore = function (score) {
    ArcadeSDK.updateScore(score);
  };

  window.arcade_gameOver = function (score) {
    ArcadeSDK.gameOver(score);
  };

  window.arcade_earnTokens = function (amount) {
    ArcadeSDK.earnTokens(amount);
  };

  window.arcade_buyItem = function (itemId, price) {
    ArcadeSDK.buyItem(itemId, price);
  };

  window.arcade_unlockAchievement = function (achievementId) {
    ArcadeSDK.unlockAchievement(achievementId);
  };

  window.arcade_levelComplete = function (level, score) {
    ArcadeSDK.levelComplete(level, score);
  };

  window.arcade_getPlayerInfo = function (callbackName) {
    ArcadeSDK.getPlayerInfo(function (player) {
      if (window.gameInstance) {
        window.gameInstance.SendMessage(
          "ArcadeManager",
          callbackName,
          JSON.stringify(player)
        );
      }
    });
  };

  window.arcade_isReady = function () {
    return ArcadeSDK.isReady();
  };

  // ─────────────────────────────────────────────────────────────
  // Global export
  // ─────────────────────────────────────────────────────────────
  window.ArcadeSDK = ArcadeSDK;

  console.log(
    "%c InitiaArcade SDK v1.0.1 loaded ",
    "background: #00FF88; color: #000; padding: 4px 10px; border-radius: 4px; font-weight: bold;"
  );

})();