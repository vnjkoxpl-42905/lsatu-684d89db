import { OPENING_COURSE_PATH } from '../../../src/bootcamps/conditionals/openingCoursePath';
import { getSourceWorksheetDrill, sourceWorksheetDrills } from '../../../src/bootcamps/conditionals/content/sourceWorksheetDrills';
console.log(JSON.stringify({ uniqueSourceItems: new Set(sourceWorksheetDrills.flatMap(set => set.items.map(item => item.id))).size, worksheetRuns: OPENING_COURSE_PATH.filter(step => step.type === 'drill').flatMap(step => { const set = getSourceWorksheetDrill(step.id); return set ? [{ id: step.id, count: set.items.length }] : []; }) }));
