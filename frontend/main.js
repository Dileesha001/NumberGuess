// Node.js imports for Electron
let execFile;
let pathModule;
let fsModule;
let processModule;
try {
  const req = (typeof window !== 'undefined' && window['require']) ? window['require'] : (typeof globalThis !== 'undefined' && globalThis['require'] ? globalThis['require'] : null);
  if (req) {
    execFile = req('child_process').execFile;
    pathModule = req('path');
    fsModule = req('fs');
    processModule = req('process');
  } else {
    console.warn("Node integration not available (running in web browser)");
  }
} catch (e) {
  console.warn("Node integration not available", e);
}

// Game State
let secretNumber;
let attempts;
let isGameOver;
let guessHistory = [];
let minBound = 1;
let maxBound = 100;

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
let bowlNoiseBuffer = null;

// Mini Cricket Over outcomes history
let ballOutcomesHistory = [];

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    } else {
      console.warn("Web Audio API not supported");
      return;
    }
  }
  if (audioCtx && !bowlNoiseBuffer) {
    try {
      const bufferSize = audioCtx.sampleRate * 0.4;
      bowlNoiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = bowlNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } catch (e) {
      console.error("Failed to generate noise buffer", e);
    }
  }
}

function playSfx(type) {
  if (isMuted) return;
  try {
    initAudio();
    if (!audioCtx) return;
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
        if (!bowlNoiseBuffer) {
          initAudio();
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = bowlNoiseBuffer;
        
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
      if (parsed && typeof parsed === 'object') {
        if (parsed.numberGuess) {
          gameStats.numberGuess = { ...gameStats.numberGuess, ...parsed.numberGuess };
        }
        if (parsed.hangman) {
          gameStats.hangman = { ...gameStats.hangman, ...parsed.hangman };
        }
        if (parsed.cricket) {
          gameStats.cricket = { ...gameStats.cricket, ...parsed.cricket };
        }
        if (parsed.cricketTest) {
          gameStats.cricketTest = { ...gameStats.cricketTest, ...parsed.cricketTest };
        }
      }
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
let cachedPlayerStatsDb = null;

function normalizePlayerName(name) {
  if (name === "Prabath Jayasuriya") return "P. Jayasuriya";
  return name;
}

function loadPlayerStatsDatabase() {
  if (cachedPlayerStatsDb) {
    return cachedPlayerStatsDb;
  }

  let db = {};
  try {
    const stored = localStorage.getItem(DPR_PLAYER_STATS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        db = parsed;
      }
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
  
  cachedPlayerStatsDb = db;
  return db;
}

function savePlayerStatsDatabase(db) {
  cachedPlayerStatsDb = db;
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
  if (statsGuessValEl) {
    statsGuessValEl.textContent = gameStats.numberGuess.bestScore !== null 
      ? `${gameStats.numberGuess.bestScore} att.` 
      : '-';
  }
  if (statsHangmanValEl) {
    const total = gameStats.hangman.wins + gameStats.hangman.losses;
    statsHangmanValEl.textContent = total > 0 
      ? `${gameStats.hangman.wins}W / ${gameStats.hangman.losses}L` 
      : '-';
  }
  if (statsCricketValEl) {
    statsCricketValEl.textContent = gameStats.cricket.highRun > 0 
      ? `${gameStats.cricket.highRun} runs` 
      : '-';
  }
  if (statsTestCricketValEl) {
    statsTestCricketValEl.textContent = (gameStats.cricketTest && gameStats.cricketTest.highRun > 0)
      ? `${gameStats.cricketTest.highRun} runs` 
      : '-';
  }
}

// Hangman State
const hangmanWords = [
  // Fruits
  { word: 'APPLE', category: 'Fruits' },
  { word: 'BANANA', category: 'Fruits' },
  // Animals
  { word: 'ELEPHANT', category: 'Animals' },
  { word: 'GIRAFFE', category: 'Animals' },
  { word: 'KANGAROO', category: 'Animals' },
  { word: 'PANTHER', category: 'Animals' },
  { word: 'CHEETAH', category: 'Animals' },
  { word: 'LEOPARD', category: 'Animals' },
  { word: 'TIGER', category: 'Animals' },
  { word: 'LION', category: 'Animals' },
  { word: 'MONKEY', category: 'Animals' },
  { word: 'GORILLA', category: 'Animals' },
  { word: 'CHIMPANZEE', category: 'Animals' },
  { word: 'ALLIGATOR', category: 'Animals' },
  { word: 'CROCODILE', category: 'Animals' },
  { word: 'IGUANA', category: 'Animals' },
  { word: 'SNAKE', category: 'Animals' },
  { word: 'TURTLE', category: 'Animals' },
  { word: 'DOLPHIN', category: 'Animals' },
  { word: 'WHALE', category: 'Animals' },
  { word: 'SHARK', category: 'Animals' },
  { word: 'OCTOPUS', category: 'Animals' },
  { word: 'SQUID', category: 'Animals' },
  { word: 'LOBSTER', category: 'Animals' },
  { word: 'CRAB', category: 'Animals' },
  { word: 'PENGUIN', category: 'Animals' },
  // Music
  { word: 'GUITAR', category: 'Music' },
  // Nature
  { word: 'MOUNTAIN', category: 'Nature' },
  { word: 'OCEAN', category: 'Nature' },
  { word: 'PLANET', category: 'Space' },
  { word: 'SUMMER', category: 'Nature' },
  { word: 'WINTER', category: 'Nature' },
  { word: 'BUTTERFLY', category: 'Nature' },
  { word: 'SUNFLOWER', category: 'Nature' },
  { word: 'DIAMOND', category: 'Nature' },
  // Birds
  { word: 'SEAGULL', category: 'Birds' },
  { word: 'PELICAN', category: 'Birds' },
  { word: 'EAGLE', category: 'Birds' },
  { word: 'HAWK', category: 'Birds' },
  { word: 'FALCON', category: 'Birds' },
  { word: 'OWL', category: 'Birds' },
  { word: 'WOODPECKER', category: 'Birds' },
  { word: 'PARROT', category: 'Birds' },
  { word: 'PIGEON', category: 'Birds' },
  { word: 'SPARROW', category: 'Birds' },
  { word: 'SWALLOW', category: 'Birds' },
  { word: 'ROBIN', category: 'Birds' },
  { word: 'BLUEJAY', category: 'Birds' },
  { word: 'CARDINAL', category: 'Birds' },
  { word: 'HUMMINGBIRD', category: 'Birds' },
  // Nature landscape
  { word: 'WOODS', category: 'Nature' },
  { word: 'FOREST', category: 'Nature' },
  { word: 'JUNGLE', category: 'Nature' },
  { word: 'DESERT', category: 'Nature' },
  { word: 'TUNDRA', category: 'Nature' },
  { word: 'SAVANNA', category: 'Nature' },
  { word: 'VALLEY', category: 'Nature' },
  { word: 'CANYON', category: 'Nature' },
  { word: 'RIVER', category: 'Nature' },
  { word: 'STREAM', category: 'Nature' },
  { word: 'CREEK', category: 'Nature' },
  { word: 'LAKE', category: 'Nature' },
  { word: 'POND', category: 'Nature' },
  { word: 'SEA', category: 'Nature' },
  { word: 'GULF', category: 'Nature' },
  { word: 'BAY', category: 'Nature' },
  { word: 'STRAIT', category: 'Nature' },
  { word: 'ISLAND', category: 'Nature' },
  { word: 'PENINSULA', category: 'Nature' },
  { word: 'CONTINENT', category: 'Nature' },
  // Space
  { word: 'STAR', category: 'Space' },
  { word: 'GALAXY', category: 'Space' },
  { word: 'UNIVERSE', category: 'Space' },
  { word: 'ASTEROID', category: 'Space' },
  { word: 'COMET', category: 'Space' },
  { word: 'METEOR', category: 'Space' },
  { word: 'SATELLITE', category: 'Space' },
  { word: 'ROCKET', category: 'Space' },
  { word: 'SPACESHIP', category: 'Space' },
  { word: 'ASTRONAUT', category: 'Space' },
  { word: 'TELESCOPE', category: 'Space' },
  // Science & Lab
  { word: 'OBSERVATORY', category: 'Science' },
  { word: 'MICROSCOPE', category: 'Science' },
  { word: 'LABORATORY', category: 'Science' },
  { word: 'EXPERIMENT', category: 'Science' },
  { word: 'CHEMISTRY', category: 'Science' },
  { word: 'PHYSICS', category: 'Science' },
  { word: 'BIOLOGY', category: 'Science' },
  { word: 'ASTRONOMY', category: 'Science' },
  { word: 'GEOLOGY', category: 'Science' },
  { word: 'METEOROLOGY', category: 'Science' },
  { word: 'ECOLOGY', category: 'Science' },
  { word: 'BOTANY', category: 'Science' },
  { word: 'ZOOLOGY', category: 'Science' },
  { word: 'ANATOMY', category: 'Science' },
  { word: 'PHYSIOLOGY', category: 'Science' },
  // Medicine
  { word: 'MEDICINE', category: 'Medicine' },
  { word: 'SURGERY', category: 'Medicine' },
  { word: 'DOCTOR', category: 'Medicine' },
  { word: 'NURSE', category: 'Medicine' },
  { word: 'CLINIC', category: 'Medicine' },
  { word: 'PHARMACY', category: 'Medicine' },
  { word: 'PRESCRIPTION', category: 'Medicine' },
  { word: 'MEDICATION', category: 'Medicine' },
  { word: 'VACCINE', category: 'Medicine' },
  { word: 'ANTIBIOTIC', category: 'Medicine' },
  // Human Body
  { word: 'VITAMIN', category: 'Human Body' },
  { word: 'MINERAL', category: 'Human Body' },
  { word: 'PROTEIN', category: 'Human Body' },
  { word: 'CARBOHYDRATE', category: 'Human Body' },
  { word: 'FAT', category: 'Human Body' },
  { word: 'CALORIE', category: 'Human Body' },
  { word: 'NUTRITION', category: 'Human Body' },
  { word: 'DIET', category: 'Human Body' },
  { word: 'EXERCISE', category: 'Human Body' },
  { word: 'WORKOUT', category: 'Human Body' },
  { word: 'GYM', category: 'Places' },
  { word: 'FITNESS', category: 'Human Body' },
  { word: 'MUSCLE', category: 'Human Body' },
  { word: 'BONE', category: 'Human Body' },
  { word: 'JOINT', category: 'Human Body' },
  { word: 'BLOOD', category: 'Human Body' },
  { word: 'HEART', category: 'Human Body' },
  { word: 'LUNG', category: 'Human Body' },
  { word: 'BRAIN', category: 'Human Body' },
  { word: 'STOMACH', category: 'Human Body' },
  { word: 'LIVER', category: 'Human Body' },
  { word: 'KIDNEY', category: 'Human Body' },
  { word: 'SKIN', category: 'Human Body' },
  { word: 'HAIR', category: 'Human Body' },
  { word: 'NAIL', category: 'Human Body' },
  { word: 'TOOTH', category: 'Human Body' },
  { word: 'DENTIST', category: 'Medicine' },
  { word: 'BRUSH', category: 'Objects' },
  { word: 'FLOSS', category: 'Objects' },
  { word: 'PASTE', category: 'Objects' },
  { word: 'MOUTH', category: 'Human Body' },
  { word: 'TONGUE', category: 'Human Body' },
  { word: 'THROAT', category: 'Human Body' },
  { word: 'NOSE', category: 'Human Body' },
  { word: 'EYE', category: 'Human Body' },
  { word: 'EAR', category: 'Human Body' },
  { word: 'HEAD', category: 'Human Body' },
  { word: 'NECK', category: 'Human Body' },
  { word: 'SHOULDER', category: 'Human Body' },
  { word: 'ARM', category: 'Human Body' },
  { word: 'ELBOW', category: 'Human Body' },
  { word: 'WRIST', category: 'Human Body' },
  { word: 'HAND', category: 'Human Body' },
  { word: 'FINGER', category: 'Human Body' },
  { word: 'THUMB', category: 'Human Body' },
  { word: 'CHEST', category: 'Human Body' },
  { word: 'BACK', category: 'Human Body' },
  { word: 'WAIST', category: 'Human Body' },
  { word: 'HIP', category: 'Human Body' },
  { word: 'LEG', category: 'Human Body' },
  { word: 'KNEE', category: 'Human Body' },
  { word: 'ANKLE', category: 'Human Body' },
  { word: 'FOOT', category: 'Human Body' },
  { word: 'TOE', category: 'Human Body' },
  // Clothing / Gear
  { word: 'SHOE', category: 'Clothing' },
  { word: 'SOCK', category: 'Clothing' },
  { word: 'BOOT', category: 'Clothing' },
  { word: 'SANDAL', category: 'Clothing' },
  { word: 'SLIPPER', category: 'Clothing' },
  { word: 'COAT', category: 'Clothing' },
  { word: 'JACKET', category: 'Clothing' },
  { word: 'SWEATER', category: 'Clothing' },
  { word: 'SHIRT', category: 'Clothing' },
  { word: 'TSHIRT', category: 'Clothing' },
  { word: 'BLOUSE', category: 'Clothing' },
  { word: 'DRESS', category: 'Clothing' },
  { word: 'SKIRT', category: 'Clothing' },
  { word: 'PANTS', category: 'Clothing' },
  { word: 'JEANS', category: 'Clothing' },
  { word: 'SHORTS', category: 'Clothing' },
  { word: 'BELT', category: 'Clothing' },
  { word: 'TIE', category: 'Clothing' },
  { word: 'SCARF', category: 'Clothing' },
  { word: 'GLOVE', category: 'Clothing' },
  { word: 'HAT', category: 'Clothing' },
  { word: 'CAP', category: 'Clothing' },
  { word: 'HELMET', category: 'Clothing' },
  { word: 'GLASSES', category: 'Clothing' },
  { word: 'SUNGLASSES', category: 'Clothing' },
  { word: 'WATCH', category: 'Clothing' },
  // Weather
  { word: 'CLOCK', category: 'Objects' },
  { word: 'TIMER', category: 'Objects' },
  { word: 'CALENDAR', category: 'Objects' },
  { word: 'DAY', category: 'Time' },
  { word: 'WEEK', category: 'Time' },
  { word: 'MONTH', category: 'Time' },
  { word: 'YEAR', category: 'Time' },
  { word: 'DECADE', category: 'Time' },
  { word: 'CENTURY', category: 'Time' },
  { word: 'MILLENNIUM', category: 'Time' },
  { word: 'SPRING', category: 'Weather' },
  { word: 'AUTUMN', category: 'Weather' },
  { word: 'SEASON', category: 'Weather' },
  { word: 'WEATHER', category: 'Weather' },
  { word: 'CLIMATE', category: 'Weather' },
  { word: 'TEMPERATURE', category: 'Weather' },
  { word: 'THERMOMETER', category: 'Weather' },
  { word: 'BAROMETER', category: 'Weather' },
  { word: 'RAIN', category: 'Weather' },
  { word: 'SNOW', category: 'Weather' },
  { word: 'SLEET', category: 'Weather' },
  { word: 'HAIL', category: 'Weather' },
  { word: 'WIND', category: 'Weather' },
  { word: 'BREEZE', category: 'Weather' },
  { word: 'GALE', category: 'Weather' },
  { word: 'STORM', category: 'Weather' },
  { word: 'HURRICANE', category: 'Weather' },
  { word: 'TORNADO', category: 'Weather' },
  { word: 'CYCLONE', category: 'Weather' },
  { word: 'TYPHOON', category: 'Weather' },
  { word: 'BLIZZARD', category: 'Weather' },
  { word: 'AVALANCHE', category: 'Weather' },
  { word: 'EARTHQUAKE', category: 'Weather' },
  { word: 'VOLCANO', category: 'Weather' },
  { word: 'TSUNAMI', category: 'Weather' },
  { word: 'FLOOD', category: 'Weather' },
  { word: 'DROUGHT', category: 'Weather' },
  { word: 'WILDFIRE', category: 'Weather' },
  { word: 'FIRE', category: 'Nature' },
  { word: 'FLAME', category: 'Nature' },
  { word: 'SMOKE', category: 'Nature' },
  { word: 'ASH', category: 'Nature' },
  { word: 'COAL', category: 'Nature' },
  { word: 'WOOD', category: 'Nature' },
  { word: 'PAPER', category: 'Objects' },
  { word: 'CARDBOARD', category: 'Objects' },
  // Materials
  { word: 'PLASTIC', category: 'Materials' },
  { word: 'GLASS', category: 'Materials' },
  { word: 'METAL', category: 'Materials' },
  { word: 'IRON', category: 'Materials' },
  { word: 'STEEL', category: 'Materials' },
  { word: 'COPPER', category: 'Materials' },
  { word: 'GOLD', category: 'Materials' },
  { word: 'SILVER', category: 'Materials' },
  { word: 'BRONZE', category: 'Materials' },
  { word: 'BRASS', category: 'Materials' },
  { word: 'ALUMINUM', category: 'Materials' },
  { word: 'LEAD', category: 'Materials' },
  { word: 'ZINC', category: 'Materials' },
  { word: 'TIN', category: 'Materials' },
  { word: 'PLATINUM', category: 'Materials' },
  { word: 'RUBY', category: 'Materials' },
  { word: 'SAPPHIRE', category: 'Materials' },
  { word: 'EMERALD', category: 'Materials' },
  { word: 'PEARL', category: 'Materials' },
  { word: 'OPAL', category: 'Materials' },
  { word: 'AMETHYST', category: 'Materials' },
  { word: 'TOPAZ', category: 'Materials' },
  { word: 'QUARTZ', category: 'Materials' },
  { word: 'GRANITE', category: 'Materials' },
  { word: 'MARBLE', category: 'Materials' },
  { word: 'LIMESTONE', category: 'Materials' },
  { word: 'SANDSTONE', category: 'Materials' },
  { word: 'CLAY', category: 'Materials' },
  { word: 'DIRT', category: 'Nature' },
  { word: 'SOIL', category: 'Nature' },
  { word: 'SAND', category: 'Nature' },
  { word: 'DUST', category: 'Nature' },
  { word: 'MUD', category: 'Nature' },
  { word: 'ROCK', category: 'Nature' },
  { word: 'STONE', category: 'Nature' },
  { word: 'PEBBLE', category: 'Nature' },
  { word: 'BOULDER', category: 'Nature' },
  { word: 'GRAVEL', category: 'Nature' },
  { word: 'ASPHALT', category: 'Materials' },
  { word: 'CONCRETE', category: 'Materials' },
  { word: 'CEMENT', category: 'Materials' },
  { word: 'BRICK', category: 'Materials' },
  { word: 'BLOCK', category: 'Objects' },
  { word: 'TILE', category: 'Materials' },
  { word: 'SHINGLE', category: 'Materials' },
  { word: 'ROOF', category: 'Places' },
  { word: 'WALL', category: 'Places' },
  { word: 'FLOOR', category: 'Places' },
  { word: 'CEILING', category: 'Places' },
  // Places
  { word: 'DOOR', category: 'Places' },
  { word: 'WINDOW', category: 'Places' },
  { word: 'ROOM', category: 'Places' },
  { word: 'HOUSE', category: 'Places' },
  { word: 'BUILDING', category: 'Places' },
  { word: 'SKYSCRAPER', category: 'Places' },
  { word: 'OFFICE', category: 'Places' },
  { word: 'STORE', category: 'Places' },
  { word: 'SHOP', category: 'Places' },
  { word: 'MARKET', category: 'Places' },
  { word: 'SUPERMARKET', category: 'Places' },
  { word: 'MALL', category: 'Places' },
  { word: 'RESTAURANT', category: 'Places' },
  { word: 'CAFE', category: 'Places' },
  { word: 'BAKERY', category: 'Places' },
  { word: 'BUTCHER', category: 'Places' },
  { word: 'GROCERY', category: 'Places' },
  { word: 'BANK', category: 'Places' },
  { word: 'POST', category: 'Places' },
  { word: 'SCHOOL', category: 'Places' },
  { word: 'COLLEGE', category: 'Places' },
  { word: 'UNIVERSITY', category: 'Places' },
  { word: 'MUSEUM', category: 'Places' },
  { word: 'THEATER', category: 'Places' },
  { word: 'CINEMA', category: 'Places' },
  { word: 'STADIUM', category: 'Places' },
  { word: 'ARENA', category: 'Places' },
  { word: 'PARK', category: 'Places' },
  { word: 'GARDEN', category: 'Places' },
  { word: 'ZOO', category: 'Places' },
  { word: 'AQUARIUM', category: 'Places' },
  { word: 'HOSPITAL', category: 'Places' },
  { word: 'LIBRARY', category: 'Places' }
];

let recentHangmanWords = [];
try {
  const stored = localStorage.getItem('hangmanRecentWords');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      recentHangmanWords = parsed;
    }
  }
} catch (e) {
  console.error('Error reading from localStorage', e);
}

let currentWord = '';
let currentCategory = '';
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
console.log('mainMenu found:', !!mainMenu);
console.log('numberGuessGame found:', !!numberGuessGame);
console.log('backBtn found:', !!backBtn);
console.log('gameCards count:', gameCards.length);

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
const cricketModeSelectModal = document.getElementById('cricket-mode-select-modal');
const modeQuickMatchBtn = document.getElementById('mode-quick-match-btn');
const modeTestCricketBtn = document.getElementById('mode-test-cricket-btn');
const cricketModeCloseBtn = document.getElementById('cricket-mode-close-btn');

const cricketTeamSelectModal = document.getElementById('cricket-team-select-modal');
const cricketStartMatchBtn = document.getElementById('cricket-start-match-btn');
const cricketUserTeamSelect = document.getElementById('cricket-user-team');
const cricketOppTeamSelect = document.getElementById('cricket-opp-team');
const cricketScorecardModal = document.getElementById('cricket-scorecard-modal');
const cricketCloseScorecardBtn = document.getElementById('cricket-close-scorecard-btn');
const cricketCloseHelpBtn = document.getElementById('cricket-close-help-btn');
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

// Tactical Line-Up DOM References
const miniFieldPlayers = document.getElementById('mini-field-players');
const miniFieldHoverInfo = document.getElementById('mini-field-hover-info');
const xiTabList = document.getElementById('xi-tab-list');
const xiTabField = document.getElementById('xi-tab-field');

// Cached Gameplay & Overlay Elements for Performance
const ballEl = document.getElementById('cricket-ball');
const strikerEl = document.getElementById('cricket-striker');
const nonStrikerEl = document.getElementById('cricket-nonstriker');
const bowlerEl = document.getElementById('cricket-bowler');
const batEl = document.getElementById('cricket-bat');
const fieldersGroupEl = document.getElementById('cricket-fielders-group');
const runsCompletedTextEl = document.getElementById('runs-completed-text');
const timingIndicatorEl = document.getElementById('timing-indicator');
const timingSweetSpotEl = document.getElementById('timing-sweet-spot');
const timingEarlyZoneEl = document.getElementById('timing-early-zone');
const timingLateZoneEl = document.getElementById('timing-late-zone');
const cricketSpeedValEl = document.getElementById('cricket-speed-val');
const cricketOverBallsEl = document.getElementById('cricket-over-balls');
const statsGuessValEl = document.getElementById('stats-guess-val');
const statsHangmanValEl = document.getElementById('stats-hangman-val');
const statsCricketValEl = document.getElementById('stats-cricket-val');
const statsTestCricketValEl = document.getElementById('stats-test-cricket-val');
const batterStrikerNameEl = document.getElementById('batter-striker-name');
const batterStrikerStatsEl = document.getElementById('batter-striker-stats');
const batterNonStrikerNameEl = document.getElementById('batter-nonstriker-name');
const batterNonStrikerStatsEl = document.getElementById('batter-nonstriker-stats');
const bowlerNameEl = document.getElementById('bowler-name');
const bowlerStatsEl = document.getElementById('bowler-stats');
const partnershipStatsEl = document.getElementById('partnership-stats');
const cricketMilestoneToastEl = document.getElementById('cricket-milestone-toast');
const scorecardBattingRowsEl = document.getElementById('scorecard-batting-rows');
const scorecardBowlingRowsEl = document.getElementById('scorecard-bowling-rows');
const teamSelectErrorEl = document.getElementById('team-select-error');
const guessHistoryContainerEl = document.getElementById('guess-history-container');
const guessHistoryChipsEl = document.getElementById('guess-history-chips');
const cricketGameContainerEl = document.querySelector('#cricket-game .game-container');

// Bowler types lookup table (Fast vs Spin)
const BOWLER_TYPES = {
  "Jasprit Bumrah": "Fast", "Mohammed Siraj": "Fast", "R. Ashwin": "Spin", "Ravindra Jadeja": "Spin", "Akash Deep": "Fast",
  "Pat Cummins": "Fast", "Mitchell Starc": "Fast", "Josh Hazlewood": "Fast", "Nathan Lyon": "Spin", "Mitchell Marsh": "Fast", "Cameron Green": "Fast",
  "Chris Woakes": "Fast", "Gus Atkinson": "Fast", "Mark Wood": "Fast", "Shoaib Bashir": "Spin", "Ben Stokes": "Fast",
  "P. Jayasuriya": "Spin", "Asitha Fernando": "Fast", "Lahiru Kumara": "Fast", "Vishwa Fernando": "Fast", "D. de Silva": "Spin", "Angelo Mathews": "Fast",
  // New Zealand
  "Tim Southee": "Fast", "Matt Henry": "Fast", "Kyle Jamieson": "Fast", "Mitchell Santner": "Spin", "Glenn Phillips": "Spin", "Rachin Ravindra": "Spin",
  // South Africa
  "Kagiso Rabada": "Fast", "Marco Jansen": "Fast", "Keshav Maharaj": "Spin", "Lungi Ngidi": "Fast", "Wiaan Mulder": "Fast",
  // West Indies
  "Kemar Roach": "Fast", "Alzarri Joseph": "Fast", "Jayden Seales": "Fast", "Gudakesh Motie": "Spin", "Jason Holder": "Fast"
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
  "P. Jayasuriya": 4, "Asitha Fernando": 4, "Lahiru Kumara": 4, "Vishwa Fernando": 4, "D. de Silva": 2, "Angelo Mathews": 2,
  // New Zealand
  "Tim Southee": 4, "Matt Henry": 4, "Kyle Jamieson": 4, "Mitchell Santner": 4, "Glenn Phillips": 2, "Rachin Ravindra": 2,
  // South Africa
  "Kagiso Rabada": 4, "Marco Jansen": 4, "Keshav Maharaj": 4, "Lungi Ngidi": 4, "Wiaan Mulder": 2,
  // West Indies
  "Kemar Roach": 4, "Alzarri Joseph": 4, "Jayden Seales": 4, "Gudakesh Motie": 4, "Jason Holder": 3
};

let isMilestoneCelebrating = false;

function getTeamFlagHTML(teamCode, className = "country-flag-img") {
  if (teamCode === "WI") {
    return `<svg class="${className}" width="28" height="20" viewBox="0 0 28 20" style="display:inline-block; vertical-align:middle;">
      <rect width="28" height="20" fill="#7B002C" rx="2" />
      <circle cx="14" cy="11" r="5" fill="#FDB813" />
      <ellipse cx="14" cy="16" rx="9" ry="3" fill="#D4AF37" />
      <path d="M14,16 Q13,12 14,8" stroke="#8B5A2B" stroke-width="1.2" fill="none" />
      <path d="M14,8 Q11,7 9,9 M14,8 Q12,5 11,3 M14,8 Q15,4 17,4 M14,8 Q16,6 18,8 M14,8 Q15,10 17,11" stroke="#228B22" stroke-width="1" fill="none" />
    </svg>`;
  }
  const codes = {
    IND: "in",
    AUS: "au",
    ENG: "gb-eng",
    SL: "lk",
    NZ: "nz",
    SA: "za"
  };
  const code = codes[teamCode] || "un";
  return `<img class="${className}" src="https://flagcdn.com/w40/${code}.png" alt="${teamCode}" style="display:inline-block; vertical-align:middle;">`;
}

function getFlagCDNCode(teamCode) {
  const codes = {
    IND: "in",
    AUS: "au",
    ENG: "gb-eng",
    SL: "lk",
    NZ: "nz",
    SA: "za"
  };
  return codes[teamCode] || "un";
}

function updateSVGOutfieldFlags(userTeamCode, oppTeamCode) {
  const svgUserFlagGraphic = document.getElementById('svg-user-flag-graphic');
  const svgOppFlagGraphic = document.getElementById('svg-opp-flag-graphic');
  
  const setFlagSVG = (el, teamCode, cx, cy, r) => {
    if (!el) return;
    if (teamCode === "WI") {
      el.innerHTML = `
        <rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="#7B002C" />
        <circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="#FDB813" />
        <ellipse cx="${cx}" cy="${cy + r * 0.5}" rx="${r * 0.9}" ry="${r * 0.3}" fill="#D4AF37" />
        <path d="M${cx},${cy + r * 0.5} Q${cx - r * 0.1},${cy + r * 0.1} ${cx},${cy - r * 0.3}" stroke="#8B5A2B" stroke-width="1.2" fill="none" />
      `;
    } else {
      const code = getFlagCDNCode(teamCode);
      el.innerHTML = `<image href="https://flagcdn.com/w80/${code}.png" x="${cx - r}" y="${cy - r}" height="${r * 2}" width="${r * 2}" preserveAspectRatio="xMidYMid slice" />`;
    }
  };
  
  setFlagSVG(svgUserFlagGraphic, userTeamCode, 90, 90, 24);
  setFlagSVG(svgOppFlagGraphic, oppTeamCode, 360, 90, 24);
}

// Player Roles & Team Flags for pre-match Playing XI presentation
const TEAM_FLAGS = {
  IND: getTeamFlagHTML("IND"),
  AUS: getTeamFlagHTML("AUS"),
  ENG: getTeamFlagHTML("ENG"),
  SL: getTeamFlagHTML("SL"),
  NZ: getTeamFlagHTML("NZ"),
  SA: getTeamFlagHTML("SA"),
  WI: getTeamFlagHTML("WI")
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
  "Asitha Fernando": "Bowler", "Lahiru Kumara": "Bowler", "Vishwa Fernando": "Bowler",
  // New Zealand
  "Tom Latham": "Batter", "Devon Conway": "Batter", "Kane Williamson": "Batter", "Rachin Ravindra": "All-Rounder",
  "Daryl Mitchell": "Batter", "Glenn Phillips": "All-Rounder", "Tom Blundell": "Wicketkeeper", "Mitchell Santner": "All-Rounder",
  "Matt Henry": "Bowler", "Kyle Jamieson": "Bowler", "Tim Southee": "Bowler",
  // South Africa
  "Aiden Markram": "Batter", "Tony de Zorzi": "Batter", "Tristan Stubbs": "Batter", "Temba Bavuma": "Batter",
  "David Bedingham": "Batter", "Kyle Verreynne": "Wicketkeeper", "Wiaan Mulder": "All-Rounder", "Marco Jansen": "All-Rounder",
  "Keshav Maharaj": "Bowler", "Kagiso Rabada": "Bowler", "Lungi Ngidi": "Bowler",
  // West Indies
  "Kraigg Brathwaite": "Batter", "Mikyle Louis": "Batter", "Keacy Carty": "Batter", "Alick Athanaze": "Batter",
  "Kavem Hodge": "Batter", "Joshua Da Silva": "Wicketkeeper", "Jason Holder": "All-Rounder", "Alzarri Joseph": "Bowler",
  "Kemar Roach": "Bowler", "Jayden Seales": "Bowler", "Gudakesh Motie": "Bowler"
};

// Detailed player specialties for broadcast layout
const PLAYER_DETAILS = {
  // India
  "Rohit Sharma": { batStyle: "Right-hand Bat", bowlStyle: "Off break", roleDetail: "Batter (C)" },
  "Yashasvi Jaiswal": { batStyle: "Left-hand Bat", bowlStyle: "Leg break", roleDetail: "Batter" },
  "Shubman Gill": { batStyle: "Right-hand Bat", bowlStyle: "Off break", roleDetail: "Batter" },
  "Virat Kohli": { batStyle: "Right-hand Bat", bowlStyle: "Medium", roleDetail: "Batter" },
  "Rishabh Pant": { batStyle: "Left-hand Bat", bowlStyle: "None", roleDetail: "Wicketkeeper" },
  "KL Rahul": { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: "Batter" },
  "Ravindra Jadeja": { batStyle: "Left-hand Bat", bowlStyle: "Slow Left-arm Orthodox", roleDetail: "All-Rounder" },
  "R. Ashwin": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Off break", roleDetail: "All-Rounder" },
  "Jasprit Bumrah": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast", roleDetail: "Bowler" },
  "Mohammed Siraj": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast-Medium", roleDetail: "Bowler" },
  "Akash Deep": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast-Medium", roleDetail: "Bowler" },
  // Australia
  "Usman Khawaja": { batStyle: "Left-hand Bat", bowlStyle: "None", roleDetail: "Batter" },
  "Steve Smith": { batStyle: "Right-hand Bat", bowlStyle: "Leg break", roleDetail: "Batter" },
  "M. Labuschagne": { batStyle: "Right-hand Bat", bowlStyle: "Leg break / Off break", roleDetail: "Batter" },
  "Travis Head": { batStyle: "Left-hand Bat", bowlStyle: "Right-arm Off break", roleDetail: "Batter" },
  "Mitchell Marsh": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Medium", roleDetail: "All-Rounder" },
  "Alex Carey": { batStyle: "Left-hand Bat", bowlStyle: "None", roleDetail: "Wicketkeeper" },
  "Pat Cummins": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast", roleDetail: "Bowler (C)" },
  "Mitchell Starc": { batStyle: "Left-hand Bat", bowlStyle: "Left-arm Fast", roleDetail: "Bowler" },
  "Nathan Lyon": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Off break", roleDetail: "Bowler" },
  "Josh Hazlewood": { batStyle: "Left-hand Bat", bowlStyle: "Right-arm Fast-Medium", roleDetail: "Bowler" },
  "Cameron Green": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast-Medium", roleDetail: "All-Rounder" },
  // England
  "Zak Crawley": { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: "Batter" },
  "Ben Duckett": { batStyle: "Left-hand Bat", bowlStyle: "None", roleDetail: "Batter" },
  "Ollie Pope": { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: "Batter" },
  "Joe Root": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Off break", roleDetail: "Batter" },
  "Harry Brook": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Medium", roleDetail: "Batter" },
  "Ben Stokes": { batStyle: "Left-hand Bat", bowlStyle: "Right-arm Fast-Medium", roleDetail: "All-Rounder (C)" },
  "Jamie Smith": { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: "Wicketkeeper" },
  "Chris Woakes": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast-Medium", roleDetail: "All-Rounder" },
  "Gus Atkinson": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast-Medium", roleDetail: "Bowler" },
  "Shoaib Bashir": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Off break", roleDetail: "Bowler" },
  "Mark Wood": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast", roleDetail: "Bowler" },
  // Sri Lanka
  "Pathum Nissanka": { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: "Batter" },
  "D. Karunaratne": { batStyle: "Left-hand Bat", bowlStyle: "Right-arm Medium", roleDetail: "Batter (C)" },
  "Kusal Mendis": { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: "Wicketkeeper" },
  "Angelo Mathews": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Medium", roleDetail: "All-Rounder" },
  "Dinesh Chandimal": { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: "Batter" },
  "D. de Silva": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Off break", roleDetail: "All-Rounder" },
  "Kamindu Mendis": { batStyle: "Left-hand Bat", bowlStyle: "Ambidextrous Spin", roleDetail: "Batter" },
  "P. Jayasuriya": { batStyle: "Right-hand Bat", bowlStyle: "Slow Left-arm Orthodox", roleDetail: "Bowler" },
  "Asitha Fernando": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Medium-Fast", roleDetail: "Bowler" },
  "Lahiru Kumara": { batStyle: "Left-hand Bat", bowlStyle: "Right-arm Fast", roleDetail: "Bowler" },
  "Vishwa Fernando": { batStyle: "Right-hand Bat", bowlStyle: "Left-arm Fast-Medium", roleDetail: "Bowler" },
  // New Zealand
  "Tom Latham": { batStyle: "Left-hand Bat", bowlStyle: "None", roleDetail: "Batter (C)" },
  "Devon Conway": { batStyle: "Left-hand Bat", bowlStyle: "None", roleDetail: "Batter" },
  "Kane Williamson": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Off break", roleDetail: "Batter" },
  "Rachin Ravindra": { batStyle: "Left-hand Bat", bowlStyle: "Slow Left-arm Orthodox", roleDetail: "All-Rounder" },
  "Daryl Mitchell": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Medium", roleDetail: "Batter" },
  "Glenn Phillips": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Off break", roleDetail: "All-Rounder" },
  "Tom Blundell": { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: "Wicketkeeper" },
  "Mitchell Santner": { batStyle: "Left-hand Bat", bowlStyle: "Slow Left-arm Orthodox", roleDetail: "All-Rounder" },
  "Matt Henry": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast-Medium", roleDetail: "Bowler" },
  "Kyle Jamieson": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast-Medium", roleDetail: "Bowler" },
  "Tim Southee": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Medium-Fast", roleDetail: "Bowler" },
  // South Africa
  "Aiden Markram": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Off break", roleDetail: "Batter" },
  "Tony de Zorzi": { batStyle: "Left-hand Bat", bowlStyle: "None", roleDetail: "Batter" },
  "Tristan Stubbs": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Off break", roleDetail: "Batter" },
  "Temba Bavuma": { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: "Batter (C)" },
  "David Bedingham": { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: "Batter" },
  "Kyle Verreynne": { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: "Wicketkeeper" },
  "Wiaan Mulder": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Medium", roleDetail: "All-Rounder" },
  "Marco Jansen": { batStyle: "Right-hand Bat", bowlStyle: "Left-arm Fast", roleDetail: "All-Rounder" },
  "Keshav Maharaj": { batStyle: "Right-hand Bat", bowlStyle: "Slow Left-arm Orthodox", roleDetail: "Bowler" },
  "Kagiso Rabada": { batStyle: "Left-hand Bat", bowlStyle: "Right-arm Fast", roleDetail: "Bowler" },
  "Lungi Ngidi": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast-Medium", roleDetail: "Bowler" },
  // West Indies
  "Kraigg Brathwaite": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Off break", roleDetail: "Batter (C)" },
  "Mikyle Louis": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Leg break", roleDetail: "Batter" },
  "Keacy Carty": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Medium", roleDetail: "Batter" },
  "Alick Athanaze": { batStyle: "Left-hand Bat", bowlStyle: "Right-arm Off break", roleDetail: "Batter" },
  "Kavem Hodge": { batStyle: "Right-hand Bat", bowlStyle: "Slow Left-arm Orthodox", roleDetail: "Batter" },
  "Joshua Da Silva": { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: "Wicketkeeper" },
  "Jason Holder": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Medium-Fast", roleDetail: "All-Rounder" },
  "Alzarri Joseph": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast", roleDetail: "Bowler" },
  "Kemar Roach": { batStyle: "Right-hand Bat", bowlStyle: "Right-arm Fast-Medium", roleDetail: "Bowler" },
  "Jayden Seales": { batStyle: "Left-hand Bat", bowlStyle: "Right-arm Fast-Medium", roleDetail: "Bowler" },
  "Gudakesh Motie": { batStyle: "Left-hand Bat", bowlStyle: "Slow Left-arm Orthodox", roleDetail: "Bowler" }
};

// Generates a high-quality SVG jersey in official team colors
function getPlayerJerseySVG(teamCode, number) {
  let mainColor = "#94a3b8"; // Default slate
  let accentColor = "#1e293b";
  let textColor = "#ffffff";
  
  if (teamCode === "IND") {
    mainColor = "#1e40af"; // Royal Blue
    accentColor = "#ea580c"; // Orange
  } else if (teamCode === "AUS") {
    mainColor = "#eab308"; // Gold
    accentColor = "#166534"; // Green
    textColor = "#1e293b";
  } else if (teamCode === "ENG") {
    mainColor = "#0284c7"; // Sky Blue
    accentColor = "#dc2626"; // Red
  } else if (teamCode === "SL") {
    mainColor = "#1d4ed8"; // Blue
    accentColor = "#fbbf24"; // Gold
  } else if (teamCode === "NZ") {
    mainColor = "#18181b"; // Black
    accentColor = "#e4e4e7"; // White/Silver
  } else if (teamCode === "SA") {
    mainColor = "#166534"; // Forest Green
    accentColor = "#eab308"; // Gold
  } else if (teamCode === "WI") {
    mainColor = "#7B002C"; // Maroon
    accentColor = "#D4AF37"; // Gold
  }
  
  return `
    <svg class="player-jersey-svg" viewBox="0 0 100 100" width="30" height="30" style="overflow: visible; display: inline-block; vertical-align: middle;">
      <path d="M 25 15 L 75 15 L 85 30 L 73 35 L 70 25 L 70 85 L 30 85 L 30 25 L 27 35 L 15 30 Z" fill="${mainColor}" stroke="${accentColor}" stroke-width="4" stroke-linejoin="round" />
      <path d="M 40 15 Q 50 25 60 15" fill="none" stroke="${accentColor}" stroke-width="4" />
      <line x1="20" y1="24" x2="27" y2="28" stroke="${accentColor}" stroke-width="3" />
      <line x1="80" y1="24" x2="73" y2="28" stroke="${accentColor}" stroke-width="3" />
      <text x="50" y="60" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${number}</text>
    </svg>
  `;
}

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
    bowlers: ["P. Jayasuriya", "Asitha Fernando", "Lahiru Kumara", "Vishwa Fernando", "D. de Silva", "Angelo Mathews"]
  },
  NZ: {
    name: "New Zealand",
    short: "NZ",
    batters: ["Tom Latham", "Devon Conway", "Kane Williamson", "Rachin Ravindra", "Daryl Mitchell", "Glenn Phillips", "Tom Blundell", "Mitchell Santner", "Matt Henry", "Kyle Jamieson", "Tim Southee"],
    bowlers: ["Tim Southee", "Matt Henry", "Kyle Jamieson", "Mitchell Santner", "Glenn Phillips", "Rachin Ravindra"]
  },
  SA: {
    name: "South Africa",
    short: "SA",
    batters: ["Aiden Markram", "Tony de Zorzi", "Tristan Stubbs", "Temba Bavuma", "David Bedingham", "Kyle Verreynne", "Wiaan Mulder", "Marco Jansen", "Keshav Maharaj", "Kagiso Rabada", "Lungi Ngidi"],
    bowlers: ["Kagiso Rabada", "Marco Jansen", "Keshav Maharaj", "Lungi Ngidi", "Wiaan Mulder"]
  },
  WI: {
    name: "West Indies",
    short: "WI",
    batters: ["Kraigg Brathwaite", "Mikyle Louis", "Keacy Carty", "Alick Athanaze", "Kavem Hodge", "Joshua Da Silva", "Jason Holder", "Alzarri Joseph", "Kemar Roach", "Jayden Seales", "Gudakesh Motie"],
    bowlers: ["Kemar Roach", "Alzarri Joseph", "Jayden Seales", "Gudakesh Motie", "Jason Holder"]
  }
};

let userTeamCode = 'SL';
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
let fielderThrowTimeout = null;
let milestoneTimeout = null;
let tvBannerTimeout1 = null;
let tvBannerTimeout2 = null;
let isCricketPaused = false;
let pausedAutoBowling = false;

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

let lastFrameTime = 0;

// Keep track of last values to optimize DOM operations
let lastBallX = null;
let lastBallY = null;
let lastBallRadius = null;
let lastBallOpacity = null;
let lastBallFill = null;

let lastB1Y = null;
let lastB2Y = null;
let lastStrikerFill = null;
let lastNonStrikerFill = null;
let lastBowlerY = null;
let lastBowlerFill = null;

let lastBatX1 = null;
let lastBatY1 = null;
let lastBatX2 = null;
let lastBatY2 = null;
let lastBatTransformOrigin = null;

let lastIndicatorCy = null;

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
    this.lastX = null;
    this.lastY = null;
    this.lastState = null;
    this.reactionDelay = 0;
    this.fumbleTimer = 0;
    this.hasFumbled = false;
  }

  update(ballX, ballY, isActive, dt = 1.0) {
    if (this.reactionDelay > 0) {
      this.reactionDelay -= dt * 16.666;
      if (this.x !== this.homeX || this.y !== this.homeY) {
        let hdx = this.homeX - this.x;
        let hdy = this.homeY - this.y;
        let hdist = Math.sqrt(hdx * hdx + hdy * hdy);
        if (hdist > 2 * dt) {
          this.x += (hdx / hdist) * 1.5 * dt;
          this.y += (hdy / hdist) * 1.5 * dt;
        } else {
          this.x = this.homeX;
          this.y = this.homeY;
        }
      }
      return;
    }

    if (this.fumbleTimer > 0) {
      this.fumbleTimer -= dt * 16.666;
      this.state = 'IDLE';
      return;
    }

    if (isActive) {
      this.state = 'CHASING';
      let dx = ballX - this.x;
      let dy = ballY - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 4 * dt) {
        this.x += (dx / distance) * this.speed * dt;
        this.y += (dy / distance) * this.speed * dt;
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
        if (distance > 12 * dt) {
          this.x += (dx / distance) * moveSpeed * dt;
          this.y += (dy / distance) * moveSpeed * dt;
        }
      } else {
        let hdx = this.homeX - this.x;
        let hdy = this.homeY - this.y;
        let hdist = Math.sqrt(hdx * hdx + hdy * hdy);
        if (hdist > 2 * dt) {
          this.x += (hdx / hdist) * 1.5 * dt; // return to base
          this.y += (hdy / hdist) * 1.5 * dt;
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
    this.lastX = null;
    this.lastY = null;
    this.lastState = null;
    this.reactionDelay = 0;
    this.fumbleTimer = 0;
    this.hasFumbled = false;
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
  if (!cricketSpeedValEl) return;
  
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
  
  cricketSpeedValEl.innerHTML = `${ballStyle} @ <span class="highlight">${ballSpeedKmh.toFixed(1)} km/h</span>`;
}

function updateOverHistoryUI() {
  if (!cricketOverBallsEl) return;
  cricketOverBallsEl.innerHTML = '';
  
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
    cricketOverBallsEl.appendChild(chip);
  }
}

function triggerBoundaryFlash() {
  const targetContainer = cricketGameContainerEl || document.querySelector('#cricket-game .game-container');
  if (targetContainer) {
    targetContainer.classList.remove('boundary-flash');
    void targetContainer.offsetWidth;
    targetContainer.classList.add('boundary-flash');
    setTimeout(() => {
      targetContainer.classList.remove('boundary-flash');
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
  clearAllGameplayTimeouts();
  if (cricketTeamSelectModal) {
    cricketTeamSelectModal.classList.remove('hidden');
  }
  if (cricketScorecardModal) {
    cricketScorecardModal.classList.add('hidden');
  }
  if (cricketPlayingXiModal) {
    cricketPlayingXiModal.classList.add('hidden');
  }
  
  const skipPreMatch = localStorage.getItem('dpr_skip_prematch_modals') === 'true';
  const quickStartCheckbox = document.getElementById('cricket-quick-start');
  if (quickStartCheckbox) {
    quickStartCheckbox.checked = skipPreMatch;
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
  if (xiUserFlag) xiUserFlag.innerHTML = TEAM_FLAGS[userTeamCode] || "";
  if (xiUserName) xiUserName.textContent = userTeam.name;
  if (xiOppFlag) xiOppFlag.innerHTML = TEAM_FLAGS[oppTeamCode] || "";
  if (xiOppName) xiOppName.textContent = oppTeam.name;

  // Helper to build list HTML
  const buildPlayerListHTML = (players, teamCode, teamType) => {
    return players.map((name, index) => {
      const role = PLAYER_ROLES[name] || "Batter";
      const detail = PLAYER_DETAILS[name] || { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: role };
      
      let roleClass = "batter";
      if (role === "Bowler") roleClass = "bowler";
      else if (role === "All-Rounder") roleClass = "all-rounder";
      else if (role === "Wicketkeeper") roleClass = "wicketkeeper";

      const jerseySVG = getPlayerJerseySVG(teamCode, index + 1);

      // Build specialty info text:
      let specStr = detail.batStyle;
      if (detail.bowlStyle && detail.bowlStyle !== "None") {
        specStr += ` • ${detail.bowlStyle}`;
      }

      return `
        <div class="playing-xi-row player-name-hoverable" 
             data-player-name="${name}" 
             data-player-index="${index}" 
             data-team-type="${teamType}">
          <div class="player-name-wrap">
            ${jerseySVG}
            <div class="player-info-container">
              <span class="player-name-text">${name}</span>
              <span class="player-spec-text">${specStr}</span>
            </div>
          </div>
          <span class="xi-role-badge ${roleClass}">${detail.roleDetail}</span>
        </div>
      `;
    }).join("");
  };

  // Populate lists
  if (xiUserList) xiUserList.innerHTML = buildPlayerListHTML(userTeam.batters, userTeamCode, "user");
  if (xiOppList) xiOppList.innerHTML = buildPlayerListHTML(oppTeam.batters, oppTeamCode, "opp");

  // Fielding positions config on 400x400 SVG
  const FIELD_POSITIONS = [
    { posName: "Bowler", x: 200, y: 110 },
    { posName: "Wicketkeeper", x: 200, y: 295 },
    { posName: "Slip", x: 180, y: 290 },
    { posName: "Point", x: 105, y: 220 },
    { posName: "Cover", x: 115, y: 165 },
    { posName: "Mid-off", x: 165, y: 120 },
    { posName: "Mid-on", x: 235, y: 120 },
    { posName: "Mid-wicket", x: 285, y: 165 },
    { posName: "Square Leg", x: 295, y: 220 },
    { posName: "Fine Leg", x: 275, y: 295 },
    { posName: "Third Man", x: 110, y: 295 }
  ];

  // Function to build SVG representation of a player jersey
  const drawMiniSVGJersey = (teamCode, number, x, y, name, role, spec, type, index) => {
    let mainColor = "#94a3b8";
    let accentColor = "#1e293b";
    let textColor = "#ffffff";
    
    if (teamCode === "IND") {
      mainColor = "#1e40af";
      accentColor = "#ea580c";
    } else if (teamCode === "AUS") {
      mainColor = "#eab308";
      accentColor = "#166534";
      textColor = "#1e293b";
    } else if (teamCode === "ENG") {
      mainColor = "#0284c7";
      accentColor = "#dc2626";
    } else if (teamCode === "SL") {
      mainColor = "#1d4ed8";
      accentColor = "#fbbf24";
    } else if (teamCode === "NZ") {
      mainColor = "#18181b";
      accentColor = "#e4e4e7";
    } else if (teamCode === "SA") {
      mainColor = "#166534";
      accentColor = "#eab308";
    } else if (teamCode === "WI") {
      mainColor = "#7B002C";
      accentColor = "#D4AF37";
    }
    
    return `
      <g class="mini-${type}-jersey player-name-hoverable" 
         id="mini-jersey-${type}-${index}"
         data-player-name="${name}" 
         data-player-index="${index}" 
         data-team-type="${type}"
         data-player-role="${role}"
         data-player-spec="${spec}"
         transform="translate(${x - 12}, ${y - 12})"
         style="transform-origin: ${x}px ${y}px;">
        <path d="M 6 3 L 18 3 L 21 7 L 18 8 L 17 6 L 17 21 L 7 21 L 7 6 L 6 8 L 3 7 Z" fill="${mainColor}" stroke="${accentColor}" stroke-width="1.2" stroke-linejoin="round" />
        <path d="M 9.5 3 Q 12 5.5 14.5 3" fill="none" stroke="${accentColor}" stroke-width="1" />
        <text x="12" y="14" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="7.5" font-weight="900" fill="${textColor}" text-anchor="middle">${number}</text>
        <circle cx="12" cy="12" r="14" fill="transparent" style="cursor: pointer;" />
      </g>
    `;
  };

  // Generate field SVG content
  let fieldHTML = "";
  
  // 1. Draw Batting Team Active Players (Batsmen)
  // Striker (index 0)
  if (userTeam.batters[0]) {
    const name = userTeam.batters[0];
    const role = PLAYER_ROLES[name] || "Batter";
    const detail = PLAYER_DETAILS[name] || { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: role };
    let specStr = detail.batStyle;
    fieldHTML += drawMiniSVGJersey(userTeamCode, 1, 200, 265, name, "Striker", specStr, "user", 0);
  }
  // Non-Striker (index 1)
  if (userTeam.batters[1]) {
    const name = userTeam.batters[1];
    const role = PLAYER_ROLES[name] || "Batter";
    const detail = PLAYER_DETAILS[name] || { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: role };
    let specStr = detail.batStyle;
    fieldHTML += drawMiniSVGJersey(userTeamCode, 2, 200, 135, name, "Non-Striker", specStr, "user", 1);
  }
  
  // 2. Draw Bowling Team Active Players (Bowler + Keeper + 9 Fielders)
  oppTeam.batters.forEach((name, index) => {
    const role = PLAYER_ROLES[name] || "Batter";
    const detail = PLAYER_DETAILS[name] || { batStyle: "Right-hand Bat", bowlStyle: "None", roleDetail: role };
    let specStr = detail.batStyle;
    if (detail.bowlStyle && detail.bowlStyle !== "None") {
      specStr += ` • ${detail.bowlStyle}`;
    }
    
    // Get fielding position
    const pos = FIELD_POSITIONS[index] || { posName: "Fielder", x: 200 + (Math.random() - 0.5) * 150, y: 200 + (Math.random() - 0.5) * 150 };
    fieldHTML += drawMiniSVGJersey(oppTeamCode, index + 1, pos.x, pos.y, name, pos.posName, specStr, "opp", index);
  });
  
  if (miniFieldPlayers) {
    miniFieldPlayers.innerHTML = fieldHTML;
  }

  // Handle mobile tab switching logic
  const modalBox = cricketPlayingXiModal ? cricketPlayingXiModal.querySelector('.playing-xi-modal-box') : null;
  if (modalBox) {
    modalBox.classList.remove('show-field-tab');
    modalBox.classList.add('show-list-tab');
  }
  
  if (xiTabList && xiTabField && modalBox) {
    xiTabList.classList.add('active');
    xiTabField.classList.remove('active');
    
    // Add click listeners to tabs once
    if (!xiTabList.dataset.listenerBound) {
      xiTabList.addEventListener('click', () => {
        playSfx('click');
        xiTabList.classList.add('active');
        xiTabField.classList.remove('active');
        modalBox.classList.remove('show-field-tab');
        modalBox.classList.add('show-list-tab');
      });
      xiTabList.dataset.listenerBound = 'true';
    }
    
    if (!xiTabField.dataset.listenerBound) {
      xiTabField.addEventListener('click', () => {
        playSfx('click');
        xiTabField.classList.add('active');
        xiTabList.classList.remove('active');
        modalBox.classList.remove('show-list-tab');
        modalBox.classList.add('show-field-tab');
      });
      xiTabField.dataset.listenerBound = 'true';
    }
  }

  // Initialize hover synchronization event listeners (using event delegation)
  const handleListMouseOver = (e) => {
    const row = e.target.closest('.playing-xi-row');
    if (!row) return;
    
    const index = row.getAttribute('data-player-index');
    const teamType = row.getAttribute('data-team-type');
    const name = row.getAttribute('data-player-name');
    
    // Highlight matching jersey
    const miniJersey = document.getElementById(`mini-jersey-${teamType}-${index}`);
    if (miniJersey) {
      miniJersey.classList.add('highlighted');
      const role = miniJersey.getAttribute('data-player-role');
      const spec = miniJersey.getAttribute('data-player-spec');
      if (miniFieldHoverInfo) {
        miniFieldHoverInfo.textContent = `${name} (${role}) — ${spec}`;
        miniFieldHoverInfo.classList.add('has-player');
      }
    }
  };
  
  const handleListMouseOut = (e) => {
    const row = e.target.closest('.playing-xi-row');
    if (!row) return;
    
    const index = row.getAttribute('data-player-index');
    const teamType = row.getAttribute('data-team-type');
    
    const miniJersey = document.getElementById(`mini-jersey-${teamType}-${index}`);
    if (miniJersey) {
      miniJersey.classList.remove('highlighted');
    }
    
    if (miniFieldHoverInfo) {
      miniFieldHoverInfo.textContent = "Hover over jerseys to view player details";
      miniFieldHoverInfo.classList.remove('has-player');
    }
  };

  if (xiUserList && !xiUserList.dataset.hoverBound) {
    xiUserList.addEventListener('mouseover', handleListMouseOver);
    xiUserList.addEventListener('mouseout', handleListMouseOut);
    xiUserList.dataset.hoverBound = 'true';
  }
  
  if (xiOppList && !xiOppList.dataset.hoverBound) {
    xiOppList.addEventListener('mouseover', handleListMouseOver);
    xiOppList.addEventListener('mouseout', handleListMouseOut);
    xiOppList.dataset.hoverBound = 'true';
  }

  const handleFieldMouseOver = (e) => {
    const jersey = e.target.closest('g[data-player-name]');
    if (!jersey) return;
    
    const name = jersey.getAttribute('data-player-name');
    const teamType = jersey.getAttribute('data-team-type');
    const role = jersey.getAttribute('data-player-role');
    const spec = jersey.getAttribute('data-player-spec');
    
    // Highlight list row
    const row = document.querySelector(`.playing-xi-row[data-player-name="${name}"][data-team-type="${teamType}"]`);
    if (row) {
      row.classList.add(teamType === "user" ? "highlighted-squad-row" : "highlighted-opp-row");
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Update banner info
    if (miniFieldHoverInfo) {
      miniFieldHoverInfo.textContent = `${name} (${role}) — ${spec}`;
      miniFieldHoverInfo.classList.add('has-player');
    }
  };
  
  const handleFieldMouseOut = (e) => {
    const jersey = e.target.closest('g[data-player-name]');
    if (!jersey) return;
    
    const name = jersey.getAttribute('data-player-name');
    const teamType = jersey.getAttribute('data-team-type');
    
    const row = document.querySelector(`.playing-xi-row[data-player-name="${name}"][data-team-type="${teamType}"]`);
    if (row) {
      row.classList.remove("highlighted-squad-row", "highlighted-opp-row");
    }
    
    if (miniFieldHoverInfo) {
      miniFieldHoverInfo.textContent = "Hover over jerseys to view player details";
      miniFieldHoverInfo.classList.remove('has-player');
    }
  };

  if (miniFieldPlayers && !miniFieldPlayers.dataset.hoverBound) {
    miniFieldPlayers.addEventListener('mouseover', handleFieldMouseOver);
    miniFieldPlayers.addEventListener('mouseout', handleFieldMouseOut);
    miniFieldPlayers.dataset.hoverBound = 'true';
  }

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
  if (batFlag && userTrigger) {
    const userFlagImg = userTrigger.querySelector('.country-flag-img');
    if (userFlagImg) batFlag.innerHTML = userFlagImg.outerHTML;
  }
  if (batName && userVal) batName.textContent = userVal;
  if (bowlFlag && oppTrigger) {
    const oppFlagImg = oppTrigger.querySelector('.country-flag-img');
    if (oppFlagImg) bowlFlag.innerHTML = oppFlagImg.outerHTML;
  }
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
  
  isCricketPaused = false;
  pausedAutoBowling = false;
  const pauseModal = document.getElementById('cricket-pause-modal');
  if (pauseModal) {
    pauseModal.classList.add('hidden');
  }
  
  clearAllGameplayTimeouts();
  resetPlayState();
  updateCricketUI();
  
  // Set scoreboard header matchup details
  const sbUserFlag = document.getElementById('scoreboard-user-flag');
  const sbUserName = document.getElementById('scoreboard-user-name');
  const sbOppFlag = document.getElementById('scoreboard-opp-flag');
  const sbOppName = document.getElementById('scoreboard-opp-name');
  if (sbUserFlag) sbUserFlag.innerHTML = TEAM_FLAGS[userTeamCode] || '';
  if (sbUserName) sbUserName.textContent = SQUADS[userTeamCode].short;
  if (sbOppFlag) sbOppFlag.innerHTML = TEAM_FLAGS[oppTeamCode] || '';
  if (sbOppName) sbOppName.textContent = SQUADS[oppTeamCode].short;

  // Set top TV broadcast bar details
  const topBarUserFlag = document.getElementById('top-bar-user-flag');
  const topBarUserName = document.getElementById('top-bar-user-name');
  const topBarOppFlag = document.getElementById('top-bar-opp-flag');
  const topBarOppName = document.getElementById('top-bar-opp-name');
  const topBarMatchType = document.getElementById('top-bar-match-type');

  if (topBarUserFlag) topBarUserFlag.innerHTML = getTeamFlagHTML(userTeamCode, "top-bar-flag-img");
  if (topBarUserName) topBarUserName.textContent = SQUADS[userTeamCode].name;
  if (topBarOppFlag) topBarOppFlag.innerHTML = getTeamFlagHTML(oppTeamCode, "top-bar-flag-img");
  if (topBarOppName) topBarOppName.textContent = SQUADS[oppTeamCode].name;
  if (topBarMatchType) {
    topBarMatchType.textContent = isTestMatch ? "TEST MATCH" : "MINI CRICKET";
    topBarMatchType.className = isTestMatch ? "match-type-badge test-badge" : "match-type-badge mini-badge";
  }

  // Update circular flags on the SVG outfield grass
  updateSVGOutfieldFlags(userTeamCode, oppTeamCode);

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
    commentaryLines.innerHTML = `<div class="commentary-line active">Welcome to the match! ${TEAM_FLAGS[userTeamCode] || ''} ${SQUADS[userTeamCode].name} vs ${TEAM_FLAGS[oppTeamCode] || ''} ${SQUADS[oppTeamCode].name}. Press ENTER or click BOWL to start.</div>`;
  }
  
  const gameHeaderTitle = cricketGameView.querySelector('.game-header h1');
  const gameHeaderDesc = cricketGameView.querySelector('.game-header p');
  const ballsLimitEl = document.getElementById('cricket-balls-limit');
  
  if (isTestMatch) {
    if (gameHeaderTitle) gameHeaderTitle.innerHTML = `${TEAM_FLAGS[userTeamCode] || ''} ${SQUADS[userTeamCode].name} vs ${TEAM_FLAGS[oppTeamCode] || ''} ${SQUADS[oppTeamCode].name} - Test Match`;
    if (gameHeaderDesc) gameHeaderDesc.innerHTML = 'Score as many runs as possible until <span class="highlight">10 Wickets</span> are down!';
    if (ballsLimitEl) ballsLimitEl.style.display = 'none';
  } else {
    if (gameHeaderTitle) gameHeaderTitle.innerHTML = `${TEAM_FLAGS[userTeamCode] || ''} ${SQUADS[userTeamCode].name} vs ${TEAM_FLAGS[oppTeamCode] || ''} ${SQUADS[oppTeamCode].name} - Mini Cricket`;
    if (gameHeaderDesc) gameHeaderDesc.innerHTML = 'Score as many runs as possible in <span class="highlight">2 Overs (12 balls)</span>!';
    if (ballsLimitEl) ballsLimitEl.style.display = 'inline';
  }
  
  updateHowToPlayModal();
  
  const skipPreMatch = document.getElementById('cricket-quick-start')?.checked || false;
  try {
    localStorage.setItem('dpr_skip_prematch_modals', skipPreMatch ? 'true' : 'false');
  } catch (e) {
    console.error(e);
  }

  if (skipPreMatch) {
    if (cricketPlayingXiModal) {
      cricketPlayingXiModal.classList.add('hidden');
    }
    if (cricketHowToPlayModal) {
      cricketHowToPlayModal.classList.add('hidden');
    }
    showCricketMessage("Press ENTER or click BOWL to start! 🏏", "warning");
  } else {
    showPlayingXI();
  }
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
      tempBattingScorecard.push({ name: batter1.name, runs: batter1.runs, balls: batter1.balls, status: "Not Out", fours: batter1.fours || 0, sixes: batter1.sixes || 0 });
    } else if (batter2 && batter2.name === name && batter2.name !== "No Batter") {
      tempBattingScorecard.push({ name: batter2.name, runs: batter2.runs, balls: batter2.balls, status: "Not Out", fours: batter2.fours || 0, sixes: batter2.sixes || 0 });
    } else {
      tempBattingScorecard.push({ name: name, runs: 0, balls: 0, status: "Did Not Bat", fours: 0, sixes: 0 });
    }
  });

  let battingHtml = "";
  tempBattingScorecard.forEach(b => {
    let displayStatus = "";
    let scoreDisplay = "";
    
    if (b.status === "Not Out") {
      displayStatus = `<span style="color: var(--success-color); font-weight: bold;">Not Out</span>`;
      scoreDisplay = `<span class="player-runs" style="color: var(--accent-cricket); font-weight: bold; font-family: monospace;">${b.runs} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-secondary);">(${b.balls}b, ${b.fours || 0}x4, ${b.sixes || 0}x6)</span></span>`;
    } else if (b.status === "Out") {
      displayStatus = `<span style="color: var(--error-color);">Out</span>`;
      scoreDisplay = `<span class="player-runs" style="color: var(--accent-cricket); font-weight: bold; font-family: monospace;">${b.runs} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-secondary);">(${b.balls}b, ${b.fours || 0}x4, ${b.sixes || 0}x6)</span></span>`;
    } else {
      displayStatus = `<span style="color: var(--text-muted);">Did Not Bat</span>`;
      scoreDisplay = `<span class="player-runs" style="color: var(--text-muted); font-family: monospace;">-</span>`;
    }

    battingHtml += `
      <div class="player-stat-row" style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
        <span class="player-name" style="font-weight: 600; color: var(--text-primary); display: inline-flex; align-items: center;"><span class="player-name-hoverable" data-player-name="${b.name}">${b.name}</span> <span style="font-size: 0.8rem; font-weight: normal; margin-left: 6px; color: var(--text-muted);">(${displayStatus})</span></span>
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
        <div class="player-stat-row" style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
          <span class="player-name" style="font-weight: 600; color: #a5b4fc; display: inline-flex; align-items: center;"><span class="player-name-hoverable" data-player-name="${name}">${name}</span></span>
          <span class="player-runs" style="color: #a5b4fc; font-family: monospace;">Overs: ${overs} | Runs: ${stats.runs} | Wkts: ${stats.wickets} | Econ: ${econ}</span>
        </div>
      `;
    }
  });
  const bowlingContainer = document.getElementById('scorecard-bowling-rows');
  if (bowlingContainer) bowlingContainer.innerHTML = bowlingHtml;

  // Dynamic Scorecard Titles with Flags
  const scorecardTitle = document.getElementById('scorecard-title');
  if (scorecardTitle) {
    scorecardTitle.innerHTML = `🏆 Match Scorecard: ${TEAM_FLAGS[userTeamCode] || ''} ${SQUADS[userTeamCode].name} vs ${TEAM_FLAGS[oppTeamCode] || ''} ${SQUADS[oppTeamCode].name}`;
  }
  const battingHeader = document.getElementById('scorecard-batting-header');
  if (battingHeader) {
    battingHeader.innerHTML = `${TEAM_FLAGS[userTeamCode] || ''} ${SQUADS[userTeamCode].name} Batting`;
  }
  const bowlingHeader = document.getElementById('scorecard-bowling-header');
  if (bowlingHeader) {
    bowlingHeader.innerHTML = `${TEAM_FLAGS[oppTeamCode] || ''} ${SQUADS[oppTeamCode].name} Bowling`;
  }

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
    
    milestoneTimeout = setTimeout(() => {
      milestoneTimeout = null;
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
          if (isTestMatch) {
            const resumeMsg = overEnd ? "Over complete! Changing ends... next ball in 4s 🔄" : "Preparing next delivery... next ball in 3s ⚾";
            showCricketMessage(resumeMsg, overEnd ? 'success' : 'warning');
            
            isAutoBowlingTimeout = setTimeout(() => {
              bowlBall();
            }, overEnd ? 4000 : 3000);
          } else {
            const resumeMsg = overEnd ? "Over complete! Changing ends... next ball in 1.2s 🔄" : "Preparing next delivery... next ball in 1s ⚾";
            showCricketMessage(resumeMsg, overEnd ? 'success' : 'warning');
            
            isAutoBowlingTimeout = setTimeout(() => {
              bowlBall();
            }, overEnd ? 1200 : 1000);
          }
        }
      }
    }, 2000);
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
  const opponentPlayers = SQUADS[oppTeamCode].batters.filter(p => normalizePlayerName(p) !== normalizePlayerName(currentBowler.name));
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
  
  // Reset cache variables to force next frame SVG updates
  lastBallX = null; lastBallY = null; lastBallRadius = null; lastBallOpacity = null; lastBallFill = null;
  lastB1Y = null; lastB2Y = null; lastStrikerFill = null; lastNonStrikerFill = null; lastBowlerY = null; lastBowlerFill = null;
  lastBatX1 = null; lastBatY1 = null; lastBatX2 = null; lastBatY2 = null; lastBatTransformOrigin = null;
  lastIndicatorCy = null;

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
  const strikerNameEl = batterStrikerNameEl;
  const strikerStatsEl = batterStrikerStatsEl;
  const nonStrikerNameEl = batterNonStrikerNameEl;
  const nonStrikerStatsEl = batterNonStrikerStatsEl;

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
  
  if (ballEl) {
    let radius = 5;
    if (ball.loft) {
      let h = Math.sin(ball.loftProgress * Math.PI) * ball.maxLoftHeight;
      radius = 5 + h * 0.15;
    }
    const ballFill = isTestMatch ? '#be123c' : '#ffffff';
    const ballOpacity = (ball.state === 'IDLE') ? '0' : '1';
    
    if (ball.x !== lastBallX || ball.y !== lastBallY || radius !== lastBallRadius || ballOpacity !== lastBallOpacity || ballFill !== lastBallFill) {
      ballEl.setAttribute('cx', ball.x);
      ballEl.setAttribute('cy', ball.y);
      ballEl.setAttribute('r', radius);
      ballEl.style.opacity = ballOpacity;
      ballEl.setAttribute('fill', ballFill);
      
      lastBallX = ball.x;
      lastBallY = ball.y;
      lastBallRadius = radius;
      lastBallOpacity = ballOpacity;
      lastBallFill = ballFill;
    }
  }

  const shadowEl = document.getElementById('cricket-ball-shadow');
  if (shadowEl) {
    if (ball.state !== 'IDLE' && ball.state !== 'DEAD') {
      let shadowRadius = 5;
      let shadowBlur = 1;
      let opacity = 0.45;
      let offset = 0;
      if (ball.loft) {
        let h = Math.sin(ball.loftProgress * Math.PI) * ball.maxLoftHeight;
        shadowRadius = 5 + h * 0.1;
        shadowBlur = 1 + h * 0.25;
        opacity = Math.max(0.1, 0.45 - h * 0.008);
        offset = h * 0.4;
      }
      shadowEl.setAttribute('cx', ball.x);
      shadowEl.setAttribute('cy', ball.y + offset);
      shadowEl.setAttribute('r', shadowRadius);
      shadowEl.style.opacity = opacity;
      shadowEl.style.filter = `blur(${shadowBlur}px)`;
    } else {
      shadowEl.style.opacity = '0';
    }
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
    if (batsmen.batsman1Y !== lastB1Y || strikerFill !== lastStrikerFill) {
      strikerEl.setAttribute('cy', batsmen.batsman1Y);
      strikerEl.setAttribute('fill', strikerFill);
      lastB1Y = batsmen.batsman1Y;
      lastStrikerFill = strikerFill;
    }
  }
  if (nonStrikerEl) {
    if (batsmen.batsman2Y !== lastB2Y || nonStrikerFill !== lastNonStrikerFill) {
      nonStrikerEl.setAttribute('cy', batsmen.batsman2Y);
      nonStrikerEl.setAttribute('fill', nonStrikerFill);
      lastB2Y = batsmen.batsman2Y;
      lastNonStrikerFill = nonStrikerFill;
    }
  }
  
  const bowlerY = (bowlingDirection === 1) ? 115 : 335;
  if (bowlerEl) {
    if (bowlerY !== lastBowlerY || bowlerFill !== lastBowlerFill) {
      bowlerEl.setAttribute('cy', bowlerY);
      bowlerEl.setAttribute('fill', bowlerFill);
      lastBowlerY = bowlerY;
      lastBowlerFill = bowlerFill;
    }
  }
  
  if (batEl) {
    let x1 = 225;
    let y1 = batsmen.batsman1Y;
    let x2 = 225;
    let y2 = batsmen.batsman1Y;
    if (!batsmen.isRunning) {
      let batOffset = (bowlingDirection === 1) ? -13 : 13;
      x2 = 238;
      y2 = batsmen.batsman1Y + batOffset;
    }
    const batTransformOrigin = `225px ${y1}px`;
    
    if (x1 !== lastBatX1 || y1 !== lastBatY1 || x2 !== lastBatX2 || y2 !== lastBatY2 || batTransformOrigin !== lastBatTransformOrigin) {
      batEl.setAttribute('x1', x1);
      batEl.setAttribute('y1', y1);
      batEl.setAttribute('x2', x2);
      batEl.setAttribute('y2', y2);
      batEl.style.transformOrigin = batTransformOrigin;
      
      lastBatX1 = x1;
      lastBatY1 = y1;
      lastBatX2 = x2;
      lastBatY2 = y2;
      lastBatTransformOrigin = batTransformOrigin;
    }
  }
}

function drawFielders() {
  const group = fieldersGroupEl || document.getElementById('cricket-fielders-group');
  if (!group) return;
  
  const expectedChildCount = fielders.length * 2;
  if (group.children.length !== expectedChildCount) {
    group.innerHTML = '';
    fielders.forEach((f, idx) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '1.5');
      group.appendChild(circle);
      f.element = circle;

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#ffffff');
      text.setAttribute('font-size', '8px');
      text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('font-weight', '600');
      group.appendChild(text);
      f.textElement = text;
    });
  } else {
    fielders.forEach((f, idx) => {
      if (!f.element) {
        f.element = group.children[idx * 2];
      }
      if (!f.textElement) {
        f.textElement = group.children[idx * 2 + 1];
      }
    });
  }

  fielders.forEach((f, idx) => {
    const circle = f.element;
    const text = f.textElement;
    
    if (circle) {
      if (f.x !== f.lastX || f.y !== f.lastY || f.state !== f.lastState || (f.fumbleTimer > 0) !== (f.lastFumbleTimer > 0)) {
        circle.setAttribute('cx', f.x);
        circle.setAttribute('cy', f.y);
        circle.setAttribute('r', f.fumbleTimer > 0 || f.state === 'CHASING' ? '7' : '5.5');
        
        let fill = '#f59e0b';
        if (f.fumbleTimer > 0) fill = '#ef4444'; // Red for fumble state
        else if (f.state === 'CHASING') fill = '#eab308';
        else if (f.state === 'THROWING') fill = '#3b82f6';
        circle.setAttribute('fill', fill);
      }
    }
    
    if (text) {
      if (f.x !== f.lastX || f.y !== f.lastY || f.state !== f.lastState || (f.fumbleTimer > 0) !== (f.lastFumbleTimer > 0)) {
        text.setAttribute('x', f.x);
        text.setAttribute('y', f.y - 9);
        
        let label = f.name;
        if (f.fumbleTimer > 0) label += ' ⚠️';
        else if (f.state === 'CHASING') label += ' 🏃';
        else if (f.state === 'THROWING') label += ' 🎯';
        text.textContent = label;
      }
    }
    f.lastFumbleTimer = f.fumbleTimer;
    f.lastX = f.x;
    f.lastY = f.y;
    f.lastState = f.state;
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
  
  lastFrameTime = performance.now();
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
    if (timingIndicatorEl) {
      timingIndicatorEl.style.opacity = '0';
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
      const swingRot = (bowlingDirection === 1) ? -75 : 75;
      batEl.style.transform = `rotate(${swingRot}deg)`;
      triggerBatSwingTrail(swingRot);
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
    }, 50);
  } else {
    gameState = 'PLAYING';
    cricketHitBtn.disabled = true;
    cricketHitBtn.style.opacity = '0.5';
    cricketHitBtn.textContent = 'IN PLAY';
    
    // Hide the timing indicator gauge dot on miss
    if (timingIndicatorEl) {
      timingIndicatorEl.style.opacity = '0';
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
      const swingRot = (bowlingDirection === 1) ? -45 : 45;
      batEl.style.transform = `rotate(${swingRot}deg)`;
      triggerBatSwingTrail(swingRot);
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
  lastFrameTime = performance.now();
  gameLoopActive = true;
  gameLoopId = requestAnimationFrame(gameLoop);
  
  currentShotOutcome = res;
  const msg = res.message;
  const result = res.result;
  
  ball.state = 'HIT';

  // Introduce fielders' reaction delay to allow realistic run windows
  fielders.forEach(f => {
    f.reactionDelay = 150 + Math.random() * 200; // 150ms to 350ms reaction time
    f.fumbleTimer = 0;
    f.hasFumbled = false;
  });
  
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
  const floatingText = runsCompletedTextEl || document.getElementById('runs-completed-text');
  if (floatingText) {
    floatingText.textContent = `+${runCount} Run${runCount > 1 ? 's' : ''}`;
    floatingText.classList.remove('float-runs-animation');
    void floatingText.offsetWidth; // Force reflow to restart CSS animation
    floatingText.classList.add('float-runs-animation');
  }
}

function gameLoop(timestamp) {
  if (!gameLoopActive) return;

  if (!timestamp) timestamp = performance.now();
  if (!lastFrameTime) lastFrameTime = timestamp;
  let elapsed = timestamp - lastFrameTime;
  if (elapsed > 100) elapsed = 16.666;
  const dt = elapsed / 16.666;
  lastFrameTime = timestamp;

  if (ball.state === 'BOWLED') {
    if (bowlingDirection === 1) {
      ball.y += currentBallSpeedY * dt;
      
      // Dynamic swing/spin physics
      if (ballStyle === "Off-spin") {
        if (!hasBounced && ball.y >= bouncePointY) {
          hasBounced = true;
          currentBallSpeedX = spinBreakDirection * (0.8 + Math.random() * 0.6);
          playSfx('click'); // bounce sound
        }
      } else {
        currentBallSpeedX += Math.sin(ball.y / 25) * 0.05 * dt;
      }
      ball.x += currentBallSpeedX * dt;

      if (ball.y >= 315) {
        ball.y = 315;
        ball.state = 'DEAD';
        handleMissOutcome();
      }
    } else {
      ball.y -= currentBallSpeedY * dt;
      
      if (ballStyle === "Off-spin") {
        if (!hasBounced && ball.y <= bouncePointY) {
          hasBounced = true;
          currentBallSpeedX = spinBreakDirection * (0.8 + Math.random() * 0.6);
          playSfx('click'); // bounce sound
        }
      } else {
        currentBallSpeedX += Math.sin((450 - ball.y) / 25) * 0.05 * dt;
      }
      ball.x += currentBallSpeedX * dt;

      if (ball.y <= 135) {
        ball.y = 135;
        ball.state = 'DEAD';
        handleMissOutcome();
      }
    }
    
    // Update timing indicator dot in SVG gauge
    if (timingIndicatorEl) {
      let gy = ((ball.y - 115) / 220) * 250;
      if (gy !== lastIndicatorCy) {
        timingIndicatorEl.setAttribute('cy', gy);
        lastIndicatorCy = gy;
      }
    }
  } else if (ball.state === 'HIT') {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (!ball.loft) {
      ball.vx *= Math.pow(0.985, dt);
      ball.vy *= Math.pow(0.985, dt);
    } else {
      ball.loftProgress += (1 / ball.loftDuration) * dt;
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
    if (distance > throwSpeed * dt) {
      ball.x += (dx / distance) * throwSpeed * dt;
      ball.y += (dy / distance) * throwSpeed * dt;
    } else {
      ball.x = ball.targetX;
      ball.y = ball.targetY;
      ball.state = 'DEAD';
      checkRunOut();
    }
  }

  // Update all fielders
  fielders.forEach(f => {
    f.update(ball.x, ball.y, f === activeFielder, dt);
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
        // Introduce fumble logic (12% chance if not fumbled yet on this delivery)
        if (!activeFielder.hasFumbled && Math.random() < 0.12) {
          activeFielder.hasFumbled = true;
          activeFielder.fumbleTimer = 750; // 750ms fumble duration
          activeFielder.state = 'IDLE';
          
          playSfx('fail');
          showCricketMessage("Fumble in the outfield! ⚠️", "warning");
          addCommentary(`Fumble! ${activeFielder.name} misjudged it and fumbled the ball momentarily!`, 'fumble');
          
          // Ball rolls slightly away during fumble
          ball.vx = (Math.random() - 0.5) * 0.8;
          ball.vy = (Math.random() - 0.5) * 0.8;
        } else {
          activeFielder.state = 'THROWING';
          ball.state = 'DEAD';
          
          // Introduce human aim delay (200ms - 450ms)
          let aimDelay = 200 + Math.random() * 250;
          fielderThrowTimeout = setTimeout(() => {
            fielderThrowTimeout = null;
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
          }, aimDelay);
        }
      }
    }
  }

  if (batsmen.isRunning) {
    let dir1 = Math.sign(batsmen.target1Y - batsmen.batsman1Y);
    batsmen.batsman1Y += dir1 * batsmen.speed * dt;
    if (dir1 > 0 && batsmen.batsman1Y >= batsmen.target1Y) batsmen.batsman1Y = batsmen.target1Y;
    if (dir1 < 0 && batsmen.batsman1Y <= batsmen.target1Y) batsmen.batsman1Y = batsmen.target1Y;

    let dir2 = Math.sign(batsmen.target2Y - batsmen.batsman2Y);
    batsmen.batsman2Y += dir2 * batsmen.speed * dt;
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
  if (runs === 6) {
    triggerTvBanner("SIX!", "OUT OF THE PARK! 💥", "six-theme");
  } else if (runs === 4) {
    triggerTvBanner("FOUR!", "CRACKED TO THE ROPE! 🏏", "four-theme");
  }

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
  if (batter1 && batter2) {
    let activeBatter = (strikerOnStrike === 1) ? batter1 : batter2;
    triggerTvBanner("WICKET!", `${activeBatter.name} CAUGHT! 🛑`, "wicket-theme");
  }

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

    if (batter1 && batter2) {
      let outBatter = (outBatterNum === 1) ? batter1 : batter2;
      triggerTvBanner("WICKET!", `${outBatter.name} RUN OUT! 🛑`, "wicket-theme");
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
      triggerTvBanner("WICKET!", `${activeBatter.name} BOWLED! 🛑`, "wicket-theme");
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

function triggerTvBanner(title, subtitle, themeClass) {
  const banner = document.getElementById('cricket-tv-event-banner');
  const titleEl = document.getElementById('tv-banner-title');
  const subtitleEl = document.getElementById('tv-banner-subtitle');
  if (!banner || !titleEl || !subtitleEl) return;
  
  if (tvBannerTimeout1) {
    clearTimeout(tvBannerTimeout1);
    tvBannerTimeout1 = null;
  }
  if (tvBannerTimeout2) {
    clearTimeout(tvBannerTimeout2);
    tvBannerTimeout2 = null;
  }

  titleEl.textContent = title;
  subtitleEl.textContent = subtitle;
  
  banner.className = 'tv-event-banner show ' + themeClass;
  
  tvBannerTimeout1 = setTimeout(() => {
    tvBannerTimeout1 = null;
    banner.classList.remove('show');
    tvBannerTimeout2 = setTimeout(() => {
      tvBannerTimeout2 = null;
      banner.className = 'tv-event-banner hidden';
    }, 450);
  }, 2200);
}

function triggerBatSwingTrail(angle) {
  const trail = document.getElementById('cricket-bat-trail');
  if (!trail) return;
  
  const pivotX = 225;
  const pivotY = batsmen.batsman1Y;
  const r = 18;
  
  const startAngle = (bowlingDirection === 1) ? (315 * Math.PI / 180) : (135 * Math.PI / 180);
  const endAngle = startAngle + (angle * Math.PI / 180);
  
  const sx = pivotX + r * Math.cos(startAngle);
  const sy = pivotY + r * Math.sin(startAngle);
  const ex = pivotX + r * Math.cos(endAngle);
  const ey = pivotY + r * Math.sin(endAngle);
  
  const sweepFlag = angle < 0 ? 0 : 1;
  const d = `M ${sx} ${sy} A ${r} ${r} 0 0 ${sweepFlag} ${ex} ${ey}`;
  
  trail.setAttribute('d', d);
  trail.style.opacity = '1';
  
  setTimeout(() => {
    trail.style.opacity = '0';
  }, 250);
}

function changeBowlerForNewOver() {
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
      
      changeBowlerForNewOver();
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
      changeBowlerForNewOver();

      if (isTestMatch) {
        const msg = overEnd ? "Over complete! Changing ends... next ball in 4s 🔄" : "Preparing next delivery... next ball in 3s ⚾";
        showCricketMessage(msg, overEnd ? 'success' : 'warning');
        
        isAutoBowlingTimeout = setTimeout(() => {
          bowlBall();
        }, overEnd ? 4000 : 3000);
      } else {
        const msg = overEnd ? "Over complete! Changing ends... next ball in 1.5s 🔄" : "Preparing next delivery... next ball in 1s ⚾";
        showCricketMessage(msg, overEnd ? 'success' : 'warning');
        
        isAutoBowlingTimeout = setTimeout(() => {
          bowlBall();
        }, overEnd ? 1500 : 1000);
      }
    }
  }
  
  updateCricketUI();
}

function clearAllGameplayTimeouts() {
  if (isAutoBowlingTimeout) {
    clearTimeout(isAutoBowlingTimeout);
    isAutoBowlingTimeout = null;
  }
  if (fielderThrowTimeout) {
    clearTimeout(fielderThrowTimeout);
    fielderThrowTimeout = null;
  }
  if (milestoneTimeout) {
    clearTimeout(milestoneTimeout);
    milestoneTimeout = null;
  }
  if (tvBannerTimeout1) {
    clearTimeout(tvBannerTimeout1);
    tvBannerTimeout1 = null;
  }
  if (tvBannerTimeout2) {
    clearTimeout(tvBannerTimeout2);
    tvBannerTimeout2 = null;
  }
  milestoneQueue = [];
  isMilestoneCelebrating = false;
}

function toggleCricketPause() {
  if (cricketState.game_over) return;
  if (isBeginningModalOpen()) return; // Don't pause if squad selection / playing XI is open
  if (isMilestoneCelebrating) return; // Don't pause during milestone toasts

  isCricketPaused = !isCricketPaused;
  const pauseModal = document.getElementById('cricket-pause-modal');
  
  if (isCricketPaused) {
    // PAUSING
    // Stop the game loop
    gameLoopActive = false;
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }
    
    // Pause auto-bowling timeout if scheduled
    if (isAutoBowlingTimeout) {
      clearTimeout(isAutoBowlingTimeout);
      isAutoBowlingTimeout = null;
      pausedAutoBowling = true;
    } else {
      pausedAutoBowling = false;
    }
    
    // Show overlay
    if (pauseModal) {
      pauseModal.classList.remove('hidden');
    }
    
    // Play SFX click
    playSfx('click');
    showCricketMessage("Match Paused. Press 8 to Resume.", "warning");
  } else {
    // RESUMING
    // Hide overlay
    if (pauseModal) {
      pauseModal.classList.add('hidden');
    }
    
    // Play SFX click
    playSfx('click');
    showCricketMessage("Resuming match...", "success");
    
    // Restart game loop if needed
    if (gameState === 'BOWLING' || gameState === 'PLAYING') {
      lastFrameTime = performance.now();
      gameLoopActive = true;
      gameLoopId = requestAnimationFrame(gameLoop);
    }
    
    // Resume auto-bowling if it was paused
    if (pausedAutoBowling) {
      const overEnd = cricketState.balls_faced > 0 && cricketState.balls_faced % 6 === 0;
      const delay = isTestMatch ? (overEnd ? 4000 : 3000) : (overEnd ? 1500 : 1000);
      isAutoBowlingTimeout = setTimeout(() => {
        bowlBall();
      }, delay);
      const msg = isTestMatch 
        ? (overEnd ? "Over complete! Changing ends... next ball in 4s 🔄" : "Preparing next delivery... next ball in 3s ⚾")
        : (overEnd ? "Over complete! Changing ends... next ball in 1.5s 🔄" : "Preparing next delivery... next ball in 1s ⚾");
      showCricketMessage(msg, overEnd ? 'success' : 'warning');
    }
  }
}

// Navigation Logic
function getActiveView() {
  const views = [mainMenu, numberGuessGame, hangmanGameView, cricketGameView];
  return views.find(v => v && !v.classList.contains('hidden'));
}

function transitionView(fromView, toView, onMiddle) {
  if (!fromView || !toView) {
    if (onMiddle) onMiddle();
    if (toView) toView.classList.remove('hidden');
    return;
  }

  fromView.classList.add('fade-out');
  
  setTimeout(() => {
    fromView.classList.add('hidden');
    fromView.classList.remove('fade-out');
    
    if (onMiddle) onMiddle();
    
    toView.classList.remove('hidden');
    toView.classList.add('fade-in');
    
    // Force reflow
    void toView.offsetWidth;
    
    toView.classList.add('fade-in-active');
    
    setTimeout(() => {
      toView.classList.remove('fade-in', 'fade-in-active');
    }, 250);
  }, 220);
}

function showMenu() {
  gameLoopActive = false;
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
  clearAllGameplayTimeouts();
  isCricketPaused = false;
  pausedAutoBowling = false;
  const pauseModal = document.getElementById('cricket-pause-modal');
  if (pauseModal) {
    pauseModal.classList.add('hidden');
  }
  loadStats();
  
  const activeView = getActiveView();
  if (activeView && activeView !== mainMenu) {
    transitionView(activeView, mainMenu, () => {
      document.body.classList.remove('test-match-active');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.warn(err));
      }
    });
  } else {
    document.body.classList.remove('test-match-active');
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.warn(err));
    }
    mainMenu.classList.remove('hidden');
    numberGuessGame.classList.add('hidden');
    hangmanGameView.classList.add('hidden');
    if (cricketGameView) cricketGameView.classList.add('hidden');
  }
  
  if (cricketScorecardModal) cricketScorecardModal.classList.add('hidden');
  if (cricketPlayingXiModal) cricketPlayingXiModal.classList.add('hidden');
}

function showGame(gameId) {
  console.log('showGame called with gameId:', gameId);
  if (gameId === 'cricket') {
    playSfx('click');
    if (cricketModeSelectModal) {
      cricketModeSelectModal.classList.remove('hidden');
    }
    return;
  }
  playSfx('click');
  gameLoopActive = false;
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
  clearAllGameplayTimeouts();

  const activeView = getActiveView();
  let targetView = null;
  let setupCallback = null;

  if (gameId === 'number-guess') {
    targetView = numberGuessGame;
    setupCallback = () => {
      initGame();
    };
  } else if (gameId === 'hangman') {
    targetView = hangmanGameView;
    setupCallback = () => {
      initHangman();
    };
  } else if (gameId === 'mini-cricket') {
    targetView = cricketGameView;
    setupCallback = () => {
      isTestMatch = false;
      initCricket();
    };
  } else if (gameId === 'cricket-test') {
    targetView = cricketGameView;
    setupCallback = () => {
      isTestMatch = true;
      document.body.classList.add('test-match-active');
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
      }
      initCricket();
    };
  }

  if (activeView && targetView && activeView !== targetView) {
    transitionView(activeView, targetView, () => {
      if (gameId !== 'cricket-test') {
        document.body.classList.remove('test-match-active');
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.warn(err));
        }
      }
      if (setupCallback) setupCallback();
    });
  } else {
    mainMenu.classList.add('hidden');
    numberGuessGame.classList.add('hidden');
    hangmanGameView.classList.add('hidden');
    if (cricketGameView) cricketGameView.classList.add('hidden');

    if (gameId !== 'cricket-test') {
      document.body.classList.remove('test-match-active');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.warn(err));
      }
    }
    if (setupCallback) setupCallback();
    if (targetView) targetView.classList.remove('hidden');
  }
}

function initGame() {
  secretNumber = Math.floor(Math.random() * 100) + 1;
  attempts = 0;
  isGameOver = false;
  guessHistory = [];
  
  // Reset Bounds for Range visualizer
  minBound = 1;
  maxBound = 100;
  updateRangeUI(null);
  
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

// Update bounds visual range UI for Number Guessing
function updateRangeUI(lastGuess) {
  const minEl = document.getElementById('range-min');
  const maxEl = document.getElementById('range-max');
  const highlightBar = document.getElementById('range-highlight-bar');
  const marker = document.getElementById('range-last-guess-marker');
  
  if (minEl) minEl.textContent = minBound;
  if (maxEl) maxEl.textContent = maxBound;
  
  if (highlightBar) {
    const leftPercent = ((minBound - 1) / 99) * 100;
    const rightPercent = ((maxBound - 1) / 99) * 100;
    const widthPercent = Math.max(0, rightPercent - leftPercent);
    highlightBar.style.left = `${leftPercent}%`;
    highlightBar.style.width = `${widthPercent}%`;
  }
  
  if (marker) {
    if (lastGuess !== null && lastGuess >= 1 && lastGuess <= 100) {
      const markerPercent = ((lastGuess - 1) / 99) * 100;
      marker.style.left = `${markerPercent}%`;
      marker.style.display = 'block';
    } else {
      marker.style.display = 'none';
    }
  }
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
  
  // Guard: Avoid wasting attempts if guessing outside current visual range
  if (guess < minBound || guess > maxBound) {
    showMessage(`Out of current bounds! Guess a number between ${minBound} and ${maxBound}.`, 'warning');
    playSfx('fail');
    guessInput.value = '';
    guessInput.focus();
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
    minBound = Math.max(minBound, guess + 1);
    updateRangeUI(guess);
    guessInput.value = '';
    guessInput.focus();
  } else if (guess > secretNumber) {
    direction = '↓';
    chipClass = diff <= 10 ? 'close' : 'high';
    showMessage('Too high! Try again.', 'warning');
    playSfx('click');
    maxBound = Math.min(maxBound, guess - 1);
    updateRangeUI(guess);
    guessInput.value = '';
    guessInput.focus();
  } else {
    direction = '🎉';
    chipClass = 'correct';
    
    // Game Won
    isGameOver = true;
    minBound = guess;
    maxBound = guess;
    updateRangeUI(guess);
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
  let availableWords = hangmanWords.filter(w => !recentHangmanWords.includes(w.word));
  if (availableWords.length === 0) {
    availableWords = hangmanWords;
    recentHangmanWords = [];
  }
  
  const chosen = availableWords[Math.floor(Math.random() * availableWords.length)];
  currentWord = chosen.word;
  currentCategory = chosen.category;
  
  recentHangmanWords.push(currentWord);
  if (recentHangmanWords.length > 100) {
    recentHangmanWords.shift();
  }
  
  try {
    localStorage.setItem('hangmanRecentWords', JSON.stringify(recentHangmanWords));
  } catch (e) {
    console.error('Error writing to localStorage', e);
  }

  // Update Category display in HTML
  const categoryNameEl = document.getElementById('hangman-category-name');
  if (categoryNameEl) {
    categoryNameEl.textContent = currentCategory;
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
if (form) form.addEventListener('submit', handleGuess);
if (restartBtn) restartBtn.addEventListener('click', initGame);
if (backBtn) backBtn.addEventListener('click', showMenu);

if (hangmanForm) hangmanForm.addEventListener('submit', handleHangmanGuess);
if (hangmanRestartBtn) hangmanRestartBtn.addEventListener('click', initHangman);
if (hangmanBackBtn) hangmanBackBtn.addEventListener('click', showMenu);

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

const resumeBtn = document.getElementById('cricket-resume-btn');
if (resumeBtn) {
  resumeBtn.addEventListener('click', toggleCricketPause);
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
      const name = opt.getAttribute('data-name');
      const flagImgEl = opt.querySelector('.country-flag-img');

      // Update trigger display
      if (flagEl && flagImgEl) {
        flagEl.innerHTML = flagImgEl.outerHTML;
      }
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
document.addEventListener('click', (e) => {
  document.querySelectorAll('.team-custom-select.open').forEach(el => el.classList.remove('open'));
});

// Initial cross-highlight on load
updateTeamCardCrossHighlight();


window.addEventListener('keydown', (e) => {
  if (cricketGameView && !cricketGameView.classList.contains('hidden')) {
    if (e.key === '8' || e.code === 'Numpad8' || e.code === 'Digit8') {
      e.preventDefault();
      toggleCricketPause();
      return;
    }
    
    if (isCricketPaused) {
      e.preventDefault();
      return;
    }

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
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  });
});

if (cricketModeCloseBtn) {
  cricketModeCloseBtn.addEventListener('click', () => {
    playSfx('click');
    cricketModeSelectModal.classList.add('hidden');
  });
}

if (modeQuickMatchBtn) {
  modeQuickMatchBtn.addEventListener('click', () => {
    cricketModeSelectModal.classList.add('hidden');
    showGame('mini-cricket');
  });
}

if (modeTestCricketBtn) {
  modeTestCricketBtn.addEventListener('click', () => {
    cricketModeSelectModal.classList.add('hidden');
    showGame('cricket-test');
  });
}

if (cricketModeSelectModal) {
  cricketModeSelectModal.addEventListener('click', (e) => {
    if (e.target === cricketModeSelectModal) {
      playSfx('click');
      cricketModeSelectModal.classList.add('hidden');
    }
  });
}

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

// Splash Screen handling
const splash = document.getElementById('splash-screen');
if (splash) {
  // Wait for the loader bar animation to complete (1.8s) + a small delay for premium feel
  setTimeout(() => {
    splash.classList.add('fade-out');
    // Remove it from layout after transition completes to save resources
    setTimeout(() => {
      splash.style.display = 'none';
    }, 800); // matching the 0.8s CSS transition duration
  }, 2200);
}

// Player Stats Hover Tooltip Logic
function getPlayerTooltipHTML(name, stats) {
  const normName = normalizePlayerName(name);
  const role = PLAYER_ROLES[normName] || "Batter";
  
  // Safe defaults for batting & bowling objects
  const batting = (stats && stats.batting) || {};
  const battingInnings = batting.innings || 0;
  const battingRuns = batting.runs || 0;
  const battingDismissals = batting.dismissals || 0;
  const battingBalls = batting.balls || 0;
  const battingFours = batting.fours || 0;
  const battingSixes = batting.sixes || 0;
  const battingFiftyCount = batting.fiftyCount || 0;
  const battingHundredCount = batting.hundredCount || 0;
  const battingHighestScore = batting.highestScore || 0;
  const battingHighestScoreNotOut = batting.highestScoreNotOut || false;

  const bowling = (stats && stats.bowling) || {};
  const bowlingInnings = bowling.innings || 0;
  const bowlingWickets = bowling.wickets || 0;
  const bowlingBallsBowled = bowling.ballsBowled || 0;
  const bowlingRunsConceded = bowling.runsConceded || 0;
  const bowlingBestWickets = bowling.bestWickets || 0;
  const bowlingBestRuns = bowling.bestRuns || 0;

  // Dynamic batting calculations
  const batAvg = battingDismissals > 0 ? (battingRuns / battingDismissals).toFixed(2) : "-";
  const batSR = battingBalls > 0 ? ((battingRuns / battingBalls) * 100).toFixed(2) : "0.00";
  const highestScoreStr = battingHighestScore + (battingHighestScoreNotOut ? "*" : "");
  
  // Dynamic bowling calculations
  const bowlAvg = bowlingWickets > 0 ? (bowlingRunsConceded / bowlingWickets).toFixed(2) : "-";
  const bestFiguresStr = bowlingBestWickets > 0 || bowlingBestRuns > 0 ? `${bowlingBestWickets}/${bowlingBestRuns}` : "-";
  
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
            <span class="tooltip-stat-value">${battingInnings}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Runs</span>
            <span class="tooltip-stat-value">${battingRuns}</span>
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
            <span class="tooltip-stat-value">${battingFours}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Sixes</span>
            <span class="tooltip-stat-value">${battingSixes}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">50s/100s</span>
            <span class="tooltip-stat-value">${battingFiftyCount}/${battingHundredCount}</span>
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
            <span class="tooltip-stat-value">${bowlingInnings}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Wickets</span>
            <span class="tooltip-stat-value">${bowlingWickets}</span>
          </div>
          <div class="tooltip-stat-item">
            <span class="tooltip-stat-label">Balls</span>
            <span class="tooltip-stat-value">${bowlingBallsBowled}</span>
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
