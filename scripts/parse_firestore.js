const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join('C:', 'Users', 'Aravinth', '.gemini', 'antigravity',
  'brain', '364f96d8-4df6-47b5-b676-488cfea3c8e1', '.system_generated',
  'steps', '52', 'content.md');

let raw = fs.readFileSync(RAW_FILE, 'utf8');
raw = raw.substring(raw.indexOf('{'));
const firestoreData = JSON.parse(raw);

function extractValue(field) {
  if (!field) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('arrayValue' in field) {
    if (!field.arrayValue.values) return [];
    return field.arrayValue.values.map(extractValue);
  }
  if ('mapValue' in field) {
    const result = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
      result[k] = extractValue(v);
    }
    return result;
  }
  return null;
}

const games = firestoreData.documents.map(doc => {
  const fields = doc.fields;
  const docId = doc.name.split('/').pop();
  return {
    id: docId,
    title: extractValue(fields.title) || '',
    description: extractValue(fields.description) || '',
    region: extractValue(fields.region) || '',
    location: extractValue(fields.location) || extractValue(fields.region) || '',
    imageUrl: extractValue(fields.imageUrl) || '',
    category: extractValue(fields.category) || 'All',
    intensity: extractValue(fields.intensity) || 'Medium',
    players: extractValue(fields.players) || '',
    occasion: extractValue(fields.occasion) || '',
    tags: extractValue(fields.tags) || [],
    equipment: extractValue(fields.equipment) || [],
    howToPlay: extractValue(fields.howToPlay) || [],
    rating: extractValue(fields.rating) || 0,
    views: extractValue(fields.views) || 0,
    reviewCount: extractValue(fields.reviewCount) || 0,
    likes: extractValue(fields.likes) || 0,
    createdAt: extractValue(fields.createdAt) || null,
  };
});

games.sort((a, b) => a.title.localeCompare(b.title));

const regionStats = {};
games.forEach(g => { regionStats[g.region] = (regionStats[g.region] || 0) + 1; });

const categoryStats = {};
games.forEach(g => { categoryStats[g.category] = (categoryStats[g.category] || 0) + 1; });

const api = {
  api: "PlayPal API",
  version: "1.0.0",
  description: "A free, open-source API of traditional games from across South Asia.",
  author: "PlayPal Team",
  license: "MIT",
  lastUpdated: new Date().toISOString(),
  totalGames: games.length,
  categories: [...new Set(games.map(g => g.category))].sort(),
  regions: [...new Set(games.map(g => g.region))].sort(),
  statistics: {
    totalGames: games.length,
    totalRegions: Object.keys(regionStats).length,
    totalCategories: Object.keys(categoryStats).length,
    gamesByRegion: regionStats,
    gamesByCategory: categoryStats,
  },
  games: games,
};

const outputDir = path.join(__dirname, '..');

fs.writeFileSync(path.join(outputDir, 'v1', 'games.json'), JSON.stringify(api, null, 2), 'utf8');

const regionDir = path.join(outputDir, 'v1', 'regions');
fs.mkdirSync(regionDir, { recursive: true });
const regionGroups = {};
games.forEach(g => {
  const key = g.region.toLowerCase().replace(/\s+/g, '-');
  if (!regionGroups[key]) regionGroups[key] = { region: g.region, games: [] };
  regionGroups[key].games.push(g);
});
for (const [key, data] of Object.entries(regionGroups)) {
  fs.writeFileSync(path.join(regionDir, `${key}.json`), JSON.stringify({
    api: "PlayPal API", version: "1.0.0", region: data.region,
    totalGames: data.games.length, games: data.games,
  }, null, 2), 'utf8');
}

const categoryDir = path.join(outputDir, 'v1', 'categories');
fs.mkdirSync(categoryDir, { recursive: true });
const categoryGroups = {};
games.forEach(g => {
  const key = g.category.toLowerCase().replace(/\s+/g, '-');
  if (!categoryGroups[key]) categoryGroups[key] = { category: g.category, games: [] };
  categoryGroups[key].games.push(g);
});
for (const [key, data] of Object.entries(categoryGroups)) {
  fs.writeFileSync(path.join(categoryDir, `${key}.json`), JSON.stringify({
    api: "PlayPal API", version: "1.0.0", category: data.category,
    totalGames: data.games.length, games: data.games,
  }, null, 2), 'utf8');
}

const gameDir = path.join(outputDir, 'v1', 'game');
fs.mkdirSync(gameDir, { recursive: true });
games.forEach(g => {
  fs.writeFileSync(path.join(gameDir, `${g.id}.json`), JSON.stringify({
    api: "PlayPal API", version: "1.0.0", game: g,
  }, null, 2), 'utf8');
});

fs.writeFileSync(path.join(outputDir, 'v1', 'stats.json'), JSON.stringify({
  api: "PlayPal API", version: "1.0.0", lastUpdated: new Date().toISOString(),
  statistics: api.statistics, categories: api.categories, regions: api.regions,
}, null, 2), 'utf8');

console.log('PlayPal API generated!');
console.log(`  Games: ${games.length} | Regions: ${Object.keys(regionStats).length} | Categories: ${Object.keys(categoryStats).length}`);
