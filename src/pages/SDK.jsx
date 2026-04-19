import { useState } from "react";
import { Link } from "react-router-dom";

export default function SDK() {
  const [activeTab, setActiveTab] = useState("quickstart");
  const [copied, setCopied] = useState("");

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const tabs = [
    { id: "quickstart", label: "Quick Start" },
    { id: "unity", label: "Unity Setup" },
    { id: "events", label: "API Reference" },
    { id: "examples", label: "Examples" },
  ];

  const CodeBlock = ({ code, id, language = "csharp" }) => (
    <div style={{ position: "relative" }}>
      <div style={{ background: "#0a0a0a", borderRadius: 8, padding: 20, border: "0.5px solid #1a1a1a", overflowX: "auto" }}>
        <pre style={{ color: "#e0e0e0", fontSize: 12, lineHeight: 1.8, margin: 0, fontFamily: "monospace" }}>
          {code}
        </pre>
      </div>
      <button
        onClick={() => copy(code, id)}
        style={{
          position: "absolute", top: 12, right: 12,
          padding: "4px 10px", background: copied === id ? "#0d1f12" : "#1a1a1a",
          border: `0.5px solid ${copied === id ? "#1a3a1a" : "#2a2a2a"}`,
          borderRadius: 6, color: copied === id ? "#00FF88" : "#555",
          fontSize: 11, cursor: "pointer",
        }}>
        {copied === id ? "Copied!" : "Copy"}
      </button>
    </div>
  );

  return (
    <div style={{ padding: "52px" }}>

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "5px 12px", border: "0.5px solid #252525",
          borderRadius: 20, fontSize: 11, color: "#555",
          marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          Developer Documentation
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 500, letterSpacing: "-1.5px", marginBottom: 12 }}>
          InitiaArcade <span style={{ color: "#00FF88" }}>SDK</span>
        </h1>
        <p style={{ color: "#555", fontSize: 15, maxWidth: 600, lineHeight: 1.7, marginBottom: 28 }}>
          Integrate your Unity WebGL game with InitiaArcade in minutes.
          Submit on-chain scores, reward players with ARCADE tokens, and
          connect to the Initia blockchain — all with a single JavaScript file.
        </p>

        {/* Download Banner */}
        <div style={{
          background: "#0d1f12", border: "0.5px solid #1a3a1a",
          borderRadius: 12, padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          maxWidth: 700,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#00FF88" }}>arcade-sdk.js</span>
              <span style={{ background: "#1a3a1a", color: "#00FF88", padding: "2px 8px", borderRadius: 4, fontSize: 10 }}>v1.0.0</span>
            </div>
            <div style={{ fontSize: 12, color: "#444" }}>
              Single JS file · No dependencies · Unity WebGL compatible
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/arcade-sdk.js" download="arcade-sdk.js"
              style={{ padding: "10px 20px", background: "#00FF88", borderRadius: 8, color: "#0C0C0C", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
              Download SDK
            </a>
            <a href="/arcade-sdk.js" target="_blank" rel="noreferrer"
              style={{ padding: "10px 20px", background: "transparent", border: "0.5px solid #1a3a1a", borderRadius: 8, color: "#00FF88", fontSize: 13, textDecoration: "none" }}>
              View Source
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 36, borderBottom: "0.5px solid #1e1e1e" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "12px 24px", background: "transparent", border: "none",
            borderBottom: activeTab === t.id ? "2px solid #00FF88" : "2px solid transparent",
            color: activeTab === t.id ? "#fff" : "#555",
            fontSize: 13, cursor: "pointer", transition: "all 0.2s",
            marginBottom: "-0.5px",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Quick Start */}
      {activeTab === "quickstart" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

          {/* Steps */}
          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Get started in 3 steps</h2>
            <p style={{ fontSize: 13, color: "#444", marginBottom: 24 }}>
              From zero to a fully integrated blockchain game in under 10 minutes.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {[
                {
                  n: "01",
                  title: "Build for WebGL",
                  desc: "Export your Unity game as a WebGL build and deploy it to GitHub Pages or Netlify for free.",
                  tag: "Unity → File → Build Settings → WebGL",
                },
                {
                  n: "02",
                  title: "Integrate the SDK",
                  desc: "Place arcade-sdk.js in Assets/Plugins/WebGL/ and add 3 lines of C# to your game manager.",
                  tag: "Assets/Plugins/WebGL/arcade-sdk.js",
                },
                {
                  n: "03",
                  title: "Publish your game",
                  desc: "Submit your game URL on the platform. After admin review, your game goes live and starts earning.",
                  tag: "initia-arcade.vercel.app/publish",
                },
              ].map(s => (
                <div key={s.n} style={{ padding: 24, background: "#0a0a0a", borderRadius: 10, border: "0.5px solid #1a1a1a" }}>
                  <div style={{ fontSize: 36, fontWeight: 500, color: "#1e1e1e", letterSpacing: "-1px", marginBottom: 12 }}>{s.n}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "#555", lineHeight: 1.7, marginBottom: 12 }}>{s.desc}</div>
                  <div style={{ fontSize: 10, color: "#444", fontFamily: "monospace", background: "#111", padding: "4px 8px", borderRadius: 4 }}>{s.tag}</div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>How it works</h2>
            <p style={{ fontSize: 13, color: "#444", marginBottom: 20, lineHeight: 1.7 }}>
              The SDK bridges your Unity game and the Initia blockchain via the browser's
              <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "#888", margin: "0 4px" }}>postMessage</code>
              API. No wallet integration required inside Unity — the platform handles everything.
            </p>
            <div style={{ background: "#0a0a0a", borderRadius: 8, padding: 24, border: "0.5px solid #1a1a1a" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { label: "Unity Game (iframe)", color: "#7B2FFF", desc: "Calls ArcadeSDK.gameOver(score)" },
                  { label: "postMessage API", color: "#444", desc: "Browser native event bridge", arrow: true },
                  { label: "React Platform", color: "#4499ff", desc: "Receives event, triggers transaction" },
                  { label: "InterwovenKit", color: "#444", desc: "Signs transaction via Ghost Wallet (auto-sign)", arrow: true },
                  { label: "Initia Blockchain", color: "#00FF88", desc: "Score saved + ARCADE tokens minted on-chain ✅" },
                ].map((item, i) => (
                  <div key={i}>
                    {item.arrow && (
                      <div style={{ fontSize: 18, color: "#333", padding: "4px 0 4px 20px" }}>↓</div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#111", borderRadius: 8, border: "0.5px solid #1a1a1a", marginBottom: item.arrow ? 0 : 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: item.color === "#444" ? "#555" : "#fff" }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{item.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Minimal Example */}
          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Minimal integration</h2>
            <p style={{ fontSize: 13, color: "#444", marginBottom: 20 }}>
              This is the minimum required to submit scores to the blockchain.
            </p>
            <CodeBlock id="minimal" code={`using UnityEngine;

public class GameManager : MonoBehaviour
{
    private int score = 0;

    void Start()
    {
        // Initialize SDK with your Game ID from the platform
        Application.ExternalCall("arcade_init", "YOUR_GAME_ID");
    }

    void OnGameOver()
    {
        // Submit final score on-chain
        Application.ExternalCall("arcade_gameOver", score);
    }
}`} />
          </div>
        </div>
      )}

      {/* Unity Setup */}
      {activeTab === "unity" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Step 1 — Configure WebGL Build Settings</h2>
            <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7, marginBottom: 20 }}>
              Open <strong style={{ color: "#fff", fontWeight: 500 }}>File → Build Settings</strong>, select <strong style={{ color: "#fff", fontWeight: 500 }}>WebGL</strong>, and click <strong style={{ color: "#fff", fontWeight: 500 }}>Switch Platform</strong>. Then open <strong style={{ color: "#fff", fontWeight: 500 }}>Player Settings</strong> and apply the following configuration:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Resolution and Presentation", "Enable Resizable Window"],
                ["Publishing Settings → Compression Format", "Set to Disabled"],
                ["Publishing Settings → Allow downloads over HTTP", "Set to Always allowed"],
                ["Other Settings → Color Space", "Linear (recommended)"],
              ].map(([setting, value]) => (
                <div key={setting} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#0a0a0a", borderRadius: 8, border: "0.5px solid #1a1a1a" }}>
                  <span style={{ fontSize: 12, color: "#555", fontFamily: "monospace" }}>{setting}</span>
                  <span style={{ fontSize: 12, color: "#00FF88" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Step 2 — Install the SDK</h2>
            <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7, marginBottom: 20 }}>
              Download <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "#888" }}>arcade-sdk.js</code> and place it in the following directory within your Unity project. Create the folder if it does not exist.
            </p>
            <CodeBlock id="sdkpath" code={`YourUnityProject/
└── Assets/
    └── Plugins/
        └── WebGL/
            └── arcade-sdk.js    ← Place the file here`} />
            <div style={{ marginTop: 12, padding: 14, background: "#0d1020", border: "0.5px solid #1a2540", borderRadius: 8, fontSize: 12, color: "#4499ff" }}>
              Unity automatically includes all files in <code style={{ background: "#1a1a1a", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>Assets/Plugins/WebGL/</code> in the final WebGL build. No additional configuration is needed.
            </div>
          </div>

          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Step 3 — Create your C# integration script</h2>
            <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7, marginBottom: 20 }}>
              Create a new C# script in your project and use <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "#888" }}>Application.ExternalCall()</code> to communicate with the SDK.
            </p>
            <CodeBlock id="csharp" code={`using UnityEngine;

public class ArcadeManager : MonoBehaviour
{
    [Header("InitiaArcade Configuration")]
    public string gameId = "YOUR_GAME_ID"; // Get this from the platform

    private int currentScore = 0;

    void Start()
    {
        // Initialize SDK — call this once on game start
        Application.ExternalCall("arcade_init", gameId);
    }

    // Call this whenever the player's score changes
    public void SetScore(int score)
    {
        currentScore = score;
        Application.ExternalCall("arcade_updateScore", currentScore);
    }

    // Call this when the game ends
    public void OnGameOver()
    {
        Application.ExternalCall("arcade_gameOver", currentScore);
    }

    // Award tokens for in-game achievements
    public void AwardTokens(int amount)
    {
        Application.ExternalCall("arcade_earnTokens", amount);
    }

    // Process an in-game shop purchase
    public void PurchaseItem(string itemId, int price)
    {
        Application.ExternalCall("arcade_buyItem", itemId, price);
    }

    // Unlock an achievement badge (minted as NFT)
    public void UnlockAchievement(string achievementId)
    {
        Application.ExternalCall("arcade_unlockAchievement", achievementId);
    }
}`} />
          </div>

          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Step 4 — Deploy to GitHub Pages</h2>
            <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7, marginBottom: 20 }}>
              After building, deploy your WebGL output to a publicly accessible URL. GitHub Pages is free and recommended.
            </p>
            <CodeBlock id="deploy" code={`# 1. Create a new public repository on github.com

# 2. Push your WebGL build output folder
git init
git add .
git commit -m "Initial WebGL build"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main

# 3. Enable GitHub Pages
#    Repository → Settings → Pages
#    Source: Deploy from a branch → main → / (root)

# 4. Your game will be live at:
#    https://USERNAME.github.io/REPO/

# 5. Submit this URL on the platform to publish your game`} />
          </div>
        </div>
      )}

      {/* API Reference */}
      {activeTab === "events" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>API Reference</h2>
            <p style={{ fontSize: 13, color: "#444", marginBottom: 28, lineHeight: 1.7 }}>
              All SDK methods can be called from C# using <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "#888" }}>Application.ExternalCall()</code> or directly from JavaScript using <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "#888" }}>window.ArcadeSDK</code>.
            </p>

            {[
              {
                method: "arcade_init",
                signature: "arcade_init(gameId: string)",
                desc: "Initializes the SDK and registers the game session with the platform. Must be called once before any other SDK method.",
                params: [["gameId", "string", "Your unique game ID obtained from the platform dashboard"]],
                color: "#00FF88",
              },
              {
                method: "arcade_updateScore",
                signature: "arcade_updateScore(score: number)",
                desc: "Sends a real-time score update to the platform UI. Call this frequently during gameplay to keep the sidebar display current. Does not trigger a blockchain transaction.",
                params: [["score", "number", "The player's current score"]],
                color: "#4499ff",
              },
              {
                method: "arcade_gameOver",
                signature: "arcade_gameOver(finalScore: number)",
                desc: "Signals the end of a game session and submits the final score on-chain. If auto-sign is enabled, this triggers an automatic blockchain transaction with no user interaction required.",
                params: [["finalScore", "number", "The player's final score for the session"]],
                color: "#7B2FFF",
              },
              {
                method: "arcade_earnTokens",
                signature: "arcade_earnTokens(amount: number)",
                desc: "Awards ARCADE tokens to the player for in-game actions such as collecting items, completing objectives, or reaching milestones.",
                params: [["amount", "number", "Number of ARCADE tokens to award"]],
                color: "#FFB800",
              },
              {
                method: "arcade_buyItem",
                signature: "arcade_buyItem(itemId: string, price: number)",
                desc: "Deducts ARCADE tokens from the player's wallet and registers the item purchase on-chain. Use this for in-game shops.",
                params: [
                  ["itemId", "string", "Unique identifier for the item being purchased"],
                  ["price", "number", "Cost of the item in ARCADE tokens"],
                ],
                color: "#ff4444",
              },
              {
                method: "arcade_unlockAchievement",
                signature: "arcade_unlockAchievement(achievementId: string)",
                desc: "Unlocks an achievement for the player. Achievements are minted as NFT badges and stored permanently in the player's Initia wallet.",
                params: [["achievementId", "string", "Unique identifier for the achievement (e.g. 'first_kill', 'level_10')"]],
                color: "#ff8800",
              },
              {
                method: "arcade_levelComplete",
                signature: "arcade_levelComplete(level: number, score: number)",
                desc: "Notifies the platform that the player has completed a level. Used for multi-level games to track per-level performance.",
                params: [
                  ["level", "number", "The level number that was completed"],
                  ["score", "number", "Score achieved on this level"],
                ],
                color: "#00ccff",
              },
            ].map(api => (
              <div key={api.method} style={{ marginBottom: 20, padding: 24, background: "#0a0a0a", borderRadius: 10, border: "0.5px solid #1a1a1a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <code style={{ background: api.color + "18", color: api.color, padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
                    {api.signature}
                  </code>
                </div>
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 16 }}>{api.desc}</p>
                <div style={{ fontSize: 11, color: "#333", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Parameters</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {api.params.map(([name, type, pdesc]) => (
                    <div key={name} style={{ display: "flex", gap: 12, padding: "8px 12px", background: "#111", borderRadius: 6, alignItems: "flex-start" }}>
                      <code style={{ color: api.color, fontSize: 11, minWidth: 120, flexShrink: 0 }}>{name}</code>
                      <code style={{ color: "#555", fontSize: 11, minWidth: 60, flexShrink: 0 }}>{type}</code>
                      <span style={{ fontSize: 11, color: "#444", lineHeight: 1.6 }}>{pdesc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Examples */}
      {activeTab === "examples" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Endless Runner</h2>
            <p style={{ fontSize: 13, color: "#444", marginBottom: 20, lineHeight: 1.7 }}>
              A complete integration for an endless runner game with real-time score tracking, coin collection rewards, and game over submission.
            </p>
            <CodeBlock id="runner" code={`using UnityEngine;

public class RunnerGame : MonoBehaviour
{
    private int score = 0;
    private bool isGameOver = false;

    void Start()
    {
        Application.ExternalCall("arcade_init", "YOUR_GAME_ID");
    }

    void Update()
    {
        if (isGameOver) return;

        score += Mathf.RoundToInt(Time.deltaTime * 10);

        // Update the platform UI every 50 points
        if (score % 50 == 0)
        {
            Application.ExternalCall("arcade_updateScore", score);
        }
    }

    public void OnCoinCollected()
    {
        Application.ExternalCall("arcade_earnTokens", 10);
    }

    public void OnObstacleHit()
    {
        isGameOver = true;

        // Submit final score to the blockchain
        Application.ExternalCall("arcade_gameOver", score);
    }
}`} />
          </div>

          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Tower Defense</h2>
            <p style={{ fontSize: 13, color: "#444", marginBottom: 20, lineHeight: 1.7 }}>
              Integration for a wave-based tower defense game with per-wave score updates and level completion tracking.
            </p>
            <CodeBlock id="tower" code={`using UnityEngine;

public class TowerDefenseManager : MonoBehaviour
{
    private int score = 0;
    private int currentWave = 0;

    void Start()
    {
        Application.ExternalCall("arcade_init", "YOUR_GAME_ID");
    }

    public void OnEnemyKilled(int reward)
    {
        score += reward;
        Application.ExternalCall("arcade_updateScore", score);
    }

    public void OnWaveComplete(int waveNumber)
    {
        currentWave = waveNumber;

        // Record level completion on-chain
        Application.ExternalCall("arcade_levelComplete", waveNumber, score);

        // Award bonus tokens for completing a wave
        int bonus = waveNumber * 25;
        Application.ExternalCall("arcade_earnTokens", bonus);
    }

    public void OnBaseDestroyed()
    {
        Application.ExternalCall("arcade_gameOver", score);
    }
}`} />
          </div>

          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>In-Game Shop</h2>
            <p style={{ fontSize: 13, color: "#444", marginBottom: 20, lineHeight: 1.7 }}>
              A complete shop implementation using ARCADE tokens for purchases.
            </p>
            <CodeBlock id="shop" code={`using UnityEngine;

[System.Serializable]
public class ShopItem
{
    public string id;
    public string displayName;
    public int price;
}

public class GameShop : MonoBehaviour
{
    public ShopItem[] items = new ShopItem[]
    {
        new ShopItem { id = "sword_001",    displayName = "Iron Sword",     price = 100 },
        new ShopItem { id = "shield_001",   displayName = "Wooden Shield",  price = 150 },
        new ShopItem { id = "potion_001",   displayName = "Health Potion",  price = 50  },
        new ShopItem { id = "speed_boost",  displayName = "Speed Boost",    price = 75  },
    };

    public void PurchaseItem(int itemIndex)
    {
        if (itemIndex < 0 || itemIndex >= items.Length) return;

        ShopItem item = items[itemIndex];

        // Deduct tokens and register purchase on-chain
        Application.ExternalCall("arcade_buyItem", item.id, item.price);

        Debug.Log($"Purchased {item.displayName} for {item.price} ARCADE");
    }
}`} />
          </div>

          {/* CTA */}
          <div style={{ background: "#0d1f12", border: "0.5px solid #1a3a1a", borderRadius: 12, padding: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#00FF88", marginBottom: 6 }}>Ready to publish?</div>
              <div style={{ fontSize: 13, color: "#444" }}>Submit your game URL and start earning ARCADE tokens from every play.</div>
            </div>
            <Link to="/publish"
              style={{ padding: "12px 28px", background: "#00FF88", borderRadius: 10, color: "#0C0C0C", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
              Publish Your Game →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}