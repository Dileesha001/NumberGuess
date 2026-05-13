// Game State
let secretNumber;
let attempts;
let isGameOver;

// Hangman State
const hangmanWords = [
  'APPLE', 'BANANA', 'ELEPHANT', 'GUITAR', 'MOUNTAIN', 
  'OCEAN', 'PLANET', 'SUMMER', 'WINTER', 'BUTTERFLY', 
  'SUNFLOWER', 'PENGUIN', 'DIAMOND', 'HOSPITAL', 'LIBRARY'
];
let currentWord = '';
let guessedLetters = new Set();
let wrongGuesses = 0;
let isHangmanGameOver = false;

// DOM Elements
const form = document.getElementById('guess-form');
const guessInput = document.getElementById('guess-input');
const submitBtn = document.getElementById('submit-btn');
const messageContainer = document.getElementById('message-container');
const attemptsCount = document.getElementById('attempts-count');
const restartBtn = document.getElementById('restart-btn');

// Hangman DOM Elements
const hangmanGameView = document.getElementById('hangman-game');
const hangmanWordDisplay = document.getElementById('hangman-word-display');
const hangmanForm = document.getElementById('hangman-form');
const hangmanInput = document.getElementById('hangman-input');
const hangmanSubmitBtn = document.getElementById('hangman-submit-btn');
const hangmanMessage = document.getElementById('hangman-message');
const hangmanWrongCount = document.getElementById('hangman-wrong-count');
const hangmanRestartBtn = document.getElementById('hangman-restart-btn');
const hangmanBackBtn = document.getElementById('hangman-back-btn');
const hangmanParts = [
  document.getElementById('hangman-head'),
  document.getElementById('hangman-body'),
  document.getElementById('hangman-arm-l'),
  document.getElementById('hangman-arm-r'),
  document.getElementById('hangman-leg-l'),
  document.getElementById('hangman-leg-r')
];

// Navigation Elements
const mainMenu = document.getElementById('main-menu');
const numberGuessGame = document.getElementById('number-guess-game');
const backBtn = document.getElementById('back-btn');
const gameCards = document.querySelectorAll('.game-card');

// Navigation Logic
function showMenu() {
  mainMenu.classList.remove('hidden');
  numberGuessGame.classList.add('hidden');
  hangmanGameView.classList.add('hidden');
}

function showGame(gameId) {
  mainMenu.classList.add('hidden');
  numberGuessGame.classList.add('hidden');
  hangmanGameView.classList.add('hidden');
  
  if (gameId === 'number-guess') {
    numberGuessGame.classList.remove('hidden');
    initGame();
  } else if (gameId === 'hangman') {
    hangmanGameView.classList.remove('hidden');
    initHangman();
  }
}

// Initialize Game
function initGame() {
  secretNumber = Math.floor(Math.random() * 100) + 1;
  attempts = 0;
  isGameOver = false;
  
  // Reset UI
  updateAttempts();
  guessInput.value = '';
  guessInput.disabled = false;
  submitBtn.disabled = false;
  submitBtn.style.opacity = '1';
  
  messageContainer.className = 'message-container hidden';
  messageContainer.innerHTML = '';
  
  restartBtn.classList.add('hidden');
  guessInput.focus();
}

// Update attempts UI
function updateAttempts() {
  attemptsCount.textContent = attempts;
}

// Show message with specific type (error, warning, success)
function showMessage(text, type) {
  messageContainer.innerHTML = text;
  messageContainer.className = `message-container show ${type}`;
  
  // Remove existing animation classes
  messageContainer.classList.remove('shake', 'pop');
  
  // Force a reflow to restart animation
  void messageContainer.offsetWidth;
  
  if (type === 'error' || type === 'warning') {
    messageContainer.classList.add('shake');
  } else if (type === 'success') {
    messageContainer.classList.add('pop');
  }
}

// Handle Guess Submission
function handleGuess(e) {
  e.preventDefault();
  
  if (isGameOver) return;
  
  const guessValue = guessInput.value.trim();
  
  if (!guessValue) {
    showMessage('Please enter a number.', 'error');
    return;
  }
  
  const guess = parseInt(guessValue, 10);
  
  if (isNaN(guess)) {
    showMessage('Invalid input! Please enter a whole number.', 'error');
    return;
  }
  
  if (guess < 1 || guess > 100) {
    showMessage('Out of bounds! Please guess a number between 1 and 100.', 'warning');
    return;
  }
  
  attempts++;
  updateAttempts();
  
  if (guess < secretNumber) {
    showMessage('Too low! Try again.', 'warning');
    guessInput.value = '';
    guessInput.focus();
  } else if (guess > secretNumber) {
    showMessage('Too high! Try again.', 'warning');
    guessInput.value = '';
    guessInput.focus();
  } else {
    // Game Won
    isGameOver = true;
    showMessage(`🎉 Congratulations!<br/>You guessed the number ${secretNumber} correctly!`, 'success');
    
    // Disable inputs
    guessInput.disabled = true;
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    
    // Show restart button
    restartBtn.classList.remove('hidden');
    restartBtn.focus();
  }
}

// --- Hangman Logic ---

function showHangmanMessage(text, type) {
  hangmanMessage.innerHTML = text;
  hangmanMessage.className = `message-container show ${type}`;
  hangmanMessage.classList.remove('shake', 'pop');
  void hangmanMessage.offsetWidth;
  if (type === 'error' || type === 'warning') {
    hangmanMessage.classList.add('shake');
  } else if (type === 'success') {
    hangmanMessage.classList.add('pop');
  }
}

function initHangman() {
  currentWord = hangmanWords[Math.floor(Math.random() * hangmanWords.length)];
  guessedLetters.clear();
  wrongGuesses = 0;
  isHangmanGameOver = false;

  hangmanWrongCount.textContent = wrongGuesses;
  hangmanInput.value = '';
  hangmanInput.disabled = false;
  hangmanSubmitBtn.disabled = false;
  hangmanSubmitBtn.style.opacity = '1';
  hangmanMessage.className = 'message-container hidden';
  hangmanMessage.innerHTML = '';
  hangmanRestartBtn.classList.add('hidden');

  hangmanParts.forEach(part => {
    part.classList.remove('show-part');
    part.classList.add('hide-part');
  });

  renderHangmanWord();
  hangmanInput.focus();
}

function renderHangmanWord() {
  hangmanWordDisplay.innerHTML = '';
  for (let i = 0; i < currentWord.length; i++) {
    const letter = currentWord[i];
    const box = document.createElement('div');
    box.className = 'letter-box';
    if (guessedLetters.has(letter)) {
      box.textContent = letter;
    }
    hangmanWordDisplay.appendChild(box);
  }
}

function handleHangmanGuess(e) {
  e.preventDefault();
  if (isHangmanGameOver) return;

  const guess = hangmanInput.value.toUpperCase().trim();
  hangmanInput.value = '';
  hangmanInput.focus();

  if (!guess || guess.length !== 1 || !/[A-Z]/.test(guess)) {
    showHangmanMessage('Please enter a valid letter.', 'error');
    return;
  }

  if (guessedLetters.has(guess)) {
    showHangmanMessage('You already guessed that letter.', 'warning');
    return;
  }

  guessedLetters.add(guess);

  if (currentWord.includes(guess)) {
    renderHangmanWord();
    
    // Check win condition
    const isWin = currentWord.split('').every(l => guessedLetters.has(l));
    if (isWin) {
      isHangmanGameOver = true;
      showHangmanMessage('🎉 You won! You guessed the word!', 'success');
      hangmanInput.disabled = true;
      hangmanSubmitBtn.disabled = true;
      hangmanSubmitBtn.style.opacity = '0.5';
      hangmanRestartBtn.classList.remove('hidden');
      hangmanRestartBtn.focus();
    } else {
      showHangmanMessage('Good guess!', 'success');
    }
  } else {
    wrongGuesses++;
    hangmanWrongCount.textContent = wrongGuesses;
    hangmanParts[wrongGuesses - 1].classList.remove('hide-part');
    hangmanParts[wrongGuesses - 1].classList.add('show-part');

    if (wrongGuesses >= 6) {
      isHangmanGameOver = true;
      hangmanWordDisplay.innerHTML = '';
      for (let i = 0; i < currentWord.length; i++) {
        const box = document.createElement('div');
        box.className = 'letter-box';
        box.textContent = currentWord[i];
        if (!guessedLetters.has(currentWord[i])) {
          box.style.color = 'var(--error-color)';
        }
        hangmanWordDisplay.appendChild(box);
      }
      showHangmanMessage(`Game Over! The word was ${currentWord}.`, 'error');
      hangmanInput.disabled = true;
      hangmanSubmitBtn.disabled = true;
      hangmanSubmitBtn.style.opacity = '0.5';
      hangmanRestartBtn.classList.remove('hidden');
      hangmanRestartBtn.focus();
    } else {
      showHangmanMessage('Incorrect guess!', 'warning');
    }
  }
}

// Event Listeners
form.addEventListener('submit', handleGuess);
restartBtn.addEventListener('click', initGame);
backBtn.addEventListener('click', showMenu);

hangmanForm.addEventListener('submit', handleHangmanGuess);
hangmanRestartBtn.addEventListener('click', initHangman);
hangmanBackBtn.addEventListener('click', showMenu);

gameCards.forEach(card => {
  card.addEventListener('click', () => {
    const gameId = card.getAttribute('data-game');
    if (gameId) {
      showGame(gameId);
    }
  });
});

// Start the game for the first time
initGame();
