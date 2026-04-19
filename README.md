# 🎮 InitiaArcade — Web3 Gaming Platform

> **INITIATE Season 1 Hackathon Submission** | Track: Gaming | VM: Move

## Initia Hackathon Submission

- **Project Name**: InitiaArcade

### Project Overview

InitiaArcade is a Web3 gaming platform built on Initia blockchain that enables players to earn on-chain ARCADE tokens while playing games, with zero wallet popups thanks to Ghost Wallet auto-signing. Game creators can publish their Unity WebGL games, earn 20% revenue from every play session, and track earnings on their creator dashboard — all powered by Move smart contracts on the Initia appchain `initia-arcade-1`.

### Implementation Detail

- **The Custom Implementation**: Built 3 Move smart contracts from scratch — `platform.move` (game registry with creator revenue distribution), `leaderboard.move` (tamper-proof on-chain scores), and `arcade_token.move` (ARCADE token with automatic reward minting). Implemented a complete token economy where players earn 80% and creators earn 20% of rewards per play session. Built a full creator onboarding flow with blockchain-verified identity and time-based approval system.

- **The Native Feature**: Used **Auto-signing** via InterwovenKit's Ghost Wallet. When a player enables auto-sign once, all subsequent game transactions (score submission, token minting, play recording) happen silently in the background — zero wallet popups during gameplay. This transforms Web3 gaming UX from friction-heavy to completely seamless, matching the feel of Web2 games while maintaining full on-chain verifiability.

### How to Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/initia-arcade.git
cd initia-arcade

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

# 4. Open in browser
# http://localhost:5173
```

> **Note**: The app connects to Initia testnet (initiation-2). Connect your Initia wallet to play. The local rollup (initia-arcade-1) runs locally — see rollup setup below.

---

## 🏗️ Architecture
┌─────────────────────────────────────────────────────┐
│                   InitiaArcade                       │
│                                                      │
│  React Frontend (Vite)                               │
│  ├── InterwovenKit (Wallet + Auto-sign)              │
│  ├── Firebase Firestore (Game metadata + Scores)     │
│  └── Initia REST/RPC (On-chain data)                 │
│                                                      │
│  Smart Contracts (Move VM)                           │
│  ├── platform.move   — Game registry + Revenue       │
│  ├── leaderboard.move — Scores + Player stats        │
│  └── arcade_token.move — ARCADE token economy        │
│                                                      │
│  Appchain: initia-arcade-1                           │
│  L1: initiation-2 (Initia testnet)                   │
└─────────────────────────────────────────────────────┘

---

## ✨ Features

### 🎮 For Players
- **Zero Popup Gaming** — Enable auto-sign once, play forever without interruptions
- **Earn On-Chain** — Every game session mints real ARCADE tokens to your wallet
- **Global Leaderboard** — Tamper-proof scores verified on Initia blockchain
- **Game Library** — Browse and play approved games from creators worldwide

### 👾 For Game Creators
- **Publish Games** — Submit Unity WebGL games with a simple 3-step form
- **Earn Revenue** — 20% of all ARCADE tokens earned by players go to the creator
- **Creator Dashboard** — Track plays, earnings, and manage your games
- **SDK Integration** — 3-line Unity integration with `arcade-sdk.js`

### 🔐 Platform
- **On-Chain Scores** — All scores stored on Initia blockchain, impossible to fake
- **Admin Panel** — Review and approve/reject game submissions
- **Token Economy** — ARCADE tokens with automatic distribution (80% player, 20% creator)
- **Creator Authentication** — .init username required, blockchain-verified identity

---

## 🪙 Token Economy
Per Play Session (rewardRate = 50 ARCADE):
Player   → 40 ARCADE (80%)  ← auto_mint_reward()
Creator  → 10 ARCADE (20%)  ← mint_to(creator)
Total minted = 50 ARCADE per play

---

## 📦 Smart Contracts

| Contract | Address | Network |
|----------|---------|---------|
| platform.move | `0xd1aa08d2de31ca1af55682f4185547f92332bee` | initiation-2 |
| leaderboard.move | `0xd1aa08d2de31ca1af55682f4185547f92332bee` | initiation-2 |
| arcade_token.move | `0xd1aa08d2de31ca1af55682f4185547f92332bee` | initiation-2 |

### Key Functions

```move
// Platform
platform::register_game(creator, admin, name, url, reward_rate)
platform::approve_game(admin, game_id)
platform::record_play_and_earn(player, admin, game_id, reward_rate)

// Leaderboard  
leaderboard::submit_score(player, admin, game_id, score)
leaderboard::get_player_stats(player_addr) → (total, games, best)

// ARCADE Token
arcade_token::auto_mint_reward(player, admin, score, reward_rate)
arcade_token::mint_to(caller, recipient, amount, admin)
arcade_token::get_balance(player_addr) → u64
```

---

## 🕹️ Unity SDK Integration

```csharp
// ArcadeManager.cs — Add to any GameObject

void Start() {
    // Initialize with your Game ID from Creator Dashboard
    Application.ExternalCall("arcade_init", "YOUR_GAME_ID");
}

void OnGameOver(int finalScore) {
    // Submit score on-chain + earn tokens automatically
    Application.ExternalCall("arcade_gameOver", finalScore);
}

void OnScoreChanged(int score) {
    // Real-time score update in platform UI
    Application.ExternalCall("arcade_updateScore", score);
}
```

---

## 🔗 Appchain Details
Chain ID:     initia-arcade-1
VM:           Move
L1:           initiation-2 (Initia testnet)
DA Layer:     Initia L1
Gas Denom:    umin
RPC:          http://localhost:26657 (local)
REST:         http://localhost:1317 (local)

> The appchain runs locally for development. For production deployment, a VPS with public endpoints would be required.

---

## 🗂️ Project Structure
initia-arcade/
├── src/
│   ├── pages/
│   │   ├── Home.jsx          # Landing page
│   │   ├── GameLibrary.jsx   # Game browser
│   │   ├── GamePlay.jsx      # Game + score submission
│   │   ├── Leaderboard.jsx   # Global + per-game scores
│   │   ├── Creator.jsx       # Creator dashboard
│   │   ├── Admin.jsx         # Admin panel
│   │   └── SDK.jsx           # SDK documentation
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── GameCard.jsx
│   │   └── EnableAutoSign.jsx
│   ├── hooks/
│   │   ├── useGames.js       # Firebase games
│   │   └── useArcadeBalance.js # On-chain balance
│   └── lib/
│       ├── firebase.js       # Firebase config
│       └── gameService.js    # Firestore operations
├── public/
│   ├── arcade-sdk.js         # Unity WebGL SDK v1.0.1
│   └── webgl-template.html   # Branded loading screen
├── contracts/
│   ├── platform.move
│   ├── leaderboard.move
│   └── arcade_token.move
└── .initia/
└── submission.json

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite |
| Wallet | InterwovenKit (@initia/interwovenkit-react) |
| Blockchain | Initia Move VM |
| Database | Firebase Firestore |
| Game SDK | Custom JS (arcade-sdk.js) |
| Game Engine | Unity WebGL |
| Appchain | Weave CLI (initia-arcade-1) |

---

## 🎯 Native Feature: Auto-Signing

InitiaArcade uses **Auto-signing** as its core Initia-native feature:
Without Auto-sign:              With Auto-sign:
────────────────────            ────────────────────
Game Over                       Game Over
↓                               ↓
Wallet popup appears            Score submitted silently ✅
↓                           Tokens minted silently ✅
User clicks approve             Creator paid silently ✅
↓                           All in < 3 seconds ✅
Score submitted
(ruins the gaming experience)

Implementation via `submitTxBlock()` from InterwovenKit — no popup, no friction.

---

## 🚀 Live Demo

- **Platform**: [initia-arcade.vercel.app](https://initia-arcade.vercel.app)
- **Demo Video**: [YouTube Link]
- **Explorer**: [scan.testnet.initia.xyz](https://scan.testnet.initia.xyz/initiation-2/accounts/0xd1aa08d2de31ca1af55682f4185547f92332bee)

---

## 👥 Team

Built with ❤️ for INITIATE Season 1 Hackathon

---

*InitiaArcade — Where blockchain meets gaming, silently.*
