# Number Guessing Game

This repository contains two different versions of a classic **Number Guessing Game**, where the objective is to guess a randomly selected number between 1 and 100 within the fewest attempts possible.

## Implementations

### 1. Python Command-Line Game
A lightweight, text-based version of the game written in Python. It runs directly in the terminal and provides feedback on whether your guesses are too high or too low.

### 2. Electron/Vite Desktop Application
A standalone desktop application with a rich, modern Graphical User Interface (GUI). Built using HTML, CSS, JavaScript, Vite, and Electron, it features a visual interface, animations, and an engaging user experience.

---

## Getting Started

### Prerequisites

- **For the Python Version:** [Python 3.x](https://www.python.org/downloads/) installed on your machine.
- **For the GUI Version:** [Node.js](https://nodejs.org/) (which includes npm) installed on your machine.

### Running the Python Game

1. Open your terminal or command prompt.
2. Navigate to the root directory of the project.
3. Run the following command:
   ```bash
   python NumberGuess.py
   ```

### Running the GUI Application

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

- Dynamic feedback indicating whether the guess is too high or too low.
- Input validation to ensure guesses are within the 1-100 range.
- A counter keeping track of the number of attempts made.
- Modern interface with animations in the GUI version.

## License

This project is open-source and available for educational or personal use.
