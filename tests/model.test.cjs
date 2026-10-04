const test=require('node:test');
const assert=require('node:assert/strict');
const {AREAS,FOOD,DEFAULT_FILTERS,cleanFilters,distanceMeters,filterFoods,mapPoint}=require('../model.js');
test('each area returns only its nearby fixtures, in distance order',()=>{
  for(const area of AREAS){const results=filterFoods(DEFAULT_FILTERS,area);assert.equal(results.length,4);assert.ok(results.every(f=>f.area===area.id));assert.deepEqual(results.map(f=>f.meters),[320,460,680,810]);}
});
test('radius expands results and includes nearby fixtures from adjacent areas',()=>{
  assert.equal(filterFoods({...DEFAULT_FILTERS,range:500},AREAS[0]).length,2);
  const results=filterFoods({...DEFAULT_FILTERS,range:5000},AREAS[0]);
  assert.equal(results.length,8);assert.ok(results.every(f=>f.meters<=5000));assert.ok(!results.some(f=>f.area==='bangsar'));
});
test('combined filters give expected matches and a recoverable empty result',()=>{
  assert.deepEqual(filterFoods({...DEFAULT_FILTERS,range:5000,budget:true,onlyOpen:true},AREAS[0]).map(f=>f.id),['dumpling','miso','klcc-miso']);
  assert.equal(filterFoods({...DEFAULT_FILTERS,category:'sweet',onlyOpen:true},AREAS[0]).length,0);
});
test('search supports words in any order and trims input',()=>{
  assert.deepEqual(filterFoods({...DEFAULT_FILTERS,query:' Bar ramen '},AREAS[0]).map(f=>f.id),['ramen']);
  assert.deepEqual(filterFoods({...DEFAULT_FILTERS,query:'BURGER'},AREAS[0]).map(f=>f.id),['burger']);
});
test('corrupt preferences cannot break filtering',()=>{
  assert.deepEqual(cleanFilters(null),DEFAULT_FILTERS);
  assert.deepEqual(cleanFilters({range:-1,category:'bad',query:42,onlyOpen:'true',budget:1}),DEFAULT_FILTERS);
  assert.equal(cleanFilters({query:'x'.repeat(200)}).query.length,100);
});
test('GPS distance and map projection derive from coordinates',()=>{
  const f=FOOD[0];assert.equal(distanceMeters(f,f),0);
  assert.ok(distanceMeters({lat:0,lng:0},f)>500000);
  const p=mapPoint(f,AREAS[0],1000);assert.ok(p.x>=14&&p.x<=86&&p.y>=20&&p.y<=74);
  assert.deepEqual(mapPoint(AREAS[0],AREAS[0],1000),{x:50,y:47});
  assert.equal(filterFoods(DEFAULT_FILTERS,{lat:0,lng:0}).length,0);
});
