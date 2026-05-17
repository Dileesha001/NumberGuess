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

let localStorageMock = {};
let currentWord = '';

function initHangman() {
  let recentWords = [];
  try {
    const stored = localStorageMock['hangmanRecentWords'];
    if (stored) {
      recentWords = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading from localStorage', e);
  }

  let availableWords = hangmanWords.filter(word => !recentWords.includes(word));
  if (availableWords.length === 0) {
    availableWords = hangmanWords;
  }
  
  currentWord = availableWords[Math.floor(Math.random() * availableWords.length)];
  
  recentWords.push(currentWord);
  if (recentWords.length > 100) {
    recentWords.shift();
  }
  
  try {
    localStorageMock['hangmanRecentWords'] = JSON.stringify(recentWords);
  } catch (e) {
    console.error('Error writing to localStorage', e);
  }
  
  return currentWord;
}

const words = [];
for(let i=0; i<10; i++) {
  words.push(initHangman());
}
console.log(words);
