# DPR Mini Games

This repository contains **DPR Mini Games**, a premium collection of interactive games. The project features two different implementation types: lightweight Python command-line (CLI) games and a modern, standalone desktop application built with Electron, Vite, and Web Audio API.

---

## Included Games & Modes

### 1. Number Guessing Game
* **CLI Version (`NumberGuess.py`)**:
  * Selectable difficulty levels:
    * **Easy**: Guess between 1 and 50 (10 attempts).
    * **Medium**: Guess between 1 and 100 (8 attempts).
    * **Hard**: Guess between 1 and 200 (6 attempts).
  * Smart input bounds validation (warns if your guess is outside the current possible range).
  * Duplicate guess prevention (doesn't waste attempts on repeated numbers).
  * Local high scores tracking saved in `number_guess_scores.json`.
* **GUI Desktop Version**:
  * **Classic Mode**: Standard guess feedback (too high / too low) without time limits.
  * **Time Attack Mode**: A fast-paced race against the clock! You have **30 seconds** to guess the number, featuring a live countdown progress bar.
  * Interactive range tracker that visually shrinks as you narrow down the correct number.
  * Guess history chips showing previous attempts and whether they were high or low.

### 2. Hangman (GUI Version Only)
* Interactive word-guessing game featuring dynamic vector SVG graphics.
* Word category selection with 6 different categories: **All, Animals, Nature, Space, Birds, Fruits**.
* An on-screen virtual keyboard for quick input.
* **Get Hint** system to assist you with tricky words.
* Career statistics tracking (Wins/Losses) persisted locally.

### 3. Mini Cricket
* **CLI Version (`cricket_logic.py`)**:
  * Play as the batsman in a 2-over (12 balls) innings against top bowlers (e.g., Jasprit Bumrah, Mitchell Starc, Nathan Lyon, Rashid Khan, Pat Cummins).
  * Bowlers deliver at realistic speeds (fast bowlers up to 148 km/h, spinners around 90 km/h).
  * Choose your shot strategy for each ball:
    * **Defensive Block**: Safe, low runs, only a 2% chance of getting out.
    * **Ground Drive**: Balanced, moderate runs, 8% chance of getting out.
    * **Lofted Swing**: High risk, big boundaries (4s & 6s), 25% chance of getting out.
  * High scores tracked dynamically and saved in `cricket_scores.json`.
* **GUI Desktop Version**:
  * **Quick Match (2 Overs)** or **Test Cricket (10 Wickets)** modes.
  * Custom team selection for both Batting and Opponent Bowling teams (**India (IND)**, **Australia (AUS)**, **England (ENG)**, **Sri Lanka (SL)**, **New Zealand (NZ)**, **South Africa (SA)**, and **West Indies (WI)**), complete with country flags.
  * Top-down vector graphics SVG stadium featuring concentric stands, advert boards, rough pitches, and floodlights.
  * Fully FSM-driven 11-member fielding AI where fielders react dynamically, chase the ball, and run to back up if the ball is nearby.
  * Real-time keyboard-driven controls: **Enter** to bowl/start, **5** key to bat, **W** to run manually, and **S** to turn back/stop running.
  * Over-by-over transition changing ends (automatically reverses bowling direction and bat/crease locations every 6 balls).
  * Real-time run/wicket tracking, run-out simulations, and bowler economy rate tracking.
  * **Dynamic Milestone Celebrations**: TV-style broadcast golden celebration banners and commentary logs for **Fifty (50)**, **Hundred (100)**, or **50/100 partnerships**.
  * **Tabbed Post-Match Scorecard**: Shows scrollable panels for Batting Innings (players status: Out, Not Out, Did Not Bat) and Bowling Performance (Overs, Runs, Wickets, Econ).

---

## Implementations

### 1. Python Command-Line Games
Lightweight, text-based games written in Python. They run directly in the terminal, utilize emoji indicators, and feature persistent score logging.

### 2. Electron/Vite Desktop Application
A premium, standalone desktop application built using HTML, CSS, JavaScript, Vite, and Electron. It features:
* **Custom Borderless Header**: Integrated window controls (Minimize, Maximize, Close buttons).
* **Intro Splash Screen**: Smooth CSS loading progress bar indicator (0% to 100%).
* **Synthesized Audio Engine**: Real-time sound synthesis using the **Web Audio API** for background music, bowling/batting sounds, crowd ambiance, and click indicators.
* **Persistent Career Stats**: Statistics for all games are saved to browser local storage.
* **Premium Glassmorphism Styling**: Sleek, glowing UI layouts with tailormade color schemes, responsive structures, and smooth micro-animations.

---

## Getting Started

### Prerequisites

- **For CLI Version:** [Python 3.x](https://www.python.org/downloads/) installed.
- **For GUI Version:** [Node.js](https://nodejs.org/) (version 18+ recommended) installed.

### Running the Python CLI Games

1. Open a terminal/command prompt at the root directory of the project.
2. Run either of the games:
   * **Number Guessing**:
     ```bash
     python NumberGuess.py
     ```
   * **Mini Cricket**:
     ```bash
     python cricket_logic.py
     ```

### Running the Desktop Application

1. Open your terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the node packages and dev dependencies:
   ```bash
   npm install
   ```
3. Run the application in developer mode (this starts the Vite server and launches the Electron frame):
   ```bash
   npm run dev
   ```
4. To package/build the desktop application for Windows, run:
   ```bash
   npm run build
   ```
   *The built standalone installer/binary will be generated inside the `frontend/dist-electron-build` folder.*

---

## Tech Stack

* **CLI Games**: Python 3 (modules: `random`, `json`, `sys`, `os`, `argparse`, `base64`)
* **Desktop Application**:
  * **Framework**: Electron (v41+), Vite (v6+)
  * **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Flexbox/Grid, Animations), ES6+ JavaScript
  * **Audio Synthesis**: Web Audio API (real-time generated retro-synth tracks & sound effects)
  * **Graphics**: Dynamic Inline SVG Elements (Stadium, Players, Pitch, Hangman Drawing)
  * **Persistence**: Browser LocalStorage API

---

## License

This project is open-source and available for educational or personal use.
