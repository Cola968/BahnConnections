/** Optional preferences are isolated: a damaged key never hides another key. */
export function readPreference(storage:Pick<Storage,'getItem'>,key:string):string|null {
  try{return storage.getItem(key);}catch{return null;}
}
export function readPreferenceJson(storage:Pick<Storage,'getItem'>,key:string):unknown {
  try{return JSON.parse(readPreference(storage,key)??'null');}catch{return null;}
}
export function readPreferenceIds(storage:Pick<Storage,'getItem'>,key:string):string[] {
  const value=readPreferenceJson(storage,key);
  return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&id.length>0&&id.length<500))].slice(0,200):[];
}
