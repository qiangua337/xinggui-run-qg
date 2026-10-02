/* Each run mode keeps its own records; classic retains the original storage keys. */
(function(root){'use strict';
const keys={classic:{runs:'nightline-runs-v1',best:'nightline-best-v1'},rush:{runs:'nightline-rush-runs-v1',best:'nightline-rush-best-v1'}};
class RunRecords {
  constructor(storage=null,characterIds=['alo','mia','bei']){
    this.storage=storage;this.characters=new Set(characterIds);this.boards={classic:[],rush:[]};this.bests={classic:0,rush:0};this.persistent=Boolean(storage);
    for(const mode of Object.keys(keys)){
      let raw='[]';try{raw=storage?.getItem(keys[mode].runs)||'[]';}catch{this.persistent=false;}
      try{
        const saved=JSON.parse(raw);
        if(Array.isArray(saved))this.boards[mode]=saved.filter(entry=>this.valid(entry)).map(entry=>this.normalize(entry)).sort(this.compare).slice(0,10);
      }catch{}
      try{
        const best=Number(storage?.getItem(keys[mode].best));
        if(Number.isFinite(best)&&best>=0)this.bests[mode]=Math.floor(best);
      }catch{this.persistent=false;}
      this.bests[mode]=Math.max(this.bests[mode],...this.boards[mode].map(entry=>entry.score));
    }
  }
  valid(entry){return Boolean(entry&&Number.isFinite(entry.score)&&entry.score>=0&&Number.isFinite(entry.distance)&&entry.distance>=0&&this.characters.has(entry.character));}
  normalize(entry){return{score:Math.floor(entry.score),distance:Math.floor(entry.distance),coins:Number.isFinite(entry.coins)&&entry.coins>=0?Math.floor(entry.coins):0,character:entry.character,gear:['none','star','cat','phones','crown'].includes(entry.gear)?entry.gear:'none',at:Number.isFinite(entry.at)?entry.at:0};}
  compare(a,b){return b.score-a.score||b.at-a.at;}
  checkMode(mode){if(!Object.hasOwn(keys,mode))throw new RangeError('Unknown leaderboard mode');}
  getRuns(mode){this.checkMode(mode);return this.boards[mode];}
  getBest(mode){this.checkMode(mode);return this.bests[mode];}
  add(mode,entry){
    this.checkMode(mode);if(!this.valid(entry))throw new TypeError('Invalid run record');
    this.boards[mode].push(this.normalize(entry));this.boards[mode].sort(this.compare);this.boards[mode]=this.boards[mode].slice(0,10);this.bests[mode]=Math.max(this.bests[mode],Math.floor(entry.score));
    try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem(keys[mode].runs,JSON.stringify(this.boards[mode]));this.storage.setItem(keys[mode].best,String(this.bests[mode]));this.persistent=true;return true;}catch{this.persistent=false;return false;}
  }
}
root.RunRecords=RunRecords;if(typeof module!=='undefined')module.exports={RunRecords};
})(typeof globalThis!=='undefined'?globalThis:this);
