// Node.js imports for Electron
let execFile;
let pathModule;
let fsModule;
let processModule;
try {
  const req = typeof window !== 'undefined' && window.require ? window.require : require;
  execFile = req('child_process').execFile;
  pathModule = req('path');
  fsModule = req('fs');
  processModule = req('process');
} catch (e) {
  console.warn("Node integration not available", e);
}

// Game State
let secretNumber;
let attempts;
let isGameOver;

// Hangman State
const hangmanWords = [
  'APPLE', 'BANANA', 'ELEPHANT', 'GUITAR', 'MOUNTAIN', 'OCEAN', 'PLANET', 'SUMMER', 'WINTER', 'BUTTERFLY', 
  'SUNFLOWER', 'PENGUIN', 'DIAMOND', 'HOSPITAL', 'LIBRARY', 'ANIMAL', 'GIRAFFE', 'KANGAROO', 'OSTRICH', 
  'PANTHER', 'CHEETAH', 'LEOPARD', 'TIGER', 'LION', 'MONKEY', 'GORILLA', 'CHIMPANZEE', 'ALLIGATOR', 
  'CROCODILE', 'IGUANA', 'SNAKE', 'TURTLE', 'DOLPHIN', 'WHALE', 'SHARK', 'OCTOPUS', 'SQUID', 'LOBSTER', 
  'CRAB', 'SEAGULL', 'PELICAN', 'EAGLE', 'HAWK', 'FALCON', 'OWL', 'WOODPECKER', 'PARROT', 'PIGEON', 
  'SPARROW', 'SWALLOW', 'ROBIN', 'BLUEJAY', 'CARDINAL', 'HUMMINGBIRD', 'WOODS', 'FOREST', 'JUNGLE', 
  'DESERT', 'TUNDRA', 'SAVANNA', 'VALLEY', 'CANYON', 'RIVER', 'STREAM', 'CREEK', 'LAKE', 'POND', 
  'SEA', 'GULF', 'BAY', 'STRAIT', 'ISLAND', 'PENINSULA', 'CONTINENT', 'STAR', 'GALAXY', 'UNIVERSE', 
  'ASTERIOD', 'COMET', 'METEOR', 'SATELLITE', 'ROCKET', 'SPACESHIP', 'ASTRONAUT', 'TELESCOPE', 
  'OBSERVATORY', 'MICROSCOPE', 'LABORATORY', 'EXPERIMENT', 'CHEMISTRY', 'PHYSICS', 'BIOLOGY', 
  'ASTRONOMY', 'GEOLOGY', 'METEOROLOGY', 'ECOLOGY', 'BOTANY', 'ZOOLOGY', 'ANATOMY', 'PHYSIOLOGY', 
  'MEDICINE', 'SURGERY', 'DOCTOR', 'NURSE', 'CLINIC', 'PHARMACY', 'PRESCRIPTION', 'MEDICATION', 
  'VACCINE', 'ANTIBIOTIC', 'VITAMIN', 'MINERAL', 'PROTEIN', 'CARBOHYDRATE', 'FAT', 'CALORIE', 
  'NUTRITION', 'DIET', 'EXERCISE', 'WORKOUT', 'GYM', 'FITNESS', 'MUSCLE', 'BONE', 'JOINT', 'BLOOD', 
  'HEART', 'LUNG', 'BRAIN', 'STOMACH', 'LIVER', 'KIDNEY', 'SKIN', 'HAIR', 'NAIL', 'TOOTH', 'DENTIST', 
  'BRUSH', 'FLOSS', 'PASTE', 'MOUTH', 'TONGUE', 'THROAT', 'NOSE', 'EYE', 'EAR', 'HEAD', 'NECK', 
  'SHOULDER', 'ARM', 'ELBOW', 'WRIST', 'HAND', 'FINGER', 'THUMB', 'CHEST', 'BACK', 'WAIST', 'HIP', 
  'LEG', 'KNEE', 'ANKLE', 'FOOT', 'TOE', 'SHOE', 'SOCK', 'BOOT', 'SANDAL', 'SLIPPER', 'COAT', 
  'JACKET', 'SWEATER', 'SHIRT', 'TSHIRT', 'BLOUSE', 'DRESS', 'SKIRT', 'PANTS', 'JEANS', 'SHORTS', 
  'BELT', 'TIE', 'SCARF', 'GLOVE', 'HAT', 'CAP', 'HELMET', 'GLASSES', 'SUNGLASSES', 'WATCH', 
  'CLOCK', 'TIMER', 'CALENDAR', 'DAY', 'WEEK', 'MONTH', 'YEAR', 'DECADE', 'CENTURY', 'MILLENNIUM', 
  'SPRING', 'AUTUMN', 'SEASON', 'WEATHER', 'CLIMATE', 'TEMPERATURE', 'THERMOMETER', 'BAROMETER', 
  'RAIN', 'SNOW', 'SLEET', 'HAIL', 'WIND', 'BREEZE', 'GALE', 'STORM', 'HURRICANE', 'TORNADO', 
  'CYCLONE', 'TYPHOON', 'BLIZZARD', 'AVALANCHE', 'EARTHQUAKE', 'VOLCANO', 'TSUNAMI', 'FLOOD', 
  'DROUGHT', 'WILDFIRE', 'FIRE', 'FLAME', 'SMOKE', 'ASH', 'COAL', 'WOOD', 'PAPER', 'CARDBOARD', 
  'PLASTIC', 'GLASS', 'METAL', 'IRON', 'STEEL', 'COPPER', 'GOLD', 'SILVER', 'BRONZE', 'BRASS', 
  'ALUMINUM', 'LEAD', 'ZINC', 'TIN', 'PLATINUM', 'RUBY', 'SAPPHIRE', 'EMERALD', 'PEARL', 'OPAL', 
  'AMETHYST', 'TOPAZ', 'QUARTZ', 'GRANITE', 'MARBLE', 'LIMESTONE', 'SANDSTONE', 'CLAY', 'DIRT', 
  'SOIL', 'SAND', 'DUST', 'MUD', 'ROCK', 'STONE', 'PEBBLE', 'BOULDER', 'GRAVEL', 'ASPHALT', 
  'CONCRETE', 'CEMENT', 'BRICK', 'BLOCK', 'TILE', 'SHINGLE', 'ROOF', 'WALL', 'FLOOR', 'CEILING', 
  'DOOR', 'WINDOW', 'ROOM', 'HOUSE', 'BUILDING', 'SKYSCRAPER', 'OFFICE', 'STORE', 'SHOP', 
  'MARKET', 'SUPERMARKET', 'MALL', 'RESTAURANT', 'CAFE', 'BAKERY', 'BUTCHER', 'GROCERY', 
  'BANK', 'POST', 'SCHOOL', 'COLLEGE', 'UNIVERSITY', 'MUSEUM', 'THEATER', 'CINEMA', 'STADIUM', 
  'ARENA', 'PARK', 'GARDEN', 'ZOO', 'AQUARIUM'
];

let recentHangmanWords = [];
try {
  const stored = localStorage.getItem('hangmanRecentWords');
  if (stored) {
    recentHangmanWords = JSON.parse(stored);
  }
} catch (e) {
  console.error('Error reading from localStorage', e);
}

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

// --- Mini Cricket State & DOM ---
let cricketState = { runs: 0, wickets: 0, balls_faced: 0, max_balls: 12, game_over: false };
const cricketGameView = document.getElementById('cricket-game');
const cricketRuns = document.getElementById('cricket-runs');
const cricketWickets = document.getElementById('cricket-wickets');
const cricketBalls = document.getElementById('cricket-balls');
const cricketMessage = document.getElementById('cricket-message');
const cricketHitBtn = document.getElementById('cricket-hit-btn');
const cricketRestartBtn = document.getElementById('cricket-restart-btn');
const cricketBackBtn = document.getElementById('cricket-back-btn');

function showCricketMessage(text, type) {
  cricketMessage.innerHTML = text;
  cricketMessage.className = `message-container show ${type}`;
  cricketMessage.classList.remove('shake', 'pop');
  void cricketMessage.offsetWidth;
  if (type === 'error' || type === 'warning') {
    cricketMessage.classList.add('shake');
  } else if (type === 'success') {
    cricketMessage.classList.add('pop');
  }
}

function initCricket() {
  cricketState = { runs: 0, wickets: 0, balls_faced: 0, max_balls: 12, game_over: false };
  updateCricketUI();
  cricketHitBtn.disabled = false;
  cricketHitBtn.style.opacity = '1';
  cricketMessage.className = 'message-container hidden';
  cricketMessage.innerHTML = '';
  cricketRestartBtn.classList.add('hidden');
}

function updateCricketUI() {
  cricketRuns.textContent = cricketState.runs;
  cricketWickets.textContent = cricketState.wickets;
  cricketBalls.textContent = cricketState.balls_faced;
}

function handleCricketHit() {
  if (cricketState.game_over) return;
  if (!execFile) { showCricketMessage('Error: Node integration missing', 'error'); return; }
  cricketHitBtn.disabled = true;
  cricketHitBtn.style.opacity = '0.7';
  let scriptPath = '../cricket_logic.py';
  if (pathModule && fsModule && processModule) {
     const resourcesPath = processModule.resourcesPath || processModule.cwd();
     const pathsToTry = [
       pathModule.join(resourcesPath, 'cricket_logic.py'),
       pathModule.join(processModule.cwd(), 'cricket_logic.py'),
       pathModule.join(processModule.cwd(), '../cricket_logic.py')
     ];
     
     for (const p of pathsToTry) {
       if (fsModule.existsSync(p)) {
         scriptPath = p;
         break;
       }
     }
  }

  // Graphics Animation START
  const ball = document.getElementById('cricket-ball');
  const bat = document.getElementById('cricket-bat');
  const bowlerArm = document.getElementById('bowler-arm');
  const wickets = document.getElementById('wickets');
  
  if (ball && bat && bowlerArm) {
    ball.style.transition = 'none';
    ball.style.opacity = '1';
    ball.setAttribute('cx', '60');
    ball.setAttribute('cy', '65');
    bat.style.transform = 'rotate(0deg)';
    bowlerArm.style.transform = 'rotate(-45deg)';
    if (wickets) {
      wickets.style.transition = 'none';
      wickets.style.transform = 'rotate(0deg)';
      wickets.style.transformOrigin = '315px 100px';
    }
    
    // Bowl the ball
    setTimeout(() => { bowlerArm.style.transform = 'rotate(45deg)'; }, 50);
    setTimeout(() => {
      ball.style.transition = 'all 0.3s linear';
      ball.setAttribute('cx', '315');
      ball.setAttribute('cy', '85');
    }, 100);
  }
  
  const stateStr = JSON.stringify(cricketState);
  
  // Use 'py' as default on Windows, fallback to 'python'
  execFile('py', [scriptPath, '--action', 'hit', '--state', stateStr], (error, stdout) => {
    setTimeout(() => {
      cricketHitBtn.disabled = false;
      cricketHitBtn.style.opacity = '1';
      if (error) { 
         // Fallback to 'python' if 'py' is not found
         execFile('python', [scriptPath, '--action', 'hit', '--state', stateStr], (err2, out2) => {
            if (err2) {
               console.error(err2); showCricketMessage('Error executing logic. Python is not installed!', 'error'); return;
            }
            processResponse(out2);
         });
         return; 
      }
      processResponse(stdout);
    }, 400); // Wait for bowl animation
  });

  function processResponse(stdout) {
    try {
      const res = JSON.parse(stdout.trim());
      if (res.error) { showCricketMessage(res.error, 'error'); return; }
      cricketState = res.state;
      updateCricketUI();
      
      const isOut = res.message.includes('OUT') || res.message.includes('ALL OUT');
      const isSix = res.message.includes('SIX');
      const isFour = res.message.includes('FOUR');
      const type = isOut ? 'error' : (isSix || isFour) ? 'success' : 'warning';
      
      // Animate Outcome
      if (ball && bat) {
        bat.style.transform = 'rotate(-60deg)';
        setTimeout(() => {
           if (isOut) {
             if (wickets) {
               wickets.style.transition = 'transform 0.3s ease';
               wickets.style.transform = 'rotate(45deg)';
             }
             ball.style.opacity = '0';
           } else if (res.message.includes('Dot ball')) {
             ball.style.opacity = '0';
           } else {
             ball.style.transition = 'all 0.4s ease-out';
             ball.setAttribute('cx', isSix ? '10' : '100');
             ball.setAttribute('cy', isSix ? '-20' : '10');
             setTimeout(() => { ball.style.opacity = '0'; }, 400);
           }
        }, 100);
      }
      
      showCricketMessage(res.message, type);
      if (cricketState.game_over) {
        cricketHitBtn.disabled = true;
        cricketHitBtn.style.opacity = '0.5';
        cricketRestartBtn.classList.remove('hidden');
        cricketRestartBtn.focus();
      }
    } catch (e) {
      console.error(e, stdout);
      showCricketMessage('Invalid response from logic.', 'error');
    }
  }
}


// Navigation Logic
function showMenu() {
  mainMenu.classList.remove('hidden');
  numberGuessGame.classList.add('hidden');
  hangmanGameView.classList.add('hidden');
  if (cricketGameView) cricketGameView.classList.add('hidden');
}

function showGame(gameId) {
  mainMenu.classList.add('hidden');
  numberGuessGame.classList.add('hidden');
  hangmanGameView.classList.add('hidden');
  if (cricketGameView) cricketGameView.classList.add('hidden');
  
  if (gameId === 'number-guess') {
    numberGuessGame.classList.remove('hidden');
    initGame();
  } else if (gameId === 'hangman') {
    hangmanGameView.classList.remove('hidden');
    initHangman();
  } else if (gameId === 'mini-cricket') {
    cricketGameView.classList.remove('hidden');
    initCricket();
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
  let availableWords = hangmanWords.filter(word => !recentHangmanWords.includes(word));
  if (availableWords.length === 0) {
    availableWords = hangmanWords;
    recentHangmanWords = [];
  }
  
  currentWord = availableWords[Math.floor(Math.random() * availableWords.length)];
  
  recentHangmanWords.push(currentWord);
  if (recentHangmanWords.length > 100) {
    recentHangmanWords.shift();
  }
  
  try {
    localStorage.setItem('hangmanRecentWords', JSON.stringify(recentHangmanWords));
  } catch (e) {
    console.error('Error writing to localStorage', e);
  }

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

if (cricketHitBtn) cricketHitBtn.addEventListener('click', handleCricketHit);
if (cricketRestartBtn) cricketRestartBtn.addEventListener('click', initCricket);
if (cricketBackBtn) cricketBackBtn.addEventListener('click', showMenu);

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
