import type {BoardDelayFilter} from "./board-delay-filter";

export type BoardQuickView="all"|"upcoming"|"delayed"|"canceled";
export type BoardQuickSelection={delay:BoardDelayFilter;windowMinutes:60|240};

/** All presets are explicitly reversible. They never manufacture live predictions. */
export function boardQuickSelection(view:BoardQuickView):BoardQuickSelection {
 switch(view){
  case "upcoming":return {delay:"all",windowMinutes:60};
  case "delayed":return {delay:"delayed",windowMinutes:240};
  case "canceled":return {delay:"canceled",windowMinutes:240};
  default:return {delay:"all",windowMinutes:240};
 }
}

export function activeBoardQuickView(state:{delay:BoardDelayFilter;windowMinutes:number;otherFilters:boolean}):BoardQuickView|null{
 if(state.otherFilters)return null;
 if(state.delay==="all"&&state.windowMinutes===60)return "upcoming";
 if(state.delay==="delayed"&&state.windowMinutes===240)return "delayed";
 if(state.delay==="canceled"&&state.windowMinutes===240)return "canceled";
 return state.delay==="all"&&state.windowMinutes===240?"all":null;
}
