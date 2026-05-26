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
let guessHistory = [];

// Statistics State
let gameStats = {
  numberGuess: { bestScore: null, gamesPlayed: 0 },
  hangman: { wins: 0, losses: 0 },
  cricket: { highRun: 0, gamesPlayed: 0 },
  cricketTest: { highRun: 0, gamesPlayed: 0 }
};

// Sound State
let isMuted = false;
let audioCtx = null;

// Mini Cricket Over outcomes history
let ballOutcomesHistory = [];

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSfx(type) {
  if (isMuted) return;
  try {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;
    
    switch (type) {
      case 'click': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case 'bowl': {
        const bufferSize = audioCtx.sampleRate * 0.4;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(8, now);
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.4);
        
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        noise.start(now);
        noise.stop(now + 0.4);
        break;
      }
      case 'hit': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.setValueAtTime(400, now + 0.02);
        
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }
      case 'out': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.5);
        
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'boundary': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        osc.frequency.setValueAtTime(1046.50, now + 0.24);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.24);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        
        osc.start(now);
        osc.stop(now + 0.45);
        break;
      }
      case 'success': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }
      case 'fail': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.setValueAtTime(115, now + 0.15);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
    }
  } catch (e) {
    console.error("Audio playback error:", e);
  }
}

function loadStats() {
  try {
    const stored = localStorage.getItem('dpr_mini_games_stats');
    if (stored) {
      const parsed = JSON.parse(stored);
      gameStats = { 
        ...gameStats, 
        ...parsed,
        cricketTest: parsed.cricketTest || { highRun: 0, gamesPlayed: 0 }
      };
    }
  } catch (e) {
    console.error("Failed to load stats from localStorage", e);
  }
  updateStatsUI();
  // Initialize player career stats database
  loadPlayerStatsDatabase();
}

function saveStats() {
  try {
    localStorage.setItem('dpr_mini_games_stats', JSON.stringify(gameStats));
  } catch (e) {
    console.error("Failed to save stats to localStorage", e);
  }
  updateStatsUI();
}

// Player Career Stats Database Operations
const DPR_PLAYER_STATS_KEY = 'dpr_cricket_player_stats';

function normalizePlayerName(name) {
  if (name === "Prabath Jayasuriya") return "P. Jayasuriya";
  return name;
}

function loadPlayerStatsDatabase() {
  let db = {};
  try {
    const stored = localStorage.getItem(DPR_PLAYER_STATS_KEY);
    if (stored) {
      db = JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load player stats database", e);
  }
  
  let updated = false;
  const allNames = new Set();
  
  if (typeof PLAYER_ROLES !== 'undefined') {
    Object.keys(PLAYER_ROLES).forEach(n => allNames.add(normalizePlayerName(n)));
  }
  
  if (typeof SQUADS !== 'undefined') {
    Object.values(SQUADS).forEach(team => {
      team.batters.forEach(n => allNames.add(normalizePlayerName(n)));
      team.bowlers.forEach(n => allNames.add(normalizePlayerName(n)));
    });
  }
  
  allNames.forEach(name => {
    if (!db[name]) {
      db[name] = {
        name: name,
        batting: {
          runs: 0,
          balls: 0,
          innings: 0,
          sixes: 0,
          fours: 0,
          fiftyCount: 0,
          hundredCount: 0,
          highestScore: 0,
          highestScoreNotOut: false,
          dismissals: 0
        },
        bowling: {
          wickets: 0,
          ballsBowled: 0,
          runsConceded: 0,
          innings: 0,
          bestWickets: 0,
          bestRuns: 0
        }
      };
      updated = true;
    }
  });
  
  if (updated) {
    savePlayerStatsDatabase(db);
  }
  
  return db;
}

function savePlayerStatsDatabase(db) {
  try {
    localStorage.setItem(DPR_PLAYER_STATS_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("Failed to save player stats database", e);
  }
}

function recordMatchStats() {
  const db = loadPlayerStatsDatabase();
  
  // 1. Gather batting performances
  let tempBattingScorecard = [];
  battersList.forEach(name => {
    let histEntry = battingScorecardHistory.find(b => b.name === name);
    if (histEntry) {
      tempBattingScorecard.push(histEntry);
    } else if (batter1 && batter1.name === name && batter1.name !== "No Batter") {
      tempBattingScorecard.push({ name: batter1.name, runs: batter1.runs, balls: batter1.balls, status: "Not Out", fours: batter1.fours || 0, sixes: batter1.sixes || 0 });
    } else if (batter2 && batter2.name === name && batter2.name !== "No Batter") {
      tempBattingScorecard.push({ name: batter2.name, runs: batter2.runs, balls: batter2.balls, status: "Not Out", fours: batter2.fours || 0, sixes: batter2.sixes || 0 });
    } else {
      tempBattingScorecard.push({ name: name, runs: 0, balls: 0, status: "Did Not Bat", fours: 0, sixes: 0 });
    }
  });

  // Update batting stats
  tempBattingScorecard.forEach(b => {
    if (b.status === "Out" || b.status === "Not Out") {
      const normName = normalizePlayerName(b.name);
      if (db[normName]) {
        const batting = db[normName].batting;
        batting.innings++;
        batting.runs += b.runs;
        batting.balls += b.balls;
        batting.fours += (b.fours || 0);
        batting.sixes += (b.sixes || 0);
        
        if (b.runs >= 100) {
          batting.hundredCount++;
        } else if (b.runs >= 50) {
          batting.fiftyCount++;
        }
        
        if (b.runs > batting.highestScore) {
          batting.highestScore = b.runs;
          batting.highestScoreNotOut = (b.status === "Not Out");
        } else if (b.runs === batting.highestScore && b.status === "Not Out" && !batting.highestScoreNotOut) {
          batting.highestScoreNotOut = true;
        }
        
        if (b.status === "Out") {
          batting.dismissals++;
        }
      }
    }
  });

  // 2. Update bowling stats
  bowlersList.forEach(name => {
    let stats = bowlerStatsMap[name];
    if (stats && stats.balls > 0) {
      const normName = normalizePlayerName(name);
      if (db[normName]) {
        const bowling = db[normName].bowling;
        const isFirstBowlingInnings = (bowling.ballsBowled === 0);
        
        bowling.innings++;
        bowling.wickets += stats.wickets;
        bowling.ballsBowled += stats.balls;
        bowling.runsConceded += stats.runs;
        
        if (isFirstBowlingInnings || stats.wickets > bowling.bestWickets || (stats.wickets === bowling.bestWickets && stats.runs < bowling.bestRuns)) {
          bowling.bestWickets = stats.wickets;
          bowling.bestRuns = stats.runs;
        }
      }
    }
  });

  savePlayerStatsDatabase(db);
}

function updateStatsUI() {
  const guessVal = document.getElementById('stats-guess-val');
  const hangmanVal = document.getElementById('stats-hangman-val');
  const cricketVal = document.getElementById('stats-cricket-val');
  const cricketTestVal = document.getElementById('stats-test-cricket-val');
  
  if (guessVal) {
    guessVal.textContent = gameStats.numberGuess.bestScore !== null 
      ? `${gameStats.numberGuess.bestScore} att.` 
      : '-';
  }
  if (hangmanVal) {
    const total = gameStats.hangman.wins + gameStats.hangman.losses;
    hangmanVal.textContent = total > 0 
      ? `${gameStats.hangman.wins}W / ${gameStats.hangman.losses}L` 
      : '-';
  }
  if (cricketVal) {
    cricketVal.textContent = gameStats.cricket.highRun > 0 
      ? `${gameStats.cricket.highRun} runs` 
      : '-';
  }
  if (cricketTestVal) {
    cricketTestVal.textContent = (gameStats.cricketTest && gameStats.cricketTest.highRun > 0)
      ? `${gameStats.cricketTest.highRun} runs` 
      : '-';
  }
}

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
let isTestMatch = false;
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

const cricketTeamSelectModal = document.getElementById('cricket-team-select-modal');
const cricketStartMatchBtn = document.getElementById('cricket-start-match-btn');
const cricketUserTeamSelect = document.getElementById('cricket-user-team');
const cricketOppTeamSelect = document.getElementById('cricket-opp-team');
const cricketScorecardModal = document.getElementById('cricket-scorecard-modal');
const cricketCloseScorecardBtn = document.getElementById('cricket-close-scorecard-btn');
const scorecardTabBatting = document.getElementById('scorecard-tab-batting');
const scorecardTabBowling = document.getElementById('scorecard-tab-bowling');
const scorecardSectionBatting = document.getElementById('scorecard-section-batting');
const scorecardSectionBowling = document.getElementById('scorecard-section-bowling');

const cricketPlayingXiModal = document.getElementById('cricket-playing-xi-modal');
const cricketPlayingXiContinueBtn = document.getElementById('cricket-playing-xi-continue-btn');
const xiUserFlag = document.getElementById('xi-user-flag');
const xiUserName = document.getElementById('xi-user-name');
const xiUserList = document.getElementById('xi-user-list');
const xiOppFlag = document.getElementById('xi-opp-flag');
const xiOppName = document.getElementById('xi-opp-name');
const xiOppList = document.getElementById('xi-opp-list');

// Bowler types lookup table (Fast vs Spin)
const BOWLER_TYPES = {
  "Jasprit Bumrah": "Fast", "Mohammed Siraj": "Fast", "R. Ashwin": "Spin", "Ravindra Jadeja": "Spin", "Akash Deep": "Fast",
  "Pat Cummins": "Fast", "Mitchell Starc": "Fast", "Josh Hazlewood": "Fast", "Nathan Lyon": "Spin", "Mitchell Marsh": "Fast", "Cameron Green": "Fast",
  "Chris Woakes": "Fast", "Gus Atkinson": "Fast", "Mark Wood": "Fast", "Shoaib Bashir": "Spin", "Ben Stokes": "Fast",
  "Prabath Jayasuriya": "Spin", "Asitha Fernando": "Fast", "Lahiru Kumara": "Fast", "Vishwa Fernando": "Fast", "D. de Silva": "Spin", "Angelo Mathews": "Fast"
};

// Global history array to store scores of dismissed batters
let battingScorecardHistory = [];

// Partnership tracking globals
let currentPartnershipRuns = 0;
let currentPartnershipCelebrated50 = false;
let currentPartnershipCelebrated100 = false;

// Bowler selection weights (Main Bowlers get higher weights than part-timers)
const BOWLER_WEIGHTS = {
  "Jasprit Bumrah": 4, "Mohammed Siraj": 4, "R. Ashwin": 4, "Ravindra Jadeja": 4, "Akash Deep": 3,
  "Pat Cummins": 4, "Mitchell Starc": 4, "Josh Hazlewood": 4, "Nathan Lyon": 4, "Mitchell Marsh": 2, "Cameron Green": 2,
  "Chris Woakes": 4, "Gus Atkinson": 4, "Mark Wood": 4, "Shoaib Bashir": 4, "Ben Stokes": 2,
  "Prabath Jayasuriya": 4, "Asitha Fernando": 4, "Lahiru Kumara": 4, "Vishwa Fernando": 4, "D. de Silva": 2, "Angelo Mathews": 2
};

let isMilestoneCelebrating = false;

// Player Roles & Team Flags for pre-match Playing XI presentation
const TEAM_FLAGS = {
  IND: "🇮🇳",
  AUS: "🇦🇺",
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  SL: "🇱🇰"
};

const PLAYER_ROLES = {
  // India
  "Rohit Sharma": "Batter", "Yashasvi Jaiswal": "Batter", "Shubman Gill": "Batter", "Virat Kohli": "Batter",
  "Rishabh Pant": "Wicketkeeper", "KL Rahul": "Batter", "Ravindra Jadeja": "All-Rounder", "R. Ashwin": "All-Rounder",
  "Jasprit Bumrah": "Bowler", "Mohammed Siraj": "Bowler", "Akash Deep": "Bowler",
  // Australia
  "Usman Khawaja": "Batter", "Steve Smith": "Batter", "M. Labuschagne": "Batter", "Travis Head": "Batter",
  "Mitchell Marsh": "All-Rounder", "Alex Carey": "Wicketkeeper", "Pat Cummins": "Bowler", "Mitchell Starc": "Bowler",
  "Nathan Lyon": "Bowler", "Josh Hazlewood": "Bowler", "Cameron Green": "All-Rounder",
  // England
  "Zak Crawley": "Batter", "Ben Duckett": "Batter", "Ollie Pope": "Batter", "Joe Root": "Batter",
  "Harry Brook": "Batter", "Ben Stokes": "All-Rounder", "Jamie Smith": "Wicketkeeper", "Chris Woakes": "All-Rounder",
  "Gus Atkinson": "Bowler", "Shoaib Bashir": "Bowler", "Mark Wood": "Bowler",
  // Sri Lanka
  "Pathum Nissanka": "Batter", "D. Karunaratne": "Batter", "Kusal Mendis": "Wicketkeeper", "Angelo Mathews": "All-Rounder",
  "Dinesh Chandimal": "Batter", "D. de Silva": "All-Rounder", "Kamindu Mendis": "Batter", "P. Jayasuriya": "Bowler",
  "Asitha Fernando": "Bowler", "Lahiru Kumara": "Bowler", "Vishwa Fernando": "Bowler"
};

// Squad declarations containing real players
const SQUADS = {
  IND: {
    name: "India",
    short: "IND",
    batters: ["Rohit Sharma", "Yashasvi Jaiswal", "Shubman Gill", "Virat Kohli", "Rishabh Pant", "KL Rahul", "Ravindra Jadeja", "R. Ashwin", "Jasprit Bumrah", "Mohammed Siraj", "Akash Deep"],
    bowlers: ["Jasprit Bumrah", "Mohammed Siraj", "R. Ashwin", "Ravindra Jadeja", "Akash Deep"]
  },
  AUS: {
    name: "Australia",
    short: "AUS",
    batters: ["Usman Khawaja", "Steve Smith", "M. Labuschagne", "Travis Head", "Mitchell Marsh", "Alex Carey", "Pat Cummins", "Mitchell Starc", "Nathan Lyon", "Josh Hazlewood", "Cameron Green"],
    bowlers: ["Pat Cummins", "Mitchell Starc", "Josh Hazlewood", "Nathan Lyon", "Mitchell Marsh", "Cameron Green"]
  },
  ENG: {
    name: "England",
    short: "ENG",
    batters: ["Zak Crawley", "Ben Duckett", "Ollie Pope", "Joe Root", "Harry Brook", "Ben Stokes", "Jamie Smith", "Chris Woakes", "Gus Atkinson", "Shoaib Bashir", "Mark Wood"],
    bowlers: ["Chris Woakes", "Gus Atkinson", "Mark Wood", "Shoaib Bashir", "Ben Stokes"]
  },
  SL: {
    name: "Sri Lanka",
    short: "SL",
    batters: ["Pathum Nissanka", "D. Karunaratne", "Kusal Mendis", "Angelo Mathews", "Dinesh Chandimal", "D. de Silva", "Kamindu Mendis", "P. Jayasuriya", "Asitha Fernando", "Lahiru Kumara", "Vishwa Fernando"],
    bowlers: ["Prabath Jayasuriya", "Asitha Fernando", "Lahiru Kumara", "Vishwa Fernando", "D. de Silva", "Angelo Mathews"]
  }
};

let userTeamCode = 'AUS';
let oppTeamCode = 'IND';
let battersList = [];
let bowlersList = [];
let batter1 = null; // { name, runs, balls }
let batter2 = null; // { name, runs, balls }
let currentBowler = null; // { name, balls, runs, wickets }
let nextBatsmanIndex = 2;
let nextBowlerIndex = 1;
let strikerOnStrike = 1; // 1 = batter1, 2 = batter2

// Map to track bowlers' stats continuously across the match
let bowlerStatsMap = {}; // name -> { name, balls, runs, wickets }

let bowlingDirection = 1; // 1 = top-to-bottom, -1 = bottom-to-top
let isAutoBowlingTimeout = null;

// Bowling Physics & Styling
let currentBallSpeedY = 4.5;
let currentBallSpeedX = 0;
let ballStyle = "Fast-medium";
let ballSpeedKmh = 140;
let hasBounced = false;
let bouncePointY = 220;
let spinBreakDirection = 1;
let overBowlerStyle = null;

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

  update(ballX, ballY, isActive) {
    if (isActive) {
      this.state = 'CHASING';
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
    } else {
      let dx = ballX - this.x;
      let dy = ballY - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if ((ball.state === 'HIT' || ball.state === 'THROWN') && distance < 120) {
        this.state = 'CHASING';
        let moveSpeed = this.speed * 0.7;
        if (distance > 12) {
          this.x += (dx / distance) * moveSpeed;
          this.y += (dy / distance) * moveSpeed;
        }
      } else {
        let hdx = this.homeX - this.x;
        let hdy = this.homeY - this.y;
        let hdist = Math.sqrt(hdx * hdx + hdy * hdy);
        if (hdist > 2) {
          this.x += (hdx / hdist) * 1.5; // return to base
          this.y += (hdy / hdist) * 1.5;
        } else {
          this.x = this.homeX;
          this.y = this.homeY;
          this.state = 'IDLE';
        }
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

/* Commentary Feed Helpers */
function addCommentary(text, type = '') {
  const container = document.getElementById('cricket-commentary-lines');
  if (!container) return;
  
  const prevActive = container.querySelector('.commentary-line.active');
  if (prevActive) {
    prevActive.classList.remove('active');
  }
  
  const line = document.createElement('div');
  line.className = `commentary-line active ${type}`;
  line.innerHTML = text;
  container.appendChild(line);
  
  container.scrollTop = container.scrollHeight;
}

function getCommentaryBowled(speed, style) {
  const msgs = [
    `OUT! Clean bowled! Beaten by the pace @ ${speed.toFixed(1)} km/h. 🛑`,
    `OUT! Bowled him! The ball spins right past the bat and clips the bails! 🛑`,
    `OUT! Castled! Swing beats the outside edge and crashes into the middle stump! 🛑`
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function getCommentaryDot(style) {
  const msgs = [
    `Dot ball. The batsman defends it forward.`,
    `Good length delivery, batsman blocks it back carefully.`,
    `Slightly wide, left alone to the keeper.`,
    `Beaten by the ${style.toLowerCase()} movement.`
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function getProceduralCommentary(outcome, speed, style) {
  const catchMsgs = [
    `In the air and CAUGHT! Excellent catch in the deep! 🛑`,
    `WICKET! A lofted shot straight down the throat of the fielder! 🛑`,
    `OUT! Plucked out of thin air by a diving cover fielder! 🛑`
  ];
  
  const runoutMsgs = [
    `WICKET! Direct hit! The batsman is short of the crease. Brilliant fielding! 🛑`,
    `OUT! Brilliant throw to the stumps, batsman run out by a fraction of an inch! 🛑`
  ];
  
  const runMsgs = {
    1: [
      `Flicked away for a quick single.`,
      `Pushed into the gap for a single.`,
      `Guided down to third man for one run.`,
      `Smart running! They steal a single.`
    ],
    2: [
      `Driven through covers, they run hard for two!`,
      `Shot played into the outfield, easy double taken.`,
      `Tucked away to fine leg, excellent running to get two runs.`
    ],
    3: [
      `Superb cover drive! Sweeper chases it down, they complete three runs.`,
      `Whipped off the pads! Great effort by the boundary fielder, but they get three.`
    ]
  };
  
  const fourMsgs = [
    `FOUR! Cracked through the covers! Beautiful shot. 🏏`,
    `FOUR! Edged and past the slips to the boundary rope! 🏏`,
    `FOUR! Pulled away behind square, runs away to the fence! 🏏`,
    `FOUR! Shot of the day! Perfectly timed bounce and over the rope. 🏏`
  ];
  
  const sixMsgs = [
    `SIX! Smashed high and deep! Out of the ground! 💥`,
    `SIX! Picked up effortlessly and sailed over the mid-wicket boundary! 💥`,
    `SIX! Monumental strike! The crowd is going wild! 💥`
  ];

  if (outcome === 'W_BOWLED') return getCommentaryBowled(speed, style);
  if (outcome === 'W_CAUGHT') return catchMsgs[Math.floor(Math.random() * catchMsgs.length)];
  if (outcome === 'W_RUNOUT') return runoutMsgs[Math.floor(Math.random() * runoutMsgs.length)];
  if (outcome === 0 || outcome === '0') return getCommentaryDot(style);
  if (outcome === 4) return fourMsgs[Math.floor(Math.random() * fourMsgs.length)];
  if (outcome === 6) return sixMsgs[Math.floor(Math.random() * sixMsgs.length)];
  
  if (runMsgs[outcome]) {
    const list = runMsgs[outcome];
    return list[Math.floor(Math.random() * list.length)];
  }
  
  return `Runs scored: ${outcome}.`;
}

function generateBowlingSpeed() {
  const speedVal = document.getElementById('cricket-speed-val');
  if (!speedVal) return;
  
  if (!overBowlerStyle) {
    const bowlerType = BOWLER_TYPES[currentBowler.name] || "Fast";
    overBowlerStyle = (bowlerType === "Spin") ? "Off-spin" : "Fast-medium";
  }
  ballStyle = overBowlerStyle;
  
  if (ballStyle === "Off-spin") {
    ballSpeedKmh = 85 + Math.random() * 20;
    currentBallSpeedY = 3.2 + ((ballSpeedKmh - 85) / 20) * 0.6;
    spinBreakDirection = Math.random() < 0.5 ? 1 : -1;
    currentBallSpeedX = -spinBreakDirection * (0.4 + Math.random() * 0.3); // drift wide
  } else {
    ballSpeedKmh = 130 + Math.random() * 22;
    currentBallSpeedY = 5.4 + ((ballSpeedKmh - 130) / 22) * 1.0;
    currentBallSpeedX = (Math.random() - 0.5) * 0.4; // slight initial angle
  }
  hasBounced = false;
  bouncePointY = 190 + Math.random() * 50; // bounce point Y
  
  speedVal.innerHTML = `${ballStyle} @ <span class="highlight">${ballSpeedKmh.toFixed(1)} km/h</span>`;
}

function updateOverHistoryUI() {
  const container = document.getElementById('cricket-over-balls');
  if (!container) return;
  container.innerHTML = '';
  
  const currentOverIndex = Math.floor(Math.max(0, cricketState.balls_faced - 1) / 6);
  const startIdx = currentOverIndex * 6;
  const overBalls = ballOutcomesHistory.slice(startIdx, startIdx + 6);
  
  for (let i = 0; i < 6; i++) {
    const chip = document.createElement('div');
    chip.className = 'over-ball-chip';
    
    if (i < overBalls.length) {
      const val = overBalls[i];
      chip.textContent = val === 'W' ? 'W' : val === 0 ? '.' : val;
      chip.classList.add('active');
      if (val === 'W') chip.classList.add('wicket');
      else if (val === 0) chip.classList.add('dot');
      else if (val === 4) chip.classList.add('boundary-four');
      else if (val === 6) chip.classList.add('boundary-six');
      else chip.classList.add('run');
    } else {
      chip.textContent = '-';
    }
    container.appendChild(chip);
  }
}

function triggerBoundaryFlash() {
  const container = document.querySelector('#cricket-game .game-container');
  if (container) {
    container.classList.remove('boundary-flash');
    void container.offsetWidth;
    container.classList.add('boundary-flash');
    setTimeout(() => {
      container.classList.remove('boundary-flash');
    }, 1500);
  }
}

function updateHowToPlayModal() {
  const modalTitle = cricketHowToPlayModal.querySelector('h2');
  const modalSteps = cricketHowToPlayModal.querySelector('.how-to-play-steps');
  if (!modalTitle || !modalSteps) return;
  
  if (isTestMatch) {
    modalTitle.innerHTML = "🏏 How to Play Cricket Test";
    modalSteps.innerHTML = `
      <li><strong>1. Start/Bowl:</strong> Press the <span class="highlight" style="color: #60a5fa;">Enter ↵</span> key to start and bowl.</li>
      <li><strong>2. Hit:</strong> Press the <span class="highlight" style="color: #60a5fa;">5</span> key (keyboard or Numpad) to hit.</li>
      <li><strong>3. Manual Running:</strong> Press <span class="highlight" style="color: #60a5fa;">W</span> to start/take a run. Press <span class="highlight" style="color: #60a5fa;">S</span> to cancel the run and turn back to the crease.</li>
      <li><strong>4. Test Rules:</strong> No limit on overs! Play until all <span class="highlight" style="color: #f43f5e;">10 wickets</span> are down.</li>
    `;
  } else {
    modalTitle.innerHTML = "🏏 How to Play Mini Cricket";
    modalSteps.innerHTML = `
      <li><strong>1. Start/Bowl:</strong> Press the <span class="highlight" style="color: #60a5fa;">Enter ↵</span> key to start the match and bowl.</li>
      <li><strong>2. Hit:</strong> Watch the ball. Press either <span class="highlight" style="color: #60a5fa;">5</span> key (keyboard or Numpad) to bat exactly as the ball crosses the crease.</li>
      <li><strong>3. Auto-Bowl:</strong> After each play completes, the next delivery will bowl automatically!</li>
      <li><strong>4. Ends Change:</strong> After every 6 balls (an Over), the bowling direction changes!</li>
    `;
  }
}

function initCricket() {
  if (cricketTeamSelectModal) {
    cricketTeamSelectModal.classList.remove('hidden');
  }
  if (cricketScorecardModal) {
    cricketScorecardModal.classList.add('hidden');
  }
  if (cricketPlayingXiModal) {
    cricketPlayingXiModal.classList.add('hidden');
  }
}

function isBeginningModalOpen() {
  const teamSelectOpen = cricketTeamSelectModal && !cricketTeamSelectModal.classList.contains('hidden');
  const playingXiOpen = cricketPlayingXiModal && !cricketPlayingXiModal.classList.contains('hidden');
  const howToPlayOpen = cricketHowToPlayModal && !cricketHowToPlayModal.classList.contains('hidden');
  return teamSelectOpen || playingXiOpen || howToPlayOpen;
}

function showPlayingXI() {
  const userTeam = SQUADS[userTeamCode];
  const oppTeam = SQUADS[oppTeamCode];

  // Set headers
  if (xiUserFlag) xiUserFlag.textContent = TEAM_FLAGS[userTeamCode] || "🇦🇺";
  if (xiUserName) xiUserName.textContent = userTeam.name;
  if (xiOppFlag) xiOppFlag.textContent = TEAM_FLAGS[oppTeamCode] || "🇮🇳";
  if (xiOppName) xiOppName.textContent = oppTeam.name;

  // Helper to build list HTML
  const buildPlayerListHTML = (players) => {
    return players.map((name, index) => {
      const role = PLAYER_ROLES[name] || "Batter";
      let roleClass = "batter";
      if (role === "Bowler") roleClass = "bowler";
      else if (role === "All-Rounder") roleClass = "all-rounder";
      else if (role === "Wicketkeeper") roleClass = "wicketkeeper";

      return `
        <div class="playing-xi-row">
          <div class="player-name-wrap">
            <span class="player-number">${index + 1}</span>
            <span class="player-name-text player-name-hoverable" data-player-name="${name}">${name}</span>
          </div>
          <span class="xi-role-badge ${roleClass}">${role}</span>
        </div>
      `;
    }).join("");
  };

  // Populate lists
  if (xiUserList) xiUserList.innerHTML = buildPlayerListHTML(userTeam.batters);
  if (xiOppList) xiOppList.innerHTML = buildPlayerListHTML(oppTeam.batters);

  // Show Playing XI Modal
  if (cricketPlayingXiModal) {
    cricketPlayingXiModal.classList.remove('hidden');
  }
}

function updateTeamCardCrossHighlight() {
  const userVal = document.getElementById('cricket-user-team')?.value;
  const oppVal = document.getElementById('cricket-opp-team')?.value;

  // Grey out the "taken" option in each dropdown
  document.querySelectorAll('#user-team-options .team-select-option').forEach(opt => {
    opt.classList.toggle('disabled-option', opt.getAttribute('data-value') === oppVal);
  });
  document.querySelectorAll('#opp-team-options .team-select-option').forEach(opt => {
    opt.classList.toggle('disabled-option', opt.getAttribute('data-value') === userVal);
  });

  // Update matchup preview
  const batFlag = document.getElementById('matchup-bat-flag');
  const batName = document.getElementById('matchup-bat-name');
  const bowlFlag = document.getElementById('matchup-bowl-flag');
  const bowlName = document.getElementById('matchup-bowl-name');
  const userTrigger = document.getElementById('user-team-trigger');
  const oppTrigger = document.getElementById('opp-team-trigger');
  if (batFlag && userTrigger) batFlag.textContent = userTrigger.querySelector('.select-flag')?.textContent || '';
  if (batName && userVal) batName.textContent = userVal;
  if (bowlFlag && oppTrigger) bowlFlag.textContent = oppTrigger.querySelector('.select-flag')?.textContent || '';
  if (bowlName && oppVal) bowlName.textContent = oppVal;
}

function startMatchWithSelectedTeams() {
  userTeamCode = cricketUserTeamSelect ? cricketUserTeamSelect.value : 'AUS';
  oppTeamCode = cricketOppTeamSelect ? cricketOppTeamSelect.value : 'IND';

  // Validate: batting and bowling teams cannot be the same
  if (userTeamCode === oppTeamCode) {
    const errorEl = document.getElementById('team-select-error');
    if (errorEl) {
      errorEl.classList.remove('hidden');
      errorEl.classList.add('shake');
      setTimeout(() => errorEl.classList.remove('shake'), 600);
    }
    return;
  } else {
    const errorEl = document.getElementById('team-select-error');
    if (errorEl) errorEl.classList.add('hidden');
  }

  if (cricketTeamSelectModal) {
    cricketTeamSelectModal.classList.add('hidden');
  }
  if (cricketScorecardModal) {
    cricketScorecardModal.classList.add('hidden');
  }
  
  battingScorecardHistory = []; // Reset batting scorecard history
  currentPartnershipRuns = 0;
  currentPartnershipCelebrated50 = false;
  currentPartnershipCelebrated100 = false;
  
  cricketState = { runs: 0, wickets: 0, balls_faced: 0, max_balls: isTestMatch ? Infinity : 12, game_over: false };
  bowlingDirection = 1;
  ballOutcomesHistory = [];
  overBowlerStyle = null;

  // Initialize squad sheets based on user choices
  battersList = [...SQUADS[userTeamCode].batters];
  bowlersList = [...SQUADS[oppTeamCode].bowlers];

  batter1 = { name: battersList[0], runs: 0, balls: 0, fours: 0, sixes: 0, hasCelebrated50: false, hasCelebrated100: false };
  batter2 = { name: battersList[1], runs: 0, balls: 0, fours: 0, sixes: 0, hasCelebrated50: false, hasCelebrated100: false };
  
  // Clear and initialize bowlerStatsMap
  bowlerStatsMap = {};
  bowlersList.forEach(name => {
    bowlerStatsMap[name] = { name: name, balls: 0, runs: 0, wickets: 0 };
  });

  const firstBowlerName = bowlersList[0];
  currentBowler = bowlerStatsMap[firstBowlerName];
  
  nextBatsmanIndex = 2;
  nextBowlerIndex = 1;
  strikerOnStrike = 1; // batter1 starts on strike
  
  if (isAutoBowlingTimeout) {
    clearTimeout(isAutoBowlingTimeout);
    isAutoBowlingTimeout = null;
  }
  resetPlayState();
  updateCricketUI();
  updateOverHistoryUI();
  
  const speedVal = document.getElementById('cricket-speed-val');
  if (speedVal) speedVal.textContent = '-';
  
  cricketHitBtn.disabled = false;
  cricketHitBtn.style.opacity = '1';
  cricketHitBtn.textContent = 'BOWL ⚾';
  
  cricketMessage.className = 'message-container hidden';
  cricketMessage.innerHTML = '';
  cricketRestartBtn.classList.add('hidden');
  
  const commentaryLines = document.getElementById('cricket-commentary-lines');
  if (commentaryLines) {
    commentaryLines.innerHTML = `<div class="commentary-line active">Welcome to the match! ${SQUADS[userTeamCode].name} vs ${SQUADS[oppTeamCode].name}. Press ENTER or click BOWL to start.</div>`;
  }
  
  const gameHeaderTitle = cricketGameView.querySelector('.game-header h1');
  const gameHeaderDesc = cricketGameView.querySelector('.game-header p');
  const ballsLimitEl = document.getElementById('cricket-balls-limit');
  
  if (isTestMatch) {
    if (gameHeaderTitle) gameHeaderTitle.textContent = `${SQUADS[userTeamCode].name} vs ${SQUADS[oppTeamCode].name} - Test Match`;
    if (gameHeaderDesc) gameHeaderDesc.innerHTML = 'Score as many runs as possible until <span class="highlight">10 Wickets</span> are down!';
    if (ballsLimitEl) ballsLimitEl.style.display = 'none';
  } else {
    if (gameHeaderTitle) gameHeaderTitle.textContent = `${SQUADS[userTeamCode].name} vs ${SQUADS[oppTeamCode].name} - Mini Cricket`;
    if (gameHeaderDesc) gameHeaderDesc.innerHTML = 'Score as many runs as possible in <span class="highlight">2 Overs (12 balls)</span>!';
    if (ballsLimitEl) ballsLimitEl.style.display = 'inline';
  }
  
  updateHowToPlayModal();
  
  showPlayingXI();
}

function replaceOutBatter(batterNum) {
  let outBatter = (batterNum === 1) ? batter1 : batter2;
  if (outBatter && outBatter.name !== "No Batter") {
    if (batter1 && batter2 && batter1.name !== "No Batter" && batter2.name !== "No Batter") {
      addCommentary(`Partnership: ${currentPartnershipRuns} runs between ${batter1.name} and ${batter2.name} is broken.`, 'system');
    }
    battingScorecardHistory.push({
      name: outBatter.name,
      runs: outBatter.runs,
      balls: outBatter.balls,
      fours: outBatter.fours || 0,
      sixes: outBatter.sixes || 0,
      status: "Out"
    });
  }

  // Reset partnership
  currentPartnershipRuns = 0;
  currentPartnershipCelebrated50 = false;
  currentPartnershipCelebrated100 = false;

  if (nextBatsmanIndex < battersList.length) {
    let newName = battersList[nextBatsmanIndex];
    nextBatsmanIndex++;
    if (batterNum === 1) {
      batter1 = { name: newName, runs: 0, balls: 0, fours: 0, sixes: 0, hasCelebrated50: false, hasCelebrated100: false };
    } else {
      batter2 = { name: newName, runs: 0, balls: 0, fours: 0, sixes: 0, hasCelebrated50: false, hasCelebrated100: false };
    }
  } else {
    if (batterNum === 1) {
      batter1 = { name: "No Batter", runs: 0, balls: 0, fours: 0, sixes: 0, hasCelebrated50: false, hasCelebrated100: false };
    } else {
      batter2 = { name: "No Batter", runs: 0, balls: 0, fours: 0, sixes: 0, hasCelebrated50: false, hasCelebrated100: false };
    }
  }
}

function showPostMatchScorecard() {
  let tempBattingScorecard = [];
  
  battersList.forEach(name => {
    let histEntry = battingScorecardHistory.find(b => b.name === name);
    if (histEntry) {
      tempBattingScorecard.push(histEntry);
    } else if (batter1 && batter1.name === name && batter1.name !== "No Batter") {
      tempBattingScorecard.push({ name: batter1.name, runs: batter1.runs, balls: batter1.balls, status: "Not Out" });
    } else if (batter2 && batter2.name === name && batter2.name !== "No Batter") {
      tempBattingScorecard.push({ name: batter2.name, runs: batter2.runs, balls: batter2.balls, status: "Not Out" });
    } else {
      tempBattingScorecard.push({ name: name, runs: 0, balls: 0, status: "Did Not Bat" });
    }
  });

  let battingHtml = "";
  tempBattingScorecard.forEach(b => {
    let displayStatus = "";
    let scoreDisplay = "";
    
    if (b.status === "Not Out") {
      displayStatus = `<span style="color: var(--success-color); font-weight: bold;">Not Out</span>`;
      scoreDisplay = `<span class="player-runs" style="color: var(--accent-cricket);">${b.runs} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-secondary);">(${b.balls}b)</span></span>`;
    } else if (b.status === "Out") {
      displayStatus = `<span style="color: var(--error-color);">Out</span>`;
      scoreDisplay = `<span class="player-runs" style="color: var(--accent-cricket);">${b.runs} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-secondary);">(${b.balls}b)</span></span>`;
    } else {
      displayStatus = `<span style="color: var(--text-muted);">Did Not Bat</span>`;
      scoreDisplay = `<span class="player-runs" style="color: var(--text-muted);">-</span>`;
    }

    battingHtml += `
      <div class="player-stat-row" style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between;">
        <span style="font-weight: 600; color: var(--text-primary);"><span class="player-name-hoverable" data-player-name="${b.name}">${b.name}</span> <span style="font-size: 0.8rem; font-weight: normal; margin-left: 6px;">(${displayStatus})</span></span>
        ${scoreDisplay}
      </div>
    `;
  });
  const battingContainer = document.getElementById('scorecard-batting-rows');
  if (battingContainer) battingContainer.innerHTML = battingHtml;

  let bowlingHtml = "";
  bowlersList.forEach(name => {
    let stats = bowlerStatsMap[name];
    if (stats && stats.balls > 0) {
      let overs = Math.floor(stats.balls / 6) + '.' + (stats.balls % 6);
      let econ = ((stats.runs * 6) / stats.balls).toFixed(2);
      bowlingHtml += `
        <div class="player-stat-row" style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between;">
          <span style="font-weight: 600; color: #a5b4fc;"><span class="player-name-hoverable" data-player-name="${name}">${name}</span></span>
          <span class="player-runs" style="color: #a5b4fc;">Overs: ${overs} | Runs: ${stats.runs} | Wkts: ${stats.wickets} | Econ: ${econ}</span>
        </div>
      `;
    }
  });
  const bowlingContainer = document.getElementById('scorecard-bowling-rows');
  if (bowlingContainer) bowlingContainer.innerHTML = bowlingHtml;

  // Activate the Batting tab by default when modal opens
  if (scorecardTabBatting) {
    scorecardTabBatting.click();
  }

  if (cricketScorecardModal) {
    cricketScorecardModal.classList.remove('hidden');
  }
}

let milestoneQueue = [];

function triggerMilestoneCelebration(msg) {
  if (isMilestoneCelebrating) {
    milestoneQueue.push(msg);
    return;
  }
  
  // Log inside commentary in golden style
  addCommentary(msg, 'milestone');
  
  // Play achievement sound
  playSfx('success');
  
  isMilestoneCelebrating = true;
  if (isAutoBowlingTimeout) {
    clearTimeout(isAutoBowlingTimeout);
    isAutoBowlingTimeout = null;
  }
  
  if (cricketHitBtn) {
    cricketHitBtn.disabled = true;
    cricketHitBtn.textContent = '👏 CELEBRATING';
    cricketHitBtn.style.opacity = '0.7';
  }

  // Visual banner toast
  const toast = document.getElementById('cricket-milestone-toast');
  if (toast) {
    toast.innerHTML = `
      <div class="milestone-badge">🏆 MILESTONE</div>
      <div class="milestone-msg">${msg}</div>
    `;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
      isMilestoneCelebrating = false;
      
      // Process next milestone in queue if any
      if (milestoneQueue.length > 0) {
        const nextMsg = milestoneQueue.shift();
        triggerMilestoneCelebration(nextMsg);
      } else {
        if (!cricketState.game_over) {
          if (cricketHitBtn) {
            cricketHitBtn.disabled = false;
            cricketHitBtn.textContent = 'BOWL ⚾';
            cricketHitBtn.style.opacity = '1';
          }
          
          const overEnd = cricketState.balls_faced > 0 && cricketState.balls_faced % 6 === 0;
          const resumeMsg = overEnd ? "Over complete! Changing ends... next ball in 2.5s 🔄" : "Preparing next delivery... next ball in 2s ⚾";
          showCricketMessage(resumeMsg, overEnd ? 'success' : 'warning');
          
          isAutoBowlingTimeout = setTimeout(() => {
            bowlBall();
          }, overEnd ? 2500 : 2000);
        }
      }
    }, 4000);
  }
}

function checkMilestonesAndPartnerships(runsScored) {
  if (runsScored <= 0) return;
  
  currentPartnershipRuns += runsScored;
  
  if (batter1 && batter2) {
    let activeBatter = (strikerOnStrike === 1) ? batter1 : batter2;
    if (activeBatter.runs >= 100 && !activeBatter.hasCelebrated100) {
      activeBatter.hasCelebrated100 = true;
      triggerMilestoneCelebration(`🏏 HUNDRED! ${activeBatter.name} reaches a magnificent 100 runs! 🎉💯`);
    } else if (activeBatter.runs >= 50 && !activeBatter.hasCelebrated50) {
      activeBatter.hasCelebrated50 = true;
      triggerMilestoneCelebration(`🏏 FIFTY! ${activeBatter.name} scores a brilliant 50 runs! 🎉👏`);
    }
  }
  
  if (currentPartnershipRuns >= 100 && !currentPartnershipCelebrated100) {
    currentPartnershipCelebrated100 = true;
    let b1 = batter1 ? batter1.name : "Batsman 1";
    let b2 = batter2 ? batter2.name : "Batsman 2";
    triggerMilestoneCelebration(`🤝 Milestone! 100-Run Partnership reached between ${b1} & ${b2}! 🎉🔥`);
  } else if (currentPartnershipRuns >= 50 && !currentPartnershipCelebrated50) {
    currentPartnershipCelebrated50 = true;
    let b1 = batter1 ? batter1.name : "Batsman 1";
    let b2 = batter2 ? batter2.name : "Batsman 2";
    triggerMilestoneCelebration(`🤝 Milestone! 50-Run Partnership reached between ${b1} & ${b2}! 🎉🌟`);
  }
}

function startManualRun() {
  if (!isTestMatch) return;
  if (batsmen.isRunning) {
    if (batsmen.target1Y === batsmen.start1Y) {
      batsmen.target1Y = batsmen.start1Y === 305 ? 145 : 305;
      batsmen.target2Y = batsmen.start2Y === 305 ? 145 : 305;
      showCricketMessage("Running! 🏃", "success");
    }
  } else {
    batsmen.target1Y = batsmen.start1Y === 305 ? 145 : 305;
    batsmen.target2Y = batsmen.start2Y === 305 ? 145 : 305;
    batsmen.isRunning = true;
    showCricketMessage("Running! 🏃", "success");
  }
  updateCricketUI();
}

function cancelManualRun() {
  if (!isTestMatch) return;
  if (batsmen.isRunning) {
    if (batsmen.target1Y !== batsmen.start1Y) {
      batsmen.target1Y = batsmen.start1Y;
      batsmen.target2Y = batsmen.start2Y;
      showCricketMessage("Turning back! 🔄", "warning");
    }
  }
  updateCricketUI();
}

function resetPlayState() {
  gameState = 'IDLE';
  bowlingDirection = (Math.floor(cricketState.balls_faced / 6) % 2 === 0) ? 1 : -1;
  
  // Get list of fielders from opponent squad (excluding current bowler)
  const opponentPlayers = SQUADS[oppTeamCode].batters.filter(p => p !== currentBowler.name);
  fielders = fieldersData.map((d, index) => {
    let playerName = opponentPlayers[index % opponentPlayers.length];
    let parts = playerName.split(' ');
    let formattedName = parts.length > 1 ? parts[0][0] + ". " + parts.slice(1).join(' ') : playerName;
    return new Fielder(d.id, formattedName, d.x, d.y, d.speed);
  });
  
  const initialBallY = (bowlingDirection === 1) ? 115 : 335;
  ball = { x: 225, y: initialBallY, vx: 0, vy: 0, speed: 0, state: 'IDLE', loft: false, loftProgress: 0, loftDuration: 0, maxLoftHeight: 0 };
  
  const strikerCreaseY = (bowlingDirection === 1) ? 305 : 145;
  const nonStrikerCreaseY = (bowlingDirection === 1) ? 145 : 305;

  const b1Y = (strikerOnStrike === 1) ? strikerCreaseY : nonStrikerCreaseY;
  const b2Y = (strikerOnStrike === 2) ? strikerCreaseY : nonStrikerCreaseY;

  batsmen = {
    batsman1Y: b1Y,
    batsman2Y: b2Y,
    start1Y: b1Y,
    start2Y: b2Y,
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
  if (isTestMatch) {
    cricketRuns.textContent = cricketState.runs + (batsmen.completedRuns || 0);
  } else {
    cricketRuns.textContent = cricketState.runs;
  }
  cricketWickets.textContent = cricketState.wickets;
  const oversFaced = Math.floor(cricketState.balls_faced / 6) + '.' + (cricketState.balls_faced % 6);
  cricketBalls.textContent = oversFaced;

  // Render Player scorecards HUD
  const strikerNameEl = document.getElementById('batter-striker-name');
  const strikerStatsEl = document.getElementById('batter-striker-stats');
  const nonStrikerNameEl = document.getElementById('batter-nonstriker-name');
  const nonStrikerStatsEl = document.getElementById('batter-nonstriker-stats');
  const bowlerNameEl = document.getElementById('bowler-name');
  const bowlerStatsEl = document.getElementById('bowler-stats');
  const partnershipStatsEl = document.getElementById('partnership-stats');

  if (batter1 && batter2 && currentBowler) {
    const s1 = (strikerOnStrike === 1) ? batter1 : batter2;
    const s2 = (strikerOnStrike === 1) ? batter2 : batter1;
    
    if (strikerNameEl) {
      strikerNameEl.textContent = s1.name;
      const strikerRow = document.getElementById('batter-striker-row');
      if (strikerRow) strikerRow.className = 'player-stat-row active-batter';
    }
    if (strikerStatsEl) {
      strikerStatsEl.textContent = `${s1.runs} (${s1.balls})`;
    }
    
    if (nonStrikerNameEl) {
      nonStrikerNameEl.textContent = s2.name;
      const nonStrikerRow = document.getElementById('batter-nonstriker-row');
      if (nonStrikerRow) nonStrikerRow.className = 'player-stat-row';
    }
    if (nonStrikerStatsEl) {
      nonStrikerStatsEl.textContent = `${s2.runs} (${s2.balls})`;
    }

    if (bowlerNameEl) {
      bowlerNameEl.textContent = currentBowler.name;
    }
    if (bowlerStatsEl) {
      let overs = Math.floor(currentBowler.balls / 6) + '.' + (currentBowler.balls % 6);
      let econ = currentBowler.balls > 0 ? ((currentBowler.runs * 6) / currentBowler.balls).toFixed(2) : "0.00";
      bowlerStatsEl.textContent = `Overs: ${overs} | Runs: ${currentBowler.runs} | Wkts: ${currentBowler.wickets} | Econ: ${econ}`;
    }
    if (partnershipStatsEl) {
      partnershipStatsEl.textContent = `${currentPartnershipRuns} runs`;
    }
  }
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
    ballEl.setAttribute('fill', isTestMatch ? '#be123c' : '#ffffff');
  }

  let strikerFill = '#3b82f6'; // default blue
  let nonStrikerFill = '#60a5fa'; // default light blue
  let bowlerFill = '#ef4444'; // default red
  
  if (isTestMatch) {
    strikerFill = '#fafaf9'; // traditional cream/white
    nonStrikerFill = '#fafaf9';
    bowlerFill = '#fafaf9';
  }
  
  if (batsmen.isRunning) {
    // Batsman 1 safety check
    let b1Safe = true;
    if (batsmen.target1Y === 305) {
      b1Safe = batsmen.batsman1Y >= 300;
    } else {
      b1Safe = batsmen.batsman1Y <= 150;
    }
    strikerFill = b1Safe ? '#10b981' : '#f59e0b'; // green if safe, orange if running
    
    // Batsman 2 safety check
    let b2Safe = true;
    if (batsmen.target2Y === 305) {
      b2Safe = batsmen.batsman2Y >= 300;
    } else {
      b2Safe = batsmen.batsman2Y <= 150;
    }
    nonStrikerFill = b2Safe ? '#10b981' : '#f59e0b'; // green if safe, orange if running
  }
  
  if (strikerEl) {
    strikerEl.setAttribute('cy', batsmen.batsman1Y);
    strikerEl.setAttribute('fill', strikerFill);
  }
  if (nonStrikerEl) {
    nonStrikerEl.setAttribute('cy', batsmen.batsman2Y);
    nonStrikerEl.setAttribute('fill', nonStrikerFill);
  }
  if (bowlerEl) {
    bowlerEl.setAttribute('cy', (bowlingDirection === 1) ? 115 : 335);
    bowlerEl.setAttribute('fill', bowlerFill);
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
  
  // Set bowler style based on the bowler's type (Spin -> Off-spin, Fast -> Fast-medium)
  const bowlerType = BOWLER_TYPES[currentBowler.name] || "Fast";
  overBowlerStyle = (bowlerType === "Spin") ? "Off-spin" : "Fast-medium";
  
  resetPlayState();
  
  gameState = 'BOWLING';
  ball.state = 'BOWLED';
  ball.x = 225;
  ball.y = (bowlingDirection === 1) ? 115 : 335;

  // Visual sweet spot shifting in gauge
  const sweetSpot = document.getElementById('timing-sweet-spot');
  const earlyZone = document.getElementById('timing-early-zone');
  const lateZone = document.getElementById('timing-late-zone');
  const indicator = document.getElementById('timing-indicator');
  
  if (sweetSpot && earlyZone && lateZone) {
    if (bowlingDirection === 1) {
      sweetSpot.setAttribute('y', '190');
      earlyZone.setAttribute('y', '170');
      lateZone.setAttribute('y', '230');
    } else {
      sweetSpot.setAttribute('y', '20');
      earlyZone.setAttribute('y', '60');
      lateZone.setAttribute('y', '5');
    }
  }
  if (indicator) {
    indicator.style.opacity = '1';
    indicator.setAttribute('cy', bowlingDirection === 1 ? '10' : '240');
  }
  
  playSfx('bowl');
  generateBowlingSpeed();
  
  cricketHitBtn.textContent = 'HIT 🏏';
  cricketHitBtn.disabled = false;
  cricketHitBtn.style.opacity = '1';
  cricketMessage.className = 'message-container hidden';
  
  gameLoopActive = true;
  gameLoopId = requestAnimationFrame(gameLoop);
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
    
    // Hide the timing indicator gauge dot
    const indicator = document.getElementById('timing-indicator');
    if (indicator) {
      indicator.style.opacity = '0';
    }

    // Precise skill-based timing zone calculation
    const creasePoint = (bowlingDirection === 1) ? 305 : 145;
    const diff = Math.abs(ball.y - creasePoint);
    
    let timingQuality = "POOR";
    let timingMsg = "Timing: POOR! ❌";
    let messageType = "error";
    
    if (diff <= 8) {
      timingQuality = "PERFECT";
      timingMsg = "Timing: PERFECT! 💥";
      messageType = "success";
    } else if (diff <= 16) {
      timingQuality = "GOOD";
      timingMsg = "Timing: GOOD! 🏏";
      messageType = "success";
    } else if (diff <= 24) {
      timingQuality = "DECENT";
      timingMsg = "Timing: DECENT! ⚾";
      messageType = "warning";
    }
    
    showCricketMessage(timingMsg, messageType);
    playSfx(timingQuality === "POOR" ? 'fail' : 'hit');
    
    const speedVal = document.getElementById('cricket-speed-val');
    if (speedVal) {
      let color = timingQuality === "PERFECT" ? "var(--success-color)" : 
                  timingQuality === "GOOD" ? "#60a5fa" : 
                  timingQuality === "DECENT" ? "var(--warning-color)" : "var(--error-color)";
      speedVal.innerHTML += ` | Timing: <span style="color: ${color}; font-weight: bold;">${timingQuality}</span>`;
    }
    
    const batEl = document.getElementById('cricket-bat');
    if (batEl) {
      batEl.style.transform = 'rotate(-75deg)';
    }

    // Direct client-side physical outcome calculation (instant, lag-free)
    let result = 0; // 0, 1, 2, 3, 4, 6, 'W'
    let isWicket = false;
    let runMessage = "";
    
    if (timingQuality === "PERFECT") {
      const r = Math.random();
      if (r < 0.40) {
        result = 6;
        runMessage = "SIX! Clear over the boundary ropes!";
      } else if (r < 0.75) {
        result = 4;
        runMessage = "FOUR! Pierces the fielders beautifully!";
      } else if (r < 0.90) {
        result = 2;
        runMessage = "Runs: 2. Played gently into the outfield.";
      } else {
        result = 1;
        runMessage = "Runs: 1. Pushed to mid-off for a single.";
      }
    } 
    else if (timingQuality === "GOOD") {
      const r = Math.random();
      if (r < 0.15) {
        result = 4;
        runMessage = "FOUR! Shouts of catch but it beats the fielder!";
      } else if (r < 0.50) {
        result = 2;
        runMessage = "Runs: 2. Batsmen running hard.";
      } else if (r < 0.85) {
        result = 1;
        runMessage = "Runs: 1. Played down the ground.";
      } else {
        result = 'W';
        isWicket = true;
        runMessage = "OUT! Sliced high and caught in the deep!";
      }
    } 
    else if (timingQuality === "DECENT") {
      const r = Math.random();
      if (r < 0.10) {
        result = 2;
        runMessage = "Runs: 2. Misfield allows an extra single.";
      } else if (r < 0.55) {
        result = 1;
        runMessage = "Runs: 1. Batsman turns it away for a single.";
      } else if (r < 0.80) {
        result = 0;
        runMessage = "Dot ball. Clean stop by the cover fielder.";
      } else {
        result = 'W';
        isWicket = true;
        runMessage = "OUT! Leading edge, caught by the bowler!";
      }
    } 
    else { // POOR
      const r = Math.random();
      if (r < 0.10) {
        result = 1;
        runMessage = "Runs: 1. Thick edge runs away.";
      } else if (r < 0.65) {
        result = 0;
        runMessage = "Dot ball. Beaten completely by pace.";
      } else {
        result = 'W';
        isWicket = true;
        runMessage = "OUT! Played on! Dragged onto the stumps!";
      }
    }
    
    // Build new state
    let nextState = { ...cricketState };
    if (!isTestMatch) {
      nextState.balls_faced++;
      if (isWicket) {
        nextState.wickets++;
      } else {
        nextState.runs += result;
      }
    }
    
    const outcomeRes = {
      state: nextState,
      message: runMessage,
      result: result,
      timing: timingQuality
    };
    
    setTimeout(() => {
      processHitResponse(outcomeRes);
    }, 150);
  } else {
    gameState = 'PLAYING';
    cricketHitBtn.disabled = true;
    cricketHitBtn.style.opacity = '0.5';
    cricketHitBtn.textContent = 'IN PLAY';
    
    // Hide the timing indicator gauge dot on miss
    const indicator = document.getElementById('timing-indicator');
    if (indicator) {
      indicator.style.opacity = '0';
    }

    let diff = (bowlingDirection === 1) ? (ball.y - 305) : (145 - ball.y);
    let timingMsg = diff < 0 ? "Timing: TOO EARLY! ❌" : "Timing: TOO LATE! ❌";
    showCricketMessage(timingMsg, 'error');
    playSfx('fail');
    
    const speedVal = document.getElementById('cricket-speed-val');
    if (speedVal) {
      speedVal.innerHTML += ` | Timing: <span style="color: var(--error-color); font-weight: bold;">${diff < 0 ? 'EARLY' : 'LATE'}</span>`;
    }
    
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
  const result = res.result;
  
  ball.state = 'HIT';
  
  let angleDeg = (Math.random() - 0.5) * 130;
  let angleRad = (angleDeg * Math.PI) / 180;
  
  // Custom commentary text output
  let commentaryType = '';
  if (result === 'W') commentaryType = 'wicket';
  else if (result === 4 || result === 6) commentaryType = 'boundary';
  
  let finalOutcomeSymbol = result;
  if (result === 'W') {
    finalOutcomeSymbol = 'W_CAUGHT'; // for commentary selection
  }
  addCommentary(getProceduralCommentary(finalOutcomeSymbol, ballSpeedKmh, ballStyle), commentaryType);

  if (isTestMatch) {
    if (result === 6) {
      let speed = 6.8 + Math.random() * 1.2;
      ball.vx = Math.sin(angleRad) * speed;
      ball.vy = -bowlingDirection * Math.cos(angleRad) * speed;
      ball.loft = true;
      ball.loftDuration = 55;
      ball.loftProgress = 0;
      ball.maxLoftHeight = 35;
      
      batsmen.isRunning = false;
      batsmen.completedRuns = 0;
    } 
    else if (result === 4) {
      let speed = 5.2 + Math.random() * 0.8;
      ball.vx = Math.sin(angleRad) * speed;
      ball.vy = -bowlingDirection * Math.cos(angleRad) * speed;
      ball.loft = false;
      
      batsmen.isRunning = false;
      batsmen.completedRuns = 0;
    }
    else if (result === 'W') {
      let isCaught = Math.random() < 0.65;
      if (isCaught) {
        let targetFielder = fielders[1 + Math.floor(Math.random() * (fielders.length - 1))];
        let dx = targetFielder.x - ball.x;
        let dy = targetFielder.y - ball.y;
        
        let flightFrames = 50;
        ball.vx = dx / flightFrames;
        ball.vy = dy / flightFrames;
        ball.loft = true;
        ball.loftDuration = flightFrames;
        ball.loftProgress = 0;
        ball.maxLoftHeight = 25;
        
        selectActiveFielder();
        
        batsmen.isRunning = false;
        batsmen.completedRuns = 0;
      } else {
        // Drop catch, play normal hit, they can run!
        let speed = 3.2;
        ball.vx = Math.sin(angleRad) * speed;
        ball.vy = -bowlingDirection * Math.cos(angleRad) * speed;
        ball.loft = false;
        
        selectActiveFielder();
        
        batsmen.isRunning = false;
        batsmen.completedRuns = 0;
        batsmen.speed = 2.45;
        showCricketMessage("Dropped catch! Press W to run, S to return.", 'success');
        addCommentary("Dropped catch! The fielder fumbles it in the field!");
      }
    }
    else {
      let speed = result === 0 ? 2.8 : 3.5;
      let targetFielder = fielders[1 + Math.floor(Math.random() * (fielders.length - 1))];
      let dx = targetFielder.x - ball.x;
      let dy = targetFielder.y - ball.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      
      if (result === 0) {
        ball.vx = (dx / dist) * speed;
        ball.vy = (dy / dist) * speed;
      } else {
        ball.vx = Math.sin(angleRad) * speed;
        ball.vy = -bowlingDirection * Math.cos(angleRad) * speed;
      }
      ball.loft = false;
      
      selectActiveFielder();
      
      batsmen.isRunning = false;
      batsmen.completedRuns = 0;
      batsmen.speed = 2.45;
      showCricketMessage("Hit! Press W to run, S to return.", 'success');
    }
  } else {
    // Limited overs Mini Cricket
    if (result === 6) {
      let speed = 6.8 + Math.random() * 1.2;
      ball.vx = Math.sin(angleRad) * speed;
      ball.vy = -bowlingDirection * Math.cos(angleRad) * speed;
      ball.loft = true;
      ball.loftDuration = 55;
      ball.loftProgress = 0;
      ball.maxLoftHeight = 35;
    } 
    else if (result === 4) {
      let speed = 5.2 + Math.random() * 0.8;
      ball.vx = Math.sin(angleRad) * speed;
      ball.vy = -bowlingDirection * Math.cos(angleRad) * speed;
      ball.loft = false;
    }
    else if (result === 0) {
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
    else if (result === 'W') {
      let isCaught = Math.random() < 0.65;
      if (isCaught) {
        let targetFielder = fielders[1 + Math.floor(Math.random() * (fielders.length - 1))];
        let dx = targetFielder.x - ball.x;
        let dy = targetFielder.y - ball.y;
        
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
    else { // run runs
      let speed = 3.5;
      ball.vx = Math.sin(angleRad) * speed;
      ball.vy = -bowlingDirection * Math.cos(angleRad) * speed;
      ball.loft = false;
      
      selectActiveFielder();
      
      batsmen.isRunning = true;
      batsmen.speed = 2.45;
      batsmen.completedRuns = 0;
      batsmen.targetRuns = result;
      batsmen.target1Y = (batsmen.batsman1Y === 305) ? 145 : 305;
      batsmen.target2Y = (batsmen.batsman2Y === 305) ? 145 : 305;
    }
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

function triggerFloatingRuns(runCount) {
  const floatingText = document.getElementById('runs-completed-text');
  if (floatingText) {
    floatingText.textContent = `+${runCount} Run${runCount > 1 ? 's' : ''}`;
    floatingText.style.opacity = '1';
    floatingText.setAttribute('y', '240');
    
    let opacity = 1.0;
    let textY = 240;
    let animId = setInterval(() => {
      textY -= 1.5;
      opacity -= 0.05;
      floatingText.setAttribute('y', textY);
      floatingText.style.opacity = opacity;
      if (opacity <= 0) {
        clearInterval(animId);
        floatingText.style.opacity = '0';
      }
    }, 30);
  }
}

function gameLoop() {
  if (!gameLoopActive) return;

  if (ball.state === 'BOWLED') {
    if (bowlingDirection === 1) {
      ball.y += currentBallSpeedY;
      
      // Dynamic swing/spin physics
      if (ballStyle === "Off-spin") {
        if (!hasBounced && ball.y >= bouncePointY) {
          hasBounced = true;
          currentBallSpeedX = spinBreakDirection * (0.8 + Math.random() * 0.6);
          playSfx('click'); // bounce sound
        }
      } else {
        currentBallSpeedX += Math.sin(ball.y / 25) * 0.05;
      }
      ball.x += currentBallSpeedX;

      if (ball.y >= 315) {
        ball.y = 315;
        ball.state = 'DEAD';
        handleMissOutcome();
      }
    } else {
      ball.y -= currentBallSpeedY;
      
      if (ballStyle === "Off-spin") {
        if (!hasBounced && ball.y <= bouncePointY) {
          hasBounced = true;
          currentBallSpeedX = spinBreakDirection * (0.8 + Math.random() * 0.6);
          playSfx('click'); // bounce sound
        }
      } else {
        currentBallSpeedX += Math.sin((450 - ball.y) / 25) * 0.05;
      }
      ball.x += currentBallSpeedX;

      if (ball.y <= 135) {
        ball.y = 135;
        ball.state = 'DEAD';
        handleMissOutcome();
      }
    }
    
    // Update timing indicator dot in SVG gauge
    const indicator = document.getElementById('timing-indicator');
    if (indicator) {
      let gy = ((ball.y - 115) / 220) * 250;
      indicator.setAttribute('cy', gy);
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

  // Update all fielders
  fielders.forEach(f => {
    f.update(ball.x, ball.y, f === activeFielder);
  });

  if (activeFielder) {
    
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
      if (isTestMatch) {
        if (batsmen.target1Y !== batsmen.start1Y) {
          batsmen.completedRuns++;
          playSfx('click');
          batsmen.start1Y = batsmen.target1Y;
          batsmen.start2Y = batsmen.target2Y;
          showCricketMessage(`Completed ${batsmen.completedRuns} run(s). Press W to run another or stay safe!`, 'success');
          triggerFloatingRuns(batsmen.completedRuns);
        } else {
          showCricketMessage(`Returned to crease safely. Total runs: ${batsmen.completedRuns}`, 'warning');
        }
        batsmen.isRunning = false;
        updateCricketUI();
      } else {
        batsmen.completedRuns++;
        triggerFloatingRuns(batsmen.completedRuns);
        
        let temp = batsmen.target1Y;
        batsmen.target1Y = batsmen.target2Y;
        batsmen.target2Y = temp;
        
        if (batsmen.completedRuns >= batsmen.targetRuns) {
          batsmen.isRunning = false;
          handleSafeRuns();
        }
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
  if (isTestMatch) {
    cricketState.runs += runs;
    cricketState.balls_faced++;
    showCricketMessage(runs === 6 ? "SIX! What a shot! 💥" : "FOUR! Beautiful boundary! 🏏", 'success');
  } else if (currentShotOutcome) {
    cricketState = currentShotOutcome.state;
    showCricketMessage(currentShotOutcome.message, 'success');
  }

  // Update stats
  if (batter1 && batter2 && currentBowler) {
    let activeBatter = (strikerOnStrike === 1) ? batter1 : batter2;
    activeBatter.runs += runs;
    activeBatter.balls++;
    if (runs === 4) {
      activeBatter.fours = (activeBatter.fours || 0) + 1;
    } else if (runs === 6) {
      activeBatter.sixes = (activeBatter.sixes || 0) + 1;
    }
    currentBowler.balls++;
    currentBowler.runs += runs;
    checkMilestonesAndPartnerships(runs);
  }

  ballOutcomesHistory.push(runs);
  addCommentary(getProceduralCommentary(runs, ballSpeedKmh, ballStyle), 'boundary');
  triggerBoundaryFlash();
  playSfx('boundary');
  finishDelivery();
}

function handleCaughtOut() {
  if (isTestMatch) {
    cricketState.wickets++;
    cricketState.balls_faced++;
    showCricketMessage("OUT! Caught! What a catch! 🛑", 'error');
  } else if (currentShotOutcome) {
    cricketState = currentShotOutcome.state;
    showCricketMessage(currentShotOutcome.message, 'error');
  }

  // Update stats
  if (batter1 && batter2 && currentBowler) {
    let activeBatter = (strikerOnStrike === 1) ? batter1 : batter2;
    activeBatter.balls++;
    currentBowler.balls++;
    currentBowler.wickets++;
    replaceOutBatter(strikerOnStrike);
  }

  ballOutcomesHistory.push('W');
  addCommentary(getProceduralCommentary('W_CAUGHT', ballSpeedKmh, ballStyle), 'wicket');
  playSfx('out');
  finishDelivery();
}

function handleSafeRunsTest() {
  cricketState.runs += batsmen.completedRuns;
  cricketState.balls_faced++;
  ballOutcomesHistory.push(batsmen.completedRuns);
  
  // Update stats
  if (batter1 && batter2 && currentBowler) {
    let activeBatter = (strikerOnStrike === 1) ? batter1 : batter2;
    activeBatter.runs += batsmen.completedRuns;
    activeBatter.balls++;
    currentBowler.balls++;
    currentBowler.runs += batsmen.completedRuns;
    checkMilestonesAndPartnerships(batsmen.completedRuns);
    if (batsmen.completedRuns % 2 !== 0) {
      strikerOnStrike = (strikerOnStrike === 1) ? 2 : 1;
    }
  }

  if (batsmen.completedRuns === 0) {
    showCricketMessage("Dot ball.", 'warning');
    addCommentary(getCommentaryDot(ballStyle), 'dot');
    playSfx('fail');
  } else {
    showCricketMessage(`Safe! You scored ${batsmen.completedRuns} run(s).`, 'success');
    addCommentary(`Safe! The batsmen complete ${batsmen.completedRuns} run(s) with excellent running.`);
    playSfx('success');
  }
  finishDelivery();
}

function handleSafeRuns() {
  let lastOutcome = 0;
  if (currentShotOutcome) {
    cricketState = currentShotOutcome.state;
    const isDot = currentShotOutcome.message.includes('Dot');
    showCricketMessage(currentShotOutcome.message, isDot ? 'warning' : 'success');
    
    if (isDot) {
      lastOutcome = 0;
      addCommentary(getCommentaryDot(ballStyle), 'dot');
      playSfx('fail');
    } else {
      let runMatch = currentShotOutcome.message.match(/\d+/);
      lastOutcome = runMatch ? parseInt(runMatch[0], 10) : 1;
      addCommentary(getProceduralCommentary(lastOutcome, ballSpeedKmh, ballStyle));
      playSfx('success');
    }
  }

  // Update stats
  if (batter1 && batter2 && currentBowler) {
    let activeBatter = (strikerOnStrike === 1) ? batter1 : batter2;
    activeBatter.runs += lastOutcome;
    activeBatter.balls++;
    currentBowler.balls++;
    currentBowler.runs += lastOutcome;
    checkMilestonesAndPartnerships(lastOutcome);
    if (lastOutcome % 2 !== 0) {
      strikerOnStrike = (strikerOnStrike === 1) ? 2 : 1;
    }
  }

  ballOutcomesHistory.push(lastOutcome);
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
    let outBatterNum = 1;
    if (ball.targetY === STUMPS_STRIKER.y) {
      if (batsmen.target1Y === 305 && batsmen.batsman1Y < 300) outBatterNum = 1;
      if (batsmen.target2Y === 305 && batsmen.batsman2Y < 300) outBatterNum = 2;
    } else {
      if (batsmen.target1Y === 145 && batsmen.batsman1Y > 150) outBatterNum = 1;
      if (batsmen.target2Y === 145 && batsmen.batsman2Y > 150) outBatterNum = 2;
    }

    if (isTestMatch) {
      cricketState.wickets++;
      cricketState.runs += batsmen.completedRuns;
      cricketState.balls_faced++;
      showCricketMessage("OUT! Run out at the wickets! 🛑", 'error');
    } else if (currentShotOutcome) {
      cricketState = { ...currentShotOutcome.state };
      cricketState.wickets++;
      let targetRuns = batsmen.targetRuns;
      let prevRuns = currentShotOutcome.state.runs - targetRuns;
      cricketState.runs = prevRuns + batsmen.completedRuns;
    } else {
      cricketState.wickets++;
      cricketState.balls_faced++;
    }

    // Update stats
    if (batter1 && batter2 && currentBowler) {
      let activeBatter = (strikerOnStrike === 1) ? batter1 : batter2;
      activeBatter.runs += batsmen.completedRuns;
      activeBatter.balls++;
      currentBowler.balls++;
      currentBowler.runs += batsmen.completedRuns;
      checkMilestonesAndPartnerships(batsmen.completedRuns);
      
      replaceOutBatter(outBatterNum);
      
      if (batsmen.completedRuns % 2 !== 0) {
        strikerOnStrike = (strikerOnStrike === 1) ? 2 : 1;
      }
    }

    ballOutcomesHistory.push('W');
    addCommentary(getProceduralCommentary('W_RUNOUT', ballSpeedKmh, ballStyle), 'wicket');
    playSfx('out');
    finishDelivery();
  } else {
    if (isTestMatch) {
      handleSafeRunsTest();
    } else {
      handleSafeRuns();
    }
  }
}

function handleMissOutcome() {
  gameLoopActive = false;
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  
  // Fairer bowled penalty on miss: 15% for spin, 20% for fast
  const bowledRate = (ballStyle === "Off-spin") ? 0.15 : 0.20;
  let isBowled = Math.random() < bowledRate;
  
  if (isBowled) {
    cricketState.wickets++;
    cricketState.balls_faced++;
    ballOutcomesHistory.push('W');
    showCricketMessage("OUT! Bowled! Clean bowled! 🛑", 'error');
    addCommentary(getCommentaryBowled(ballSpeedKmh, ballStyle), 'wicket');
    playSfx('out');

    if (batter1 && batter2 && currentBowler) {
      let activeBatter = (strikerOnStrike === 1) ? batter1 : batter2;
      activeBatter.balls++;
      currentBowler.balls++;
      currentBowler.wickets++;
      replaceOutBatter(strikerOnStrike);
    }
  } else {
    cricketState.balls_faced++;
    ballOutcomesHistory.push(0);
    showCricketMessage("Dot ball. Good bowling.", 'warning');
    addCommentary(getCommentaryDot(ballStyle), 'dot');
    playSfx('fail');

    if (batter1 && batter2 && currentBowler) {
      let activeBatter = (strikerOnStrike === 1) ? batter1 : batter2;
      activeBatter.balls++;
      currentBowler.balls++;
    }
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
  if (isBeginningModalOpen()) return;
  if (isMilestoneCelebrating) return;
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
  
  updateOverHistoryUI();
  
  const gameOverCondition = isTestMatch ? (cricketState.wickets >= 10) : (cricketState.wickets >= 10 || cricketState.balls_faced >= cricketState.max_balls);
  
  if (gameOverCondition) {
    cricketState.game_over = true;
    cricketHitBtn.disabled = true;
    cricketHitBtn.style.opacity = '0.5';
    cricketHitBtn.textContent = 'GAME OVER';
    cricketRestartBtn.classList.remove('hidden');
    cricketRestartBtn.focus();
    
    let endMsg = cricketState.wickets >= 10 ? " ALL OUT!" : " Innings over!";
    showCricketMessage(`Match Over! You scored ${cricketState.runs}/${cricketState.wickets}.${endMsg}`, 'success');
    playSfx('success');
    
    // Save Cricket Stats
    if (isTestMatch) {
      gameStats.cricketTest.gamesPlayed++;
      if (cricketState.runs > gameStats.cricketTest.highRun) {
        gameStats.cricketTest.highRun = cricketState.runs;
      }
    } else {
      gameStats.cricket.gamesPlayed++;
      if (cricketState.runs > gameStats.cricket.highRun) {
        gameStats.cricket.highRun = cricketState.runs;
      }
    }
    saveStats();
    recordMatchStats();
    showPostMatchScorecard();
  } else {
    if (isMilestoneCelebrating) {
      if (cricketHitBtn) {
        cricketHitBtn.disabled = true;
        cricketHitBtn.textContent = '👏 CELEBRATING';
        cricketHitBtn.style.opacity = '0.7';
      }
      
      if (isAutoBowlingTimeout) {
        clearTimeout(isAutoBowlingTimeout);
        isAutoBowlingTimeout = null;
      }
      
      const overEnd = cricketState.balls_faced > 0 && cricketState.balls_faced % 6 === 0;
      if (overEnd) {
        strikerOnStrike = (strikerOnStrike === 1) ? 2 : 1;
        const remainingBowlers = bowlersList.filter(name => name !== currentBowler.name);
        let nextBowlerName = "";
        if (remainingBowlers.length > 0) {
          let totalWeight = 0;
          remainingBowlers.forEach(name => {
            totalWeight += BOWLER_WEIGHTS[name] || 3;
          });
          let rand = Math.random() * totalWeight;
          let cumulativeWeight = 0;
          for (let i = 0; i < remainingBowlers.length; i++) {
            const name = remainingBowlers[i];
            cumulativeWeight += BOWLER_WEIGHTS[name] || 3;
            if (rand <= cumulativeWeight) {
              nextBowlerName = name;
              break;
            }
          }
        } else {
          nextBowlerName = bowlersList[0];
        }
        
        if (!bowlerStatsMap[nextBowlerName]) {
          bowlerStatsMap[nextBowlerName] = { name: nextBowlerName, balls: 0, runs: 0, wickets: 0 };
        }
        currentBowler = bowlerStatsMap[nextBowlerName];
        addCommentary(`${nextBowlerName} comes on to bowl the new over from the opposite end.`, 'system');
      }
    } else {
      if (cricketHitBtn) {
        cricketHitBtn.disabled = false;
        cricketHitBtn.style.opacity = '1';
        cricketHitBtn.textContent = 'BOWL ⚾';
      }
      
      if (isAutoBowlingTimeout) {
        clearTimeout(isAutoBowlingTimeout);
        isAutoBowlingTimeout = null;
      }
      
      const overEnd = cricketState.balls_faced > 0 && cricketState.balls_faced % 6 === 0;
      
      if (overEnd) {
        strikerOnStrike = (strikerOnStrike === 1) ? 2 : 1;
        const remainingBowlers = bowlersList.filter(name => name !== currentBowler.name);
        let nextBowlerName = "";
        if (remainingBowlers.length > 0) {
          let totalWeight = 0;
          remainingBowlers.forEach(name => {
            totalWeight += BOWLER_WEIGHTS[name] || 3;
          });
          let rand = Math.random() * totalWeight;
          let cumulativeWeight = 0;
          for (let i = 0; i < remainingBowlers.length; i++) {
            const name = remainingBowlers[i];
            cumulativeWeight += BOWLER_WEIGHTS[name] || 3;
            if (rand <= cumulativeWeight) {
              nextBowlerName = name;
              break;
            }
          }
        } else {
          nextBowlerName = bowlersList[0];
        }
        
        if (!bowlerStatsMap[nextBowlerName]) {
          bowlerStatsMap[nextBowlerName] = { name: nextBowlerName, balls: 0, runs: 0, wickets: 0 };
        }
        currentBowler = bowlerStatsMap[nextBowlerName];
        addCommentary(`${nextBowlerName} comes on to bowl the new over from the opposite end.`, 'system');
      }

      const msg = overEnd ? "Over complete! Changing ends... next ball in 3s 🔄" : "Preparing next delivery... next ball in 2.5s ⚾";
      showCricketMessage(msg, overEnd ? 'success' : 'warning');
      
      isAutoBowlingTimeout = setTimeout(() => {
        bowlBall();
      }, overEnd ? 3000 : 2500);
    }
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
  loadStats();
  
  // Exit fullscreen and reset body active class
  document.body.classList.remove('test-match-active');
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(err => console.warn(err));
  }
  
  mainMenu.classList.remove('hidden');
  numberGuessGame.classList.add('hidden');
  hangmanGameView.classList.add('hidden');
  if (cricketGameView) cricketGameView.classList.add('hidden');
  if (cricketScorecardModal) cricketScorecardModal.classList.add('hidden');
  if (cricketPlayingXiModal) cricketPlayingXiModal.classList.add('hidden');
}

function showGame(gameId) {
  playSfx('click');
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
  
  // Clean up fullscreen state before entering other games
  document.body.classList.remove('test-match-active');
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(err => console.warn(err));
  }
  
  if (gameId === 'number-guess') {
    numberGuessGame.classList.remove('hidden');
    initGame();
  } else if (gameId === 'hangman') {
    hangmanGameView.classList.remove('hidden');
    initHangman();
  } else if (gameId === 'mini-cricket') {
    isTestMatch = false;
    cricketGameView.classList.remove('hidden');
    initCricket();
  } else if (gameId === 'cricket-test') {
    isTestMatch = true;
    document.body.classList.add('test-match-active');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => console.warn(err));
    }
    cricketGameView.classList.remove('hidden');
    initCricket();
  }
}

function initGame() {
  secretNumber = Math.floor(Math.random() * 100) + 1;
  attempts = 0;
  isGameOver = false;
  guessHistory = [];
  
  // Reset UI
  updateAttempts();
  guessInput.value = '';
  guessInput.disabled = false;
  submitBtn.disabled = false;
  submitBtn.style.opacity = '1';
  
  messageContainer.className = 'message-container hidden';
  messageContainer.innerHTML = '';
  
  const historyContainer = document.getElementById('guess-history-container');
  const historyChips = document.getElementById('guess-history-chips');
  if (historyContainer && historyChips) {
    historyContainer.classList.add('hidden');
    historyChips.innerHTML = '';
  }
  
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
    playSfx('fail');
    return;
  }
  
  const guess = parseInt(guessValue, 10);
  
  if (isNaN(guess)) {
    showMessage('Invalid input! Please enter a whole number.', 'error');
    playSfx('fail');
    return;
  }
  
  if (guess < 1 || guess > 100) {
    showMessage('Out of bounds! Please guess a number between 1 and 100.', 'warning');
    playSfx('fail');
    return;
  }
  
  attempts++;
  updateAttempts();
  
  let diff = Math.abs(guess - secretNumber);
  let chipClass = '';
  let direction = '';
  
  if (guess < secretNumber) {
    direction = '↑';
    chipClass = diff <= 10 ? 'close' : 'low';
    showMessage('Too low! Try again.', 'warning');
    playSfx('click');
    guessInput.value = '';
    guessInput.focus();
  } else if (guess > secretNumber) {
    direction = '↓';
    chipClass = diff <= 10 ? 'close' : 'high';
    showMessage('Too high! Try again.', 'warning');
    playSfx('click');
    guessInput.value = '';
    guessInput.focus();
  } else {
    direction = '🎉';
    chipClass = 'correct';
    
    // Game Won
    isGameOver = true;
    showMessage(`🎉 Congratulations!<br/>You guessed the number ${secretNumber} correctly!`, 'success');
    playSfx('success');
    
    // Disable inputs
    guessInput.disabled = true;
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    
    // Update Stats
    gameStats.numberGuess.gamesPlayed++;
    if (gameStats.numberGuess.bestScore === null || attempts < gameStats.numberGuess.bestScore) {
      gameStats.numberGuess.bestScore = attempts;
    }
    saveStats();
    
    // Show restart button
    restartBtn.classList.remove('hidden');
    restartBtn.focus();
  }
  
  // Append to guess timeline
  const historyContainer = document.getElementById('guess-history-container');
  const historyChips = document.getElementById('guess-history-chips');
  if (historyContainer && historyChips) {
    historyContainer.classList.remove('hidden');
    const chip = document.createElement('div');
    chip.className = `history-chip ${chipClass}`;
    chip.innerHTML = `<span>${guess}</span> <span>${direction}</span>`;
    historyChips.appendChild(chip);
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

function generateHangmanKeyboard() {
  const keyboard = document.getElementById('hangman-keyboard');
  if (!keyboard) return;
  keyboard.innerHTML = '';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  alphabet.forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'key-btn';
    btn.id = `key-${letter}`;
    btn.textContent = letter;
    btn.addEventListener('click', () => {
      handleHangmanLetterGuess(letter);
    });
    keyboard.appendChild(btn);
  });
}

function handleHangmanLetterGuess(letter) {
  if (isHangmanGameOver) return;

  const guess = letter.toUpperCase().trim();

  if (!guess || guess.length !== 1 || !/[A-Z]/.test(guess)) {
    showHangmanMessage('Please enter a valid letter.', 'error');
    return;
  }

  if (guessedLetters.has(guess)) {
    showHangmanMessage('You already guessed that letter.', 'warning');
    playSfx('fail');
    return;
  }

  guessedLetters.add(guess);
  
  const keyBtn = document.getElementById(`key-${guess}`);

  if (currentWord.includes(guess)) {
    if (keyBtn) {
      keyBtn.classList.add('correct-guess');
      keyBtn.disabled = true;
    }
    renderHangmanWord();
    
    // Check win condition
    const isWin = currentWord.split('').every(l => guessedLetters.has(l));
    if (isWin) {
      isHangmanGameOver = true;
      showHangmanMessage('🎉 You won! You guessed the word!', 'success');
      playSfx('success');
      
      // Update statistics
      gameStats.hangman.wins++;
      saveStats();
      
      hangmanInput.disabled = true;
      hangmanSubmitBtn.disabled = true;
      hangmanSubmitBtn.style.opacity = '0.5';
      hangmanRestartBtn.classList.remove('hidden');
      hangmanRestartBtn.focus();
      
      disableAllKeyboardKeys();
    } else {
      showHangmanMessage('Good guess!', 'success');
      playSfx('click');
    }
  } else {
    if (keyBtn) {
      keyBtn.classList.add('wrong-guess');
      keyBtn.disabled = true;
    }
    wrongGuesses++;
    hangmanWrongCount.textContent = wrongGuesses;
    
    if (hangmanParts[wrongGuesses - 1]) {
      hangmanParts[wrongGuesses - 1].classList.remove('hide-part');
      hangmanParts[wrongGuesses - 1].classList.add('show-part');
    }

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
      playSfx('out');
      
      // Update statistics
      gameStats.hangman.losses++;
      saveStats();
      
      hangmanInput.disabled = true;
      hangmanSubmitBtn.disabled = true;
      hangmanSubmitBtn.style.opacity = '0.5';
      hangmanRestartBtn.classList.remove('hidden');
      hangmanRestartBtn.focus();
      
      disableAllKeyboardKeys();
    } else {
      showHangmanMessage('Incorrect guess!', 'warning');
      playSfx('fail');
    }
  }
}

function disableAllKeyboardKeys() {
  const keys = document.querySelectorAll('.key-btn');
  keys.forEach(k => k.disabled = true);
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
    if (part) {
      part.classList.remove('show-part');
      part.classList.add('hide-part');
    }
  });

  generateHangmanKeyboard();
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
  if (guess) {
    handleHangmanLetterGuess(guess);
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
if (cricketStartMatchBtn) cricketStartMatchBtn.addEventListener('click', startMatchWithSelectedTeams);
if (cricketPlayingXiContinueBtn) {
  cricketPlayingXiContinueBtn.addEventListener('click', () => {
    if (cricketPlayingXiModal) {
      cricketPlayingXiModal.classList.add('hidden');
    }
    if (cricketHowToPlayModal) {
      cricketHowToPlayModal.classList.remove('hidden');
    }
  });
}
if (cricketCloseScorecardBtn) {
  cricketCloseScorecardBtn.addEventListener('click', () => {
    if (cricketScorecardModal) {
      cricketScorecardModal.classList.add('hidden');
    }
  });
}
if (scorecardTabBatting && scorecardTabBowling && scorecardSectionBatting && scorecardSectionBowling) {
  scorecardTabBatting.addEventListener('click', () => {
    scorecardTabBatting.classList.add('active');
    scorecardTabBowling.classList.remove('active');
    scorecardSectionBatting.classList.remove('hidden');
    scorecardSectionBowling.classList.add('hidden');
  });
  scorecardTabBowling.addEventListener('click', () => {
    scorecardTabBowling.classList.add('active');
    scorecardTabBatting.classList.remove('active');
    scorecardSectionBowling.classList.remove('hidden');
    scorecardSectionBatting.classList.add('hidden');
  });
}
if (cricketCloseHelpBtn) {
  cricketCloseHelpBtn.addEventListener('click', () => {
    if (cricketHowToPlayModal) {
      cricketHowToPlayModal.classList.add('hidden');
    }
    showCricketMessage("Press ENTER to start the match! 🏏", "warning");
  });
}

// ===== CUSTOM DROPDOWN TEAM SELECTION LOGIC =====
function setupTeamDropdown(dropdownId, optionsId, selectId, flagId, nameId) {
  const container = document.getElementById(dropdownId);
  const optionsPanel = document.getElementById(optionsId);
  const hiddenSelect = document.getElementById(selectId);
  const flagEl = document.getElementById(flagId);
  const nameEl = document.getElementById(nameId);
  if (!container || !optionsPanel) return;

  const trigger = container.querySelector('.team-select-trigger');

  // Toggle open
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close any other open dropdowns
    document.querySelectorAll('.team-custom-select.open').forEach(el => {
      if (el !== container) el.classList.remove('open');
    });
    container.classList.toggle('open');
  });

  // Select option
  optionsPanel.querySelectorAll('.team-select-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      if (opt.classList.contains('disabled-option')) return;

      const val = opt.getAttribute('data-value');
      const flag = opt.getAttribute('data-flag');
      const name = opt.getAttribute('data-name');

      // Update trigger display
      if (flagEl) flagEl.textContent = flag;
      if (nameEl) nameEl.textContent = name;

      // Update hidden select
      if (hiddenSelect) hiddenSelect.value = val;

      // Mark selected
      optionsPanel.querySelectorAll('.team-select-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');

      // Close dropdown
      container.classList.remove('open');

      // Clear error if now valid
      const errorEl = document.getElementById('team-select-error');
      const otherVal = selectId === 'cricket-user-team'
        ? document.getElementById('cricket-opp-team')?.value
        : document.getElementById('cricket-user-team')?.value;
      if (errorEl && val !== otherVal) errorEl.classList.add('hidden');

      updateTeamCardCrossHighlight();
    });
  });
}

// Init both dropdowns
setupTeamDropdown('user-team-dropdown', 'user-team-options', 'cricket-user-team', 'user-select-flag', 'user-select-name');
setupTeamDropdown('opp-team-dropdown', 'opp-team-options', 'cricket-opp-team', 'opp-select-flag', 'opp-select-name');

// Close all dropdowns when clicking outside
document.addEventListener('click', () => {
  document.querySelectorAll('.team-custom-select.open').forEach(el => el.classList.remove('open'));
});

// Initial cross-highlight on load
updateTeamCardCrossHighlight();


window.addEventListener('keydown', (e) => {
  if (cricketGameView && !cricketGameView.classList.contains('hidden')) {
    if (isMilestoneCelebrating) {
      if (e.key === 'Enter' || e.key === '5' || e.code === 'Numpad5' || e.key === 'Clear' || e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 's') {
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'Enter') {
      if (cricketTeamSelectModal && !cricketTeamSelectModal.classList.contains('hidden')) {
        e.preventDefault();
        startMatchWithSelectedTeams();
      } else if (cricketPlayingXiModal && !cricketPlayingXiModal.classList.contains('hidden')) {
        e.preventDefault();
        cricketPlayingXiModal.classList.add('hidden');
        if (cricketHowToPlayModal) {
          cricketHowToPlayModal.classList.remove('hidden');
        }
      } else if (cricketHowToPlayModal && !cricketHowToPlayModal.classList.contains('hidden')) {
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
    } else {
      if (isBeginningModalOpen()) {
        if (e.key === '5' || e.code === 'Numpad5' || e.key === 'Clear' || e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 's') {
          e.preventDefault();
        }
        return;
      }
      if (e.key === '5' || e.code === 'Numpad5' || e.key === 'Clear') {
        if (gameState === 'BOWLING') {
          e.preventDefault();
          attemptHit();
        }
      } else if (e.key.toLowerCase() === 'w') {
        if (isTestMatch && gameState === 'PLAYING' && ball.state !== 'DEAD' && !cricketState.game_over) {
          e.preventDefault();
          startManualRun();
        }
      } else if (e.key.toLowerCase() === 's') {
        if (isTestMatch && gameState === 'PLAYING' && ball.state !== 'DEAD' && !cricketState.game_over) {
          e.preventDefault();
          cancelManualRun();
        }
      }
    }
  }
  else if (hangmanGameView && !hangmanGameView.classList.contains('hidden')) {
    if (e.key === 'Enter' && isHangmanGameOver) {
      e.preventDefault();
      initHangman();
    } else if (!isHangmanGameOver) {
      const key = e.key.toUpperCase();
      if (key.length === 1 && /[A-Z]/.test(key)) {
        e.preventDefault();
        handleHangmanLetterGuess(key);
      }
    }
  }
  else if (numberGuessGame && !numberGuessGame.classList.contains('hidden')) {
    if (e.key === 'Enter' && isGameOver) {
      e.preventDefault();
      initGame();
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
loadStats();

const muteBtn = document.getElementById('mute-btn');
if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    muteBtn.title = isMuted ? 'Unmute Sound' : 'Mute Sound';
  });
}

initGame();

// Player Stats Hover Tooltip Logic
function getPlayerTooltipHTML(name, stats) {
  const normName = normalizePlayerName(name);
  const role = PLAYER_ROLES[normName] || "Batter";
  
  // Dynamic batting calculations
  const batting = stats.batting;
  const batAvg = batting.dismissals > 0 ? (batting.runs / batting.dismissals).toFixed(2) : "-";
  const batSR = batting.balls > 0 ? ((batting.runs / batting.balls) * 100).toFixed(2) : "0.00";
  const highestScoreStr = batting.highestScore + (batting.highestScoreNotOut ? "*" : "");
  
  // Dynamic bowling calculations
  const bowling = stats.bowling;
  const bowlAvg = bowling.wickets > 0 ? (bowling.runsConceded / bowling.wickets).toFixed(2) : "-";
  const bestFiguresStr = bowling.bestWickets > 0 || bowling.bestRuns > 0 ? `${bowling.bestWickets}/${bowling.bestRuns}` : "-";
  
  let roleClass = "batter";
  if (role === "Bowler") roleClass = "bowler";
  else if (role === "All-Rounder") roleClass = "all-rounder";
  else if (role === "Wicketkeeper") roleClass = "wicketkeeper";
  
  let html = `
    <div class="tooltip-header">
      <div class="tooltip-player-name">
        <span>${name}</span>
        <span class="tooltip-player-role ${roleClass}">${role}</span>
      </div>
    </div>
    <div class="tooltip-sections-container">
  `;
  
  // If role is Batter, Wicketkeeper, All-Rounder or Bowler, show Batting Stats
  if (role === "Batter" || role === "Wicketkeeper" || role === "All-Rounder" || role === "Bowler") {
    html += `
      <div>
        <div class="tooltip-section-title">🏏 Batting Career</div>
        <div class="tooltip-grid">
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Innings</span>
            <span class="tooltip-stat-value">${batting.innings}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Runs</span>
            <span class="tooltip-stat-value">${batting.runs}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Average</span>
            <span class="tooltip-stat-value">${batAvg}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">S/R</span>
            <span class="tooltip-stat-value">${batSR}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Fours</span>
            <span class="tooltip-stat-value">${batting.fours}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Sixes</span>
            <span class="tooltip-stat-value">${batting.sixes}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">50s/100s</span>
            <span class="tooltip-stat-value">${batting.fiftyCount}/${batting.hundredCount}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Highest</span>
            <span class="tooltip-stat-value">${highestScoreStr}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  // If role is Bowler or All-Rounder, show Bowling Stats
  if (role === "Bowler" || role === "All-Rounder") {
    html += `
      <div>
        <div class="tooltip-section-title">🔴 Bowling Career</div>
        <div class="tooltip-grid">
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Innings</span>
            <span class="tooltip-stat-value">${bowling.innings}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Wickets</span>
            <span class="tooltip-stat-value">${bowling.wickets}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Balls</span>
            <span class="tooltip-stat-value">${bowling.ballsBowled}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Average</span>
            <span class="tooltip-stat-value">${bowlAvg}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Best</span>
            <span class="tooltip-stat-value">${bestFiguresStr}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  html += `</div>`;
  return html;
}

// Setup document-level event delegation for tooltip hover
document.addEventListener('mouseover', (e) => {
  const target = e.target.closest('.player-name-hoverable');
  if (!target) return;
  
  const playerName = target.getAttribute('data-player-name');
  if (!playerName) return;
  
  const db = loadPlayerStatsDatabase();
  const normName = normalizePlayerName(playerName);
  const stats = db[normName];
  if (!stats) return;
  
  const tooltip = document.getElementById('player-stats-tooltip');
  if (!tooltip) return;
  
  // Render html content
  tooltip.innerHTML = getPlayerTooltipHTML(playerName, stats);
  
  // Position the tooltip
  tooltip.classList.remove('hidden');
  tooltip.style.visibility = 'hidden';
  tooltip.style.display = 'block';
  
  const rect = target.getBoundingClientRect();
  const tooltipHeight = tooltip.offsetHeight || 220;
  
  let x = rect.left + rect.width / 2 - 160; // 160 is half of 320px width
  let y = rect.top - 10 - tooltipHeight;
  
  if (x < 10) x = 10;
  if (x + 320 > window.innerWidth) x = window.innerWidth - 330;
  
  if (y < 10) {
    // Show below the element instead
    y = rect.bottom + 10;
  }
  
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.style.visibility = 'visible';
  tooltip.classList.add('visible');
});

document.addEventListener('mouseout', (e) => {
  const target = e.target.closest('.player-name-hoverable');
  if (!target) return;
  
  const tooltip = document.getElementById('player-stats-tooltip');
  if (!tooltip) return;
  
  tooltip.classList.remove('visible');
  tooltip.classList.add('hidden');
  tooltip.style.left = '-9999px';
  tooltip.style.top = '-9999px';
});
