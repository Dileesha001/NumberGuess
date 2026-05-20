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

// // --- Mini Cricket State & DOM ---
let cricketState = { runs: 0, wickets: 0, balls_faced: 0, max_balls: 12, game_over: false };
const cricketGameView = document.getElementById('cricket-game');
const cricketRuns = document.getElementById('cricket-runs');
const cricketWickets = document.getElementById('cricket-wickets');
const cricketBalls = document.getElementById('cricket-balls');
const cricketMessage = document.getElementById('cricket-message');
const cricketHitBtn = document.getElementById('cricket-hit-btn');
const cricketRestartBtn = document.getElementById('cricket-restart-btn');
const cricketBackBtn = document.getElementById('cricket-back-btn');
const cricketHowToPlayModal = document.getElementById('cricket-how-to-play-modal');
const cricketCloseHelpBtn = document.getElementById('cricket-close-help-btn');

let bowlingDirection = 1; // 1 = top-to-bottom, -1 = bottom-to-top
let isAutoBowlingTimeout = null;

// Wickets position
const STUMPS_STRIKER = { x: 225, y: 315 };
const STUMPS_NON_STRIKER = { x: 225, y: 135 };

class Fielder {
  constructor(id, name, x, y, speed) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.speed = speed;
    this.state = 'IDLE'; // IDLE, CHASING, THROWING
    this.has_ball = false;
  }

  update(ballX, ballY) {
    if (this.state === 'CHASING') {
      let dx = ballX - this.x;
      let dy = ballY - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 4) {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
      } else {
        this.x = ballX;
        this.y = ballY;
      }
    }
  }

  reset() {
    this.x = this.homeX;
    this.y = this.homeY;
    this.state = 'IDLE';
    this.has_ball = false;
  }
}

const fieldersData = [
  { id: 'keeper', name: 'Keeper', x: 225, y: 335, speed: 3.8 },
  { id: 'point', name: 'Point', x: 90, y: 260, speed: 3.2 },
  { id: 'cover', name: 'Cover', x: 120, y: 180, speed: 3.4 },
  { id: 'mid_off', name: 'Mid-off', x: 175, y: 160, speed: 3.0 },
  { id: 'mid_on', name: 'Mid-on', x: 275, y: 160, speed: 3.0 },
  { id: 'mid_wicket', name: 'Mid-wicket', x: 330, y: 260, speed: 3.2 },
  { id: 'fine_leg', name: 'Fine Leg', x: 320, y: 350, speed: 3.5 }
];

let fielders = [];
let ball = { x: 225, y: 115, vx: 0, vy: 0, speed: 0, state: 'IDLE', loft: false, loftProgress: 0, loftDuration: 0, maxLoftHeight: 0 };
let batsmen = {
  batsman1Y: 305,
  batsman2Y: 145,
  target1Y: 305,
  target2Y: 145,
  completedRuns: 0,
  targetRuns: 0,
  isRunning: false,
  speed: 2.2
};

let activeFielder = null;
let gameLoopActive = false;
let gameLoopId = null;
let currentShotOutcome = null;
let hitTimingZoneMin = 280;
let hitTimingZoneMax = 330;
let gameState = 'IDLE'; // IDLE, BOWLING, PLAYING, DEAD

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
  bowlingDirection = 1;
  if (isAutoBowlingTimeout) {
    clearTimeout(isAutoBowlingTimeout);
    isAutoBowlingTimeout = null;
  }
  resetPlayState();
  updateCricketUI();
  
  cricketHitBtn.disabled = false;
  cricketHitBtn.style.opacity = '1';
  cricketHitBtn.textContent = 'BOWL ⚾';
  
  cricketMessage.className = 'message-container hidden';
  cricketMessage.innerHTML = '';
  cricketRestartBtn.classList.add('hidden');
  
  if (cricketHowToPlayModal) {
    cricketHowToPlayModal.classList.remove('hidden');
  }
}

function resetPlayState() {
  gameState = 'IDLE';
  bowlingDirection = (Math.floor(cricketState.balls_faced / 6) % 2 === 0) ? 1 : -1;
  
  fielders = fieldersData.map(d => new Fielder(d.id, d.name, d.x, d.y, d.speed));
  
  const initialBallY = (bowlingDirection === 1) ? 115 : 335;
  ball = { x: 225, y: initialBallY, vx: 0, vy: 0, speed: 0, state: 'IDLE', loft: false, loftProgress: 0, loftDuration: 0, maxLoftHeight: 0 };
  
  const b1Y = (bowlingDirection === 1) ? 305 : 145;
  const b2Y = (bowlingDirection === 1) ? 145 : 305;
  batsmen = {
    batsman1Y: b1Y,
    batsman2Y: b2Y,
    target1Y: b1Y,
    target2Y: b2Y,
    completedRuns: 0,
    targetRuns: 0,
    isRunning: false,
    speed: 2.2
  };
  
  activeFielder = null;
  currentShotOutcome = null;
  
  const batEl = document.getElementById('cricket-bat');
  if (batEl) {
    batEl.style.transform = 'rotate(0deg)';
  }
  
  updateSVGDOM();
  drawFielders();
}

function updateCricketUI() {
  cricketRuns.textContent = cricketState.runs;
  cricketWickets.textContent = cricketState.wickets;
  cricketBalls.textContent = cricketState.balls_faced;
}

function updateSVGDOM() {
  const ballEl = document.getElementById('cricket-ball');
  const strikerEl = document.getElementById('cricket-striker');
  const nonStrikerEl = document.getElementById('cricket-nonstriker');
  const bowlerEl = document.getElementById('cricket-bowler');
  const batEl = document.getElementById('cricket-bat');
  
  if (ballEl) {
    ballEl.setAttribute('cx', ball.x);
    ballEl.setAttribute('cy', ball.y);
    let radius = 5;
    if (ball.loft) {
      let h = Math.sin(ball.loftProgress * Math.PI) * ball.maxLoftHeight;
      radius = 5 + h * 0.15;
    }
    ballEl.setAttribute('r', radius);
    ballEl.style.opacity = (ball.state === 'IDLE') ? '0' : '1';
  }
  
  if (strikerEl) {
    strikerEl.setAttribute('cy', batsmen.batsman1Y);
  }
  if (nonStrikerEl) {
    nonStrikerEl.setAttribute('cy', batsmen.batsman2Y);
  }
  if (bowlerEl) {
    bowlerEl.setAttribute('cy', (bowlingDirection === 1) ? 115 : 335);
  }
  
  if (batEl) {
    batEl.setAttribute('x1', 225);
    batEl.setAttribute('y1', batsmen.batsman1Y);
    if (batsmen.isRunning) {
      batEl.setAttribute('x2', 225);
      batEl.setAttribute('y2', batsmen.batsman1Y);
    } else {
      let batOffset = (bowlingDirection === 1) ? -13 : 13;
      batEl.setAttribute('x2', 238);
      batEl.setAttribute('y2', batsmen.batsman1Y + batOffset);
    }
    batEl.style.transformOrigin = `225px ${batsmen.batsman1Y}px`;
  }
}

function drawFielders() {
  const group = document.getElementById('cricket-fielders-group');
  if (!group) return;
  group.innerHTML = '';
  fielders.forEach(f => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', f.x);
    circle.setAttribute('cy', f.y);
    circle.setAttribute('r', f.state === 'CHASING' ? '7' : '5.5');
    
    let fill = '#f59e0b';
    if (f.state === 'CHASING') fill = '#eab308';
    else if (f.state === 'THROWING') fill = '#3b82f6';
    
    circle.setAttribute('fill', fill);
    circle.setAttribute('stroke', '#ffffff');
    circle.setAttribute('stroke-width', '1.5');
    group.appendChild(circle);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', f.x);
    text.setAttribute('y', f.y - 9);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-size', '8px');
    text.setAttribute('font-family', 'sans-serif');
    text.setAttribute('font-weight', '600');
    
    let label = f.name;
    if (f.state === 'CHASING') label += ' 🏃';
    if (f.state === 'THROWING') label += ' 🎯';
    text.textContent = label;
    group.appendChild(text);
  });
}

function bowlBall() {
  if (cricketState.game_over) return;
  
  if (isAutoBowlingTimeout) {
    clearTimeout(isAutoBowlingTimeout);
    isAutoBowlingTimeout = null;
  }
  
  resetPlayState();
  
  gameState = 'BOWLING';
  ball.state = 'BOWLED';
  ball.x = 225;
  ball.y = (bowlingDirection === 1) ? 115 : 335;
  
  cricketHitBtn.textContent = 'HIT 🏏';
  cricketHitBtn.disabled = false;
  cricketHitBtn.style.opacity = '1';
  cricketMessage.className = 'message-container hidden';
  
  gameLoopActive = true;
  gameLoopId = requestAnimationFrame(gameLoop);
}

function runLocalSimulationFallback() {
  console.warn("Python execution failed or not available. Falling back to local JS simulation.");
  const fakeOutcomes = [0, 1, 2, 4, 6, 'W'];
  const fakeWeights = [20, 30, 20, 10, 10, 10];
  const idx = rollWeighted(fakeWeights);
  const resVal = fakeOutcomes[idx];
  let fakeMsg = "";
  let nextState = {...cricketState};
  nextState.balls_faced++;
  if (resVal === 'W') {
    nextState.wickets++;
    fakeMsg = "OUT! What a catch!";
  } else {
    nextState.runs += resVal;
    fakeMsg = resVal === 0 ? "Dot ball." : resVal === 4 ? "FOUR!" : resVal === 6 ? "SIX!" : `You ran ${resVal}.`;
  }
  setTimeout(() => {
    processHitResponse({ state: nextState, message: fakeMsg });
  }, 200);
}

function attemptHit() {
  if (gameState !== 'BOWLING') return;

  const minZone = (bowlingDirection === 1) ? 280 : 120;
  const maxZone = (bowlingDirection === 1) ? 330 : 170;

  if (ball.y >= minZone && ball.y <= maxZone) {
    gameState = 'PLAYING';
    cricketHitBtn.disabled = true;
    cricketHitBtn.style.opacity = '0.5';
    cricketHitBtn.textContent = 'IN PLAY';
    
    gameLoopActive = false;
    showCricketMessage("Timing: PERFECT! 💥", 'success');
    
    const batEl = document.getElementById('cricket-bat');
    if (batEl) {
      batEl.style.transform = 'rotate(-75deg)';
    }

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
    
    const stateStr = JSON.stringify(cricketState);
    if (!execFile) {
      runLocalSimulationFallback();
      return;
    }
    
    const base64State = typeof btoa === 'function' ? btoa(stateStr) : Buffer.from(stateStr).toString('base64');
    execFile('py', [scriptPath, '--action', 'hit', '--state', base64State], (error, stdout) => {
      if (error) {
        execFile('python', [scriptPath, '--action', 'hit', '--state', base64State], (err2, out2) => {
          if (err2) {
             console.error("Failed to run python or py launcher:", err2);
             runLocalSimulationFallback();
             return;
          }
          try {
            processHitResponse(JSON.parse(out2.trim()));
          } catch(e) {
            console.error("Failed to parse python response:", e);
            runLocalSimulationFallback();
          }
        });
        return;
      }
      try {
        processHitResponse(JSON.parse(stdout.trim()));
      } catch(e) {
        console.error("Failed to parse py response:", e);
        runLocalSimulationFallback();
      }
    });
  } else {
    gameState = 'PLAYING';
    cricketHitBtn.disabled = true;
    cricketHitBtn.style.opacity = '0.5';
    cricketHitBtn.textContent = 'IN PLAY';
    
    let diff = (bowlingDirection === 1) ? (ball.y - 305) : (145 - ball.y);
    let timingMsg = diff < 0 ? "Timing: TOO EARLY! ❌" : "Timing: TOO LATE! ❌";
    showCricketMessage(timingMsg, 'error');
    
    const batEl = document.getElementById('cricket-bat');
    if (batEl) {
      batEl.style.transform = 'rotate(-45deg)';
    }
  }
}

function rollWeighted(weights) {
  let sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function processHitResponse(res) {
  gameLoopActive = true;
  gameLoopId = requestAnimationFrame(gameLoop);
  
  currentShotOutcome = res;
  const msg = res.message;
  
  ball.state = 'HIT';
  
  let angleDeg = (Math.random() - 0.5) * 130;
  let angleRad = (angleDeg * Math.PI) / 180;
  
  if (msg.includes('SIX')) {
    let speed = 6.8 + Math.random() * 1.2;
    ball.vx = Math.sin(angleRad) * speed;
    ball.vy = -bowlingDirection * Math.cos(angleRad) * speed;
    ball.loft = true;
    ball.loftDuration = 55;
    ball.loftProgress = 0;
    ball.maxLoftHeight = 35;
  } 
  else if (msg.includes('FOUR')) {
    let speed = 5.2 + Math.random() * 0.8;
    ball.vx = Math.sin(angleRad) * speed;
    ball.vy = -bowlingDirection * Math.cos(angleRad) * speed;
    ball.loft = false;
  }
  else if (msg.includes('Dot ball')) {
    let targetFielder = fielders[1 + Math.floor(Math.random() * (fielders.length - 1))];
    let dx = targetFielder.x - ball.x;
    let dy = targetFielder.y - ball.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    
    let speed = 2.8;
    ball.vx = (dx / dist) * speed;
    ball.vy = (dy / dist) * speed;
    ball.loft = false;
    
    selectActiveFielder();
  }
  else if (msg.includes('OUT')) {
    let isCaught = Math.random() < 0.65;
    if (isCaught) {
      let targetFielder = fielders[1 + Math.floor(Math.random() * (fielders.length - 1))];
      let dx = targetFielder.x - ball.x;
      let dy = targetFielder.y - ball.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      
      let flightFrames = 50;
      ball.vx = dx / flightFrames;
      ball.vy = dy / flightFrames;
      ball.loft = true;
      ball.loftDuration = flightFrames;
      ball.loftProgress = 0;
      ball.maxLoftHeight = 25;
      
      selectActiveFielder();
    } else {
      let speed = 3.2;
      ball.vx = Math.sin(angleRad) * speed;
      ball.vy = -bowlingDirection * Math.cos(angleRad) * speed;
      ball.loft = false;
      
      selectActiveFielder();
      
      batsmen.isRunning = true;
      batsmen.speed = 1.25;
      batsmen.completedRuns = 0;
      batsmen.targetRuns = 1;
      batsmen.target1Y = (batsmen.batsman1Y === 305) ? 145 : 305;
      batsmen.target2Y = (batsmen.batsman2Y === 305) ? 145 : 305;
    }
  }
  else if (msg.includes('You ran')) {
    let runMatch = msg.match(/\d+/);
    let targetRuns = runMatch ? parseInt(runMatch[0], 10) : 1;
    
    let speed = 3.5;
    ball.vx = Math.sin(angleRad) * speed;
    ball.vy = -bowlingDirection * Math.cos(angleRad) * speed;
    ball.loft = false;
    
    selectActiveFielder();
    
    batsmen.isRunning = true;
    batsmen.speed = 2.45;
    batsmen.completedRuns = 0;
    batsmen.targetRuns = targetRuns;
    batsmen.target1Y = (batsmen.batsman1Y === 305) ? 145 : 305;
    batsmen.target2Y = (batsmen.batsman2Y === 305) ? 145 : 305;
  }
}

function selectActiveFielder() {
  let minD = Infinity;
  let closest = null;
  fielders.forEach(f => {
    f.state = 'IDLE';
    let dx = ball.x - f.x;
    let dy = ball.y - f.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d < minD) {
      minD = d;
      closest = f;
    }
  });
  activeFielder = closest;
  if (activeFielder) {
    activeFielder.state = 'CHASING';
  }
}

function gameLoop() {
  if (!gameLoopActive) return;

  if (ball.state === 'BOWLED') {
    if (bowlingDirection === 1) {
      ball.y += 4.5;
      if (ball.y >= 315) {
        ball.y = 315;
        ball.state = 'DEAD';
        handleMissOutcome();
      }
    } else {
      ball.y -= 4.5;
      if (ball.y <= 135) {
        ball.y = 135;
        ball.state = 'DEAD';
        handleMissOutcome();
      }
    }
  } else if (ball.state === 'HIT') {
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (!ball.loft) {
      ball.vx *= 0.985;
      ball.vy *= 0.985;
    } else {
      ball.loftProgress += 1 / ball.loftDuration;
      if (ball.loftProgress >= 1) {
        ball.loft = false;
        ball.loftProgress = 0;
      }
    }

    let distFromCenter = Math.sqrt((ball.x - 225) * (ball.x - 225) + (ball.y - 225) * (ball.y - 225));
    if (distFromCenter >= 210) {
      ball.state = 'DEAD';
      if (currentShotOutcome) {
        if (currentShotOutcome.message.includes('SIX')) {
          handleBoundary(6);
        } else {
          handleBoundary(4);
        }
      } else {
        handleBoundary(4);
      }
    }
  } else if (ball.state === 'THROWN') {
    let dx = ball.targetX - ball.x;
    let dy = ball.targetY - ball.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let throwSpeed = 7.5;
    if (distance > throwSpeed) {
      ball.x += (dx / distance) * throwSpeed;
      ball.y += (dy / distance) * throwSpeed;
    } else {
      ball.x = ball.targetX;
      ball.y = ball.targetY;
      ball.state = 'DEAD';
      checkRunOut();
    }
  }

  if (activeFielder) {
    activeFielder.update(ball.x, ball.y);
    
    let dx = ball.x - activeFielder.x;
    let dy = ball.y - activeFielder.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 5 && ball.state === 'HIT') {
      ball.vx = 0;
      ball.vy = 0;
      ball.x = activeFielder.x;
      ball.y = activeFielder.y;
      
      if (ball.loft) {
        ball.state = 'DEAD';
        handleCaughtOut();
      } else {
        activeFielder.state = 'THROWING';
        ball.state = 'DEAD';
        
        setTimeout(() => {
          if (activeFielder && ball.state === 'DEAD') {
            let targetStumps = STUMPS_STRIKER;
            let b1Dist = Math.abs(batsmen.batsman1Y - batsmen.target1Y);
            let b2Dist = Math.abs(batsmen.batsman2Y - batsmen.target2Y);
            if (batsmen.target1Y === 145) {
              targetStumps = b1Dist > b2Dist ? STUMPS_NON_STRIKER : STUMPS_STRIKER;
            } else {
              targetStumps = b2Dist > b1Dist ? STUMPS_NON_STRIKER : STUMPS_STRIKER;
            }

            ball.targetX = targetStumps.x;
            ball.targetY = targetStumps.y;
            ball.state = 'THROWN';
            
            activeFielder.state = 'IDLE';
          }
        }, 300);
      }
    }
  }

  if (batsmen.isRunning) {
    let dir1 = Math.sign(batsmen.target1Y - batsmen.batsman1Y);
    batsmen.batsman1Y += dir1 * batsmen.speed;
    if (dir1 > 0 && batsmen.batsman1Y >= batsmen.target1Y) batsmen.batsman1Y = batsmen.target1Y;
    if (dir1 < 0 && batsmen.batsman1Y <= batsmen.target1Y) batsmen.batsman1Y = batsmen.target1Y;

    let dir2 = Math.sign(batsmen.target2Y - batsmen.batsman2Y);
    batsmen.batsman2Y += dir2 * batsmen.speed;
    if (dir2 > 0 && batsmen.batsman2Y >= batsmen.target2Y) batsmen.batsman2Y = batsmen.target2Y;
    if (dir2 < 0 && batsmen.batsman2Y <= batsmen.target2Y) batsmen.batsman2Y = batsmen.target2Y;

    if (batsmen.batsman1Y === batsmen.target1Y && batsmen.batsman2Y === batsmen.target2Y) {
      batsmen.completedRuns++;
      
      let temp = batsmen.target1Y;
      batsmen.target1Y = batsmen.target2Y;
      batsmen.target2Y = temp;
      
      if (batsmen.completedRuns >= batsmen.targetRuns) {
        batsmen.isRunning = false;
        handleSafeRuns();
      }
    }
  }

  updateSVGDOM();
  drawFielders();

  if (gameLoopActive) {
    gameLoopId = requestAnimationFrame(gameLoop);
  }
}

function handleBoundary(runs) {
  if (currentShotOutcome) {
    cricketState = currentShotOutcome.state;
    showCricketMessage(currentShotOutcome.message, 'success');
  }
  finishDelivery();
}

function handleCaughtOut() {
  if (currentShotOutcome) {
    cricketState = currentShotOutcome.state;
    showCricketMessage(currentShotOutcome.message, 'error');
  }
  finishDelivery();
}

function handleSafeRuns() {
  if (currentShotOutcome) {
    cricketState = currentShotOutcome.state;
    const isDot = currentShotOutcome.message.includes('Dot');
    showCricketMessage(currentShotOutcome.message, isDot ? 'warning' : 'success');
  }
  finishDelivery();
}

function checkRunOut() {
  let isSafe = true;
  if (ball.targetY === STUMPS_STRIKER.y) {
    if (batsmen.target1Y === 305 && batsmen.batsman1Y < 300) isSafe = false;
    if (batsmen.target2Y === 305 && batsmen.batsman2Y < 300) isSafe = false;
  } else {
    if (batsmen.target1Y === 145 && batsmen.batsman1Y > 150) isSafe = false;
    if (batsmen.target2Y === 145 && batsmen.batsman2Y > 150) isSafe = false;
  }

  if (!isSafe) {
    if (currentShotOutcome) {
      cricketState = { ...currentShotOutcome.state };
      cricketState.wickets++;
      let targetRuns = batsmen.targetRuns;
      let prevRuns = currentShotOutcome.state.runs - targetRuns;
      cricketState.runs = prevRuns + batsmen.completedRuns;
    } else {
      cricketState.wickets++;
      cricketState.balls_faced++;
    }
    showCricketMessage("OUT! Run out at the wickets! 🛑", 'error');
    finishDelivery();
  } else {
    handleSafeRuns();
  }
}

function handleMissOutcome() {
  gameLoopActive = false;
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  
  let isBowled = Math.random() < 0.45;
  if (isBowled) {
    cricketState.wickets++;
    cricketState.balls_faced++;
    showCricketMessage("OUT! Bowled! Clean bowled! 🛑", 'error');
  } else {
    cricketState.balls_faced++;
    showCricketMessage("Dot ball. Good bowling.", 'warning');
  }
  
  ball.x = 225;
  if (bowlingDirection === 1) {
    ball.y = isBowled ? 315 : 335;
  } else {
    ball.y = isBowled ? 135 : 115;
  }
  
  updateSVGDOM();
  finishDelivery();
}

function handleCricketHit() {
  if (cricketState.game_over) return;
  if (gameState === 'IDLE') {
    bowlBall();
  } else if (gameState === 'BOWLING') {
    attemptHit();
  }
}

function finishDelivery() {
  gameLoopActive = false;
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
  gameState = 'IDLE';
  
  if (cricketState.wickets >= 10 || cricketState.balls_faced >= cricketState.max_balls) {
    cricketState.game_over = true;
    cricketHitBtn.disabled = true;
    cricketHitBtn.style.opacity = '0.5';
    cricketHitBtn.textContent = 'GAME OVER';
    cricketRestartBtn.classList.remove('hidden');
    cricketRestartBtn.focus();
    
    let endMsg = cricketState.wickets >= 10 ? " ALL OUT!" : " Innings over!";
    showCricketMessage(`Match Over! You scored ${cricketState.runs}/${cricketState.wickets}.${endMsg}`, 'success');
  } else {
    cricketHitBtn.disabled = false;
    cricketHitBtn.style.opacity = '1';
    cricketHitBtn.textContent = 'BOWL ⚾';
    
    if (isAutoBowlingTimeout) {
      clearTimeout(isAutoBowlingTimeout);
      isAutoBowlingTimeout = null;
    }
    
    const overEnd = cricketState.balls_faced > 0 && cricketState.balls_faced % 6 === 0;
    const msg = overEnd ? "Over complete! Changing ends... next ball in 3s 🔄" : "Preparing next delivery... next ball in 2.5s ⚾";
    showCricketMessage(msg, overEnd ? 'success' : 'warning');
    
    isAutoBowlingTimeout = setTimeout(() => {
      bowlBall();
    }, overEnd ? 3000 : 2500);
  }
  
  updateCricketUI();
}


// Navigation Logic
function showMenu() {
  gameLoopActive = false;
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
  if (isAutoBowlingTimeout) {
    clearTimeout(isAutoBowlingTimeout);
    isAutoBowlingTimeout = null;
  }
  mainMenu.classList.remove('hidden');
  numberGuessGame.classList.add('hidden');
  hangmanGameView.classList.add('hidden');
  if (cricketGameView) cricketGameView.classList.add('hidden');
}

function showGame(gameId) {
  gameLoopActive = false;
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
  if (isAutoBowlingTimeout) {
    clearTimeout(isAutoBowlingTimeout);
    isAutoBowlingTimeout = null;
  }
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
if (cricketCloseHelpBtn) {
  cricketCloseHelpBtn.addEventListener('click', () => {
    if (cricketHowToPlayModal) {
      cricketHowToPlayModal.classList.add('hidden');
    }
    showCricketMessage("Press ENTER to start the match! 🏏", "warning");
  });
}

window.addEventListener('keydown', (e) => {
  if (cricketGameView && !cricketGameView.classList.contains('hidden')) {
    if (e.key === 'Enter') {
      if (cricketHowToPlayModal && !cricketHowToPlayModal.classList.contains('hidden')) {
        cricketHowToPlayModal.classList.add('hidden');
        e.preventDefault();
        showCricketMessage("Press ENTER to start the match! 🏏", "warning");
      } else if (cricketState.game_over) {
        e.preventDefault();
        initCricket();
      } else if (gameState === 'IDLE') {
        e.preventDefault();
        bowlBall();
      }
    } else if (e.key === '5' || e.code === 'Numpad5' || e.key === 'Clear') {
      if (gameState === 'BOWLING') {
        e.preventDefault();
        attemptHit();
      }
    }
  }
});

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
