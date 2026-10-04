// Fictional fixture data and pure browsing logic.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NearbyModel=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';


// All places, review text, prices, ratings, hours, and distances are fictional fixtures.
// Stock photos came from the supplied interface; there are no live social posts here.
const photos = [
  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=88',
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=88',
  'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=1200&q=88',
  'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=88'
];
const baseFood = [
  {id:'ramen',dish:'Black Garlic Ramen',restaurant:'Ramen Bar',meters:320,price:24,rating:4.6,count:128,category:'meals',open:true,hours:'11am–10pm',source:'Instagram',img:photos[0],description:'Rich broth, springy noodles, and a little black garlic oil.',google:['Rich, comforting broth. The black garlic makes it.','Good noodles and a generous portion. A nice lunch stop.'],social:'The garlic oil is the highlight. A bowl I would come back for.',tiktok:'A close look at the noodles, broth, and that soft egg.'},
  {id:'dumpling',dish:'Crispy Xiao Long Bao',restaurant:'Dumpling House',meters:460,price:18,rating:4.5,count:86,category:'meals',open:true,hours:'10am–9pm',source:'TikTok',img:photos[1],description:'Juicy dumplings with a crisp base. Best shared while hot.',google:['Loved the juicy filling. Eat them while they are hot.','The crispy base is great. I would order another plate.'],social:'A dumpling stop for the next lunch break. Crispy underneath, juicy inside.',tiktok:'Breaking open a dumpling and trying the first bite.'},
  {id:'burger',dish:'Smash Cheeseburger',restaurant:'Fifty/Fifty',meters:680,price:22,rating:4.7,count:215,category:'meals',open:true,hours:'12pm–11pm',source:'TikTok',img:photos[2],description:'Crisp-edged beef, melted cheese, and a soft toasted bun.',google:['The patty has great crispy edges. Simple and satisfying.','Good burger. The lunchtime wait can be a little long.'],social:'That cheese melt and crispy edge. Keeping this one on my list.',tiktok:'A first-bite burger review with a look inside the bun.'},
  {id:'donut',dish:'Burnt Butter Donut',restaurant:'Sunday Bakes',meters:810,price:9,rating:4.4,count:64,category:'sweet',open:false,hours:'8am–5pm',source:'Instagram',img:photos[3],description:'A soft donut with a buttery glaze. A small afternoon treat.',google:['Soft dough and a lovely buttery glaze.','A sweet treat with coffee. It can sell out early.'],social:'Coffee and a buttery donut: my kind of afternoon break.',tiktok:'A bakery visit and a taste of the buttery glaze.'},
  {id:'miso',dish:'Chili Miso Ramen',restaurant:'Noodle Corner',meters:1600,price:19,rating:4.3,count:72,category:'meals',open:true,hours:'11am–10pm',source:'Google',img:photos[0],description:'A warming bowl of miso broth, noodles, and a chili kick.',google:['A good spicy bowl at a friendly price.','The miso broth is warming without being too heavy.'],social:'A spicy noodle bowl for a rainy afternoon.',tiktok:'Trying the chili broth and checking the spice level.'},
  {id:'truffle',dish:'Truffle Cheeseburger',restaurant:'Burger Lane',meters:3400,price:28,rating:4.6,count:143,category:'meals',open:true,hours:'12pm–10pm',source:'Instagram',img:photos[2],description:'Beef, cheese, and a touch of truffle sauce in a toasted bun.',google:['The truffle sauce goes well with the beef.','A filling burger. Great if you like a richer sauce.'],social:'A cheesy burger with a little truffle twist.',tiktok:'A burger taste test: sauce, patty, and bun.'}
];

const AREAS = [
  {id:'ampang',name:'Ampang',lat:3.1516,lng:101.7591},
  {id:'bangsar',name:'Bangsar',lat:3.1300,lng:101.6700},
  {id:'klcc',name:'KLCC',lat:3.1578,lng:101.7118}
];
const DEFAULT_FILTERS={range:1000,category:'all',query:'',onlyOpen:false,budget:false};
const bearings=[-1.8,.7,-.4,2.1,1.3,-2.5];
const FOOD=AREAS.flatMap(area=>baseFood.map((f,i)=>{
  const angle=bearings[i],north=Math.cos(angle)*f.meters,east=Math.sin(angle)*f.meters;
  return {...f,id:area.id==='ampang'?f.id:area.id+'-'+f.id,area:area.id,areaName:area.name,
    restaurant:area.id==='ampang'?f.restaurant:f.restaurant+' · '+area.name,
    lat:area.lat+north/111195,lng:area.lng+east/(111195*Math.cos(area.lat*Math.PI/180))};
}));
function cleanFilters(raw={}){
  raw=raw&&typeof raw==='object'?raw:{};
  return {range:[500,1000,3000,5000].includes(raw.range)?raw.range:1000,
    category:['all','meals','sweet'].includes(raw.category)?raw.category:'all',
    query:typeof raw.query==='string'?raw.query.trim().slice(0,100):'',
    onlyOpen:raw.onlyOpen===true,budget:raw.budget===true};
}
function distanceMeters(origin,food){
  const rad=n=>n*Math.PI/180,dlat=rad(food.lat-origin.lat),dlng=rad(food.lng-origin.lng);
  const a=Math.sin(dlat/2)**2+Math.cos(rad(origin.lat))*Math.cos(rad(food.lat))*Math.sin(dlng/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
}
function filterFoods(filters,origin){
  const f=cleanFilters(filters),words=f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return FOOD.map(food=>({...food,meters:Math.round(distanceMeters(origin,food)/10)*10}))
    .filter(food=>food.meters<=f.range&&(f.category==='all'||food.category===f.category)&&(!f.onlyOpen||food.open)&&(!f.budget||food.price<20)&&words.every(w=>(food.dish+' '+food.restaurant+' '+food.description).toLowerCase().includes(w)))
    .sort((a,b)=>a.meters-b.meters);
}
function mapPoint(food,origin,range){
  const north=(food.lat-origin.lat)*111195,east=(food.lng-origin.lng)*111195*Math.cos(origin.lat*Math.PI/180);
  return {x:50+east/range*36,y:47-north/range*27};
}
return {AREAS,FOOD,DEFAULT_FILTERS,cleanFilters,distanceMeters,filterFoods,mapPoint};

});
