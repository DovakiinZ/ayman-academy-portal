import fs from 'fs';

const schema = JSON.parse(fs.readFileSync('schema.json', 'utf8'));

const sectionsDef = schema.definitions.lesson_sections;
console.log("== LESSONS SECTIONS ==");
console.log("properties:", Object.keys(sectionsDef?.properties || {}));
console.log("description:", sectionsDef?.description);

const lessonsDef = schema.definitions.lessons;
console.log("\n== LESSONS ==");
console.log("properties:", Object.keys(lessonsDef?.properties || {}));
console.log("description:", lessonsDef?.description);

// Look for relationships in the paths parameter
const paths = schema.paths['/lessons'];
console.log("\n== LESSONS PATH PARAMETERS ==");
if(paths && paths.get && paths.get.parameters) {
   const selectParam = paths.get.parameters.find(p => p.name === 'select');
   console.log("Select ENUM values:", selectParam?.items?.enum?.filter(e => e.includes('lesson_sections')));
}

const sectionsPaths = schema.paths['/lesson_sections'];
console.log("\n== SECTIONS PATH PARAMETERS ==");
if(sectionsPaths && sectionsPaths.get && sectionsPaths.get.parameters) {
   const selectParam2 = sectionsPaths.get.parameters.find(p => p.name === 'select');
   console.log("Select ENUM values:", selectParam2?.items?.enum?.filter(e => e.includes('lessons')));
}
