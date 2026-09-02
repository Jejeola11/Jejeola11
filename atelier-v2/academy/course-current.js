(()=>{
'use strict';
if(window.__FUSE_CURRENT_CURRICULUM__) return;
window.__FUSE_CURRENT_CURRICULUM__=true;

const pillars=(window.FUSE_COURSE&&Array.isArray(window.FUSE_COURSE.pillars))?window.FUSE_COURSE.pillars:[];
const pillar=key=>pillars.find(p=>p&&p.key===key);
const oldLessons=course=>{
  const map=new Map();
  ((course&&course.modules)||[]).forEach(m=>((m&&m.lessons)||[]).forEach(l=>{if(l&&l.key)map.set(l.key,l)}));
  return map;
};
const cloneLesson=(map,key,title)=>Object.assign({},map.get(key)||{}, {key,n:'',title,video:true,aspect:'9:16'});
const simpleLesson=(key,title)=>({key,n:'',title,dur:'',video:true,aspect:'9:16'});

const design=pillar('design');
if(design){
  const old=oldLessons(design);
  design.name='Design & Flyers';
  design.sub='Skill 1 · Design & Flyers';
  design.modules=[
    {key:'flyer-m1',title:'Module 1',lessons:[
      cloneLesson(old,'flyer-1_1','Module 1.1 - The Four Rules That Makes Anything Designed'),
      cloneLesson(old,'flyer-1_2',"Module 1.2 - Color That Doesn't Fight Itself"),
      cloneLesson(old,'flyer-1_3',"Module 1.3 - Typography That Doesn't Look Homemade"),
      cloneLesson(old,'flyer-1_4','Module 1.4 Composition and Layout')
    ]},
    {key:'flyer-m2',title:'Module 2',lessons:[
      cloneLesson(old,'flyer-2_1','Module 2.1 - The 7 Layers Of a Working Flyer'),
      cloneLesson(old,'flyer-2_2','Module 2.2 - Flyer Types and Their Real Conventions'),
      cloneLesson(old,'flyer-2_3','Module 2.3 - Sizing and Platforms'),
      cloneLesson(old,'flyer-2_4','Module 2.4 - The Mistakes That Scream "Beginner"')
    ]},
    {key:'flyer-m3',title:'Module 3',lessons:[
      cloneLesson(old,'flyer-3_1','Module 3.1 - Research First: Building Your Reference Board'),
      cloneLesson(old,'flyer-3_2','Module 3.2 - Use Your References To Create Your First Flyer'),
      cloneLesson(old,'flyer-3_3','Module 3.3 - Create A Course Flyer'),
      cloneLesson(old,'flyer-3_4','Module 3.4 - The Final Polish on Lightroom')
    ]},
    {key:'flyer-m4',title:'Module 4',lessons:[
      cloneLesson(old,'flyer-4_1','Module 4.1 — THE METHOD'),
      // Preserve the already-connected real 4.2 video. In the legacy source it lived at flyer-4_3.
      cloneLesson(old,'flyer-4_3','Module 4.2 - Building This Instinct For Every New Niche')
    ]},
    {key:'flyer-m5',title:'Module 5',lessons:[
      cloneLesson(old,'flyer-5_1','Module 5.1 - Running The Real Client Conversation'),
      cloneLesson(old,'flyer-5_2','Module 5.2 - Revisions Without Scope Creep'),
      cloneLesson(old,'flyer-5_3','Module 5.3 - Delivery'),
      cloneLesson(old,'flyer-5_4','Module 5.4 - Every Job is a Portfolio Piece')
    ]},
    {key:'flyer-m6',title:'Module 6',lessons:[
      cloneLesson(old,'flyer-6_1','Module 6 - Your 5 Practice Briefs')
    ]}
  ];
}

const video=pillar('video');
if(video){
  video.name='AI UGC & Influencer';
  video.sub='Skill 2 · AI UGC & Influencer';
  video.modules=[
    {key:'aiv-m1',title:'Module 1',lessons:[simpleLesson('aiv-1_1','Module 1 - Start Here (Full Overview)')]},
    {key:'aiv-m2',title:'Module 2',lessons:[simpleLesson('aiv-2_1','Module 2: AI UGC & INFLUENCER')]},
    {key:'aiv-m3',title:'Module 3',lessons:[simpleLesson('aiv-3_1','Module 3 - Choose the Niche & Purpose of your AI Influencer')]},
    {key:'aiv-m4',title:'Module 4',lessons:[simpleLesson('aiv-4_1','Module 4 - Define the Character & Appearance')]},
    {key:'aiv-m5',title:'Module 5',lessons:[simpleLesson('aiv-5_1','Module 5 - Collect Reference Images')]},
    {key:'aiv-m6',title:'Module 6',lessons:[simpleLesson('aiv-6_1','Module 6 - Create the First Sample Imagess')]},
    {key:'aiv-m7',title:'Module 7',lessons:[simpleLesson('aiv-7_1','Module 7 - Choose Your Master Image')]},
    {key:'aiv-m8',title:'Module 8',lessons:[
      simpleLesson('aiv-8_1','Module 8.1 - Create your Model Sheet with Free Tools'),
      simpleLesson('aiv-8_2','Module 8.2 - Create Model Sheet With Fuse Studio')
    ]},
    {key:'aiv-m9',title:'Module 9',lessons:[simpleLesson('aiv-9_1','Module 9 - Build Character Consistency')]},
    {key:'aiv-m10',title:'Module 10',lessons:[simpleLesson('aiv-10_1','Module 10 - Create UGC - Product Images')]},
    {key:'aiv-m11',title:'Module 11',lessons:[simpleLesson('aiv-11_1','Module 11 - Generate Simple Influencer Videos')]},
    {key:'aiv-m12',title:'Module 12',lessons:[simpleLesson('aiv-12_1','Module 12 - Create Product Reveal Videos')]},
    {key:'aiv-m13',title:'Module 13',lessons:[simpleLesson('aiv-13_1','Module 13 - Setup The Instagram Account')]},
    {key:'aiv-m14',title:'Module 14',lessons:[simpleLesson('aiv-14_1','Module 14 - Mark AI Content Correctly')]},
    {key:'aiv-m15',title:'Module 15',lessons:[simpleLesson('aiv-15_1','Module 15 - Final Workflow Overview')]},
    {key:'aiv-m16',title:'Module 16',lessons:[simpleLesson('aiv-16_1','Module 16 - Portfolio Setup')]}
  ];
}

const landing=pillar('landing');
if(landing){
  landing.name='Landing Page Design';
  landing.sub='Skill 3 · Landing Page Design';
  landing.modules=[
    {key:'web-m1',title:'Module 1',lessons:[simpleLesson('web-1_1','Module 1 - Start Here')]},
    {key:'web-m2',title:'Module 2',lessons:[simpleLesson('web-2_1','Module 2 - Anatomy Of A Landing Page That Converts')]},
    {key:'web-m3-current',title:'Module 3',lessons:[simpleLesson('web-3_1-current','Module 3 - Choose Your Niche & Client Type')]},
    {key:'web-m4',title:'Module 4',lessons:[simpleLesson('web-4_1','Module 4 - Gather The Brief Before You Design')]},
    {key:'web-m5',title:'Module 5',lessons:[simpleLesson('web-5_1','Module 5 - Prompting Claude To Design A Landing Page')]},
    {key:'web-m6',title:'Module 6',lessons:[simpleLesson('web-6_1','Module 6 - Build Every Section One At A Time')]},
    {key:'web-m7',title:'Module 7',lessons:[simpleLesson('web-7_1','Module 7 - Design Principles That Make It Look Premium')]},
    {key:'web-m8',title:'Module 8',lessons:[simpleLesson('web-8_1','Module 8 - Copywriting That Actually Converts')]},
    {key:'web-m9',title:'Module 9',lessons:[simpleLesson('web-9_1','Module 9 - Deploy The Page & Hand It Off')]},
    {key:'web-m10',title:'Module 10',lessons:[simpleLesson('web-10_1','Module 10 - Sell This As A Service')]}
  ];
}

window.FUSE_ACADEMY_MONEY={
  key:'money',name:'The Money Engine System',sub:'Turn your skill into clients',
  resources:[{title:'Resources',desc:'Money Engine resources and supporting files.'}],
  modules:[
    {key:'money-start-module',title:'Start Here',lessons:[simpleLesson('money-start','1. Start Here - Understand The System First')]},
    {key:'money-m1-module',title:'Module 1',lessons:[simpleLesson('money-m1','Module 1 - How It Works')]},
    {key:'money-m2-module',title:'Module 2',lessons:[simpleLesson('money-m2','Module 2 - The 50 - Lead Hunt')]},
    {key:'money-m3-module',title:'Module 3',lessons:[simpleLesson('money-m3','Module 3 - Find The Problem')]},
    {key:'money-m4-module',title:'Module 4',lessons:[simpleLesson('money-m4','Module 4 - The Sample Engine')]},
    {key:'money-m5-module',title:'Module 5',lessons:[simpleLesson('money-m5','Module 5 - Pitch & Follow Up')]},
    {key:'money-m6-module',title:'Module 6',lessons:[simpleLesson('money-m6','Module 6 - Close The Deal')]}
  ]
};

// When injected after the base Academy has booted, make its global resolver use the corrected shared curriculum.
if(typeof window.realCourse==='function'){
  window.realCourse=function(key){
    if(key==='money') return window.FUSE_ACADEMY_MONEY;
    const ps=(window.FUSE_COURSE&&window.FUSE_COURSE.pillars)||[];
    return ps.find(p=>p.key===key)||null;
  };
}
try{if(typeof window.renderPaths==='function')window.renderPaths();}catch(e){}
try{if(typeof window.updateContinueCard==='function')window.updateContinueCard();}catch(e){}
})();
