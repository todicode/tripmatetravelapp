const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.resolve(__dirname, '../../template_gui/tripsStore.js');
const outputPath = path.resolve(__dirname, '../src/data/destinations.json');
const source = fs.readFileSync(sourcePath, 'utf8')
  .replace(/export \{ TripsStore, OSM_DESTINATIONS, KNOWN_COORDINATES \};/, '')
  .replace(/export default TripsStore;/, '');
const { destinations, knownCoordinates } = vm.runInNewContext(
  `${source}\n({ destinations: OSM_DESTINATIONS, knownCoordinates: KNOWN_COORDINATES })`,
  { window: undefined },
);

// The Explore template includes Hà Giang in its quick picks, while its curated
// destination list only contains ten cities. Keep the chip and its real map pin.
const haGiang = knownCoordinates.hagiang;
if (!destinations.hagiang && haGiang) {
  destinations.hagiang = {
    name: haGiang.name,
    province: haGiang.province,
    fullName: `${haGiang.name}, Việt Nam`,
    coords: haGiang.coords,
    dayPlans: [],
    hotSpots: [],
  };
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(destinations, null, 2)}\n`, 'utf8');
console.log(`Imported ${Object.keys(destinations).length} destinations from template_gui.`);
