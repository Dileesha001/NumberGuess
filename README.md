# DPR Mini Games

This repository contains **DPR Mini Games**, a collection of interactive games. The project features two different implementations: a lightweight Python command-line game and a modern, standalone desktop application built with Electron.

## Included Games

1. **Number Guessing Game**: A classic game where the objective is to guess a randomly selected number between 1 and 100 within the fewest attempts possible. Available in both CLI and GUI versions.
2. **Hangman**: A word-guessing game where you try to guess the hidden word by suggesting letters before you run out of attempts and the hangman figure is complete. Available in the GUI version.
3. **Mini Cricket**: A real-time, timing-based cricket simulation featuring fielders driven by a Finite State Machine (FSM), vector physics, and keyboard controls. Available in the GUI version.

## Implementations

### 1. Python Command-Line Game
A lightweight, text-based version of the Number Guessing Game written in Python. It runs directly in the terminal and provides feedback on whether your guesses are too high or too low.

### 2. Electron/Vite Desktop Application
A standalone desktop application featuring a main menu and multiple games (Number Guessing and Hangman). Built using HTML, CSS, JavaScript, Vite, and Electron, it features a visual interface, animations, dynamic SVG drawings, and an engaging user experience.

---

## Getting Started

### Prerequisites

- **For the Python Version:** [Python 3.x](https://www.python.org/downloads/) installed on your machine.
- **For the GUI Version:** [Node.js](https://nodejs.org/) (which includes npm) installed on your machine.

### Running the Python Game (Number Guessing Only)

1. Open your terminal or command prompt.
2. Navigate to the root directory of the project.
3. Run the following command:
   ```bash
   python NumberGuess.py
   ```

### Running the GUI Application (All Games)

1. Open your terminal or command prompt.
2. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
3. Install the required dependencies:
   ```bash
   npm install
   ```
4. Start the application in development mode:
   ```bash
   npm run dev
   ```
5. To build the production desktop application for Windows, run:
   ```bash
   npm run build
   ```
   *The built application will be output into the `frontend/dist-electron-build` directory.*

## Features

- **Multi-game platform** with a central menu to select games.
- **Number Guessing Game**:
  - Dynamic feedback (too high/too low).
  - Input validation and attempt counter.
- **Hangman Game**:
  - Random word selection from a predefined list.
  - Interactive UI with letter placeholders.
  - Dynamic SVG drawing for the hangman figure based on wrong guesses.
  - Win/Loss tracking and messages.
- **Mini Cricket & Cricket Test**:
  - Top-down vector graphics SVG stadium with concentric spectator stands, advert boards, rough pitches, and corner floodlights.
  - Fully FSM-driven 11-member fielding AI where **all fielders react dynamically** and run to back up if the ball comes near them (within 120px).
  - Keyboard-driven controls: **Enter** to bowl/start, **5** key to bat, **W** to run manually, and **S** to turn back.
  - Over-by-over transition changing ends (reverses bowling direction and bat/crease locations every 6 balls).
  - Real-time run/wicket tracking, cumulative bowler spell tracking, and run-out simulation.
  - **Bowler Economy Rate (Econ)** tracked dynamically in the HUD and scorecards.
  - **Dynamic Milestone Celebrations**: Golden TV-broadcast celebration banner flashes and custom golden commentary logs are created when a batsman scores a **Fifty (50)** or **Hundred (100)**, or when a **50/100 Partnership** is built.
  - **Tabbed Post-Match Scorecard**: Shows separate scrollable panels for Batting Innings (listing all 11 players in order with Out, Not Out, and Did Not Bat statuses) and Bowling Performance (Overs, Runs, Wickets, and Econ).
- **Modern UI**: Smooth glassmorphism styles, harmonic color palettes, micro-animations, and interactive elements across all games.

## Tech Stack

- **CLI Game**: Python
- **GUI Application**: HTML5, Vanilla CSS, JavaScript (ES6+), Vite, Electron

## License

This project is open-source and available for educational or personal use.
