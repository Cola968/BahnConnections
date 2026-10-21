import type * as Leaflet from 'leaflet';
import { liveTripProgress, pointOnTrip, activeEstimatedPosition, trailForTrip, type LiveTrip } from './live-trains';
import { deriveRealtimePresentation, realtimeAccessibleLabel } from './realtime-presentation';
import { realtimeTooltip } from './realtime-tooltip';
import { headingDegrees } from './train-inspector-data';
import { railDistanceKm } from './rail-geometry';

export type LiveMapOptions={zoom:number;view:'trains'|'stress';trails:boolean;trackedId:string|null;selectedId?:string|null;radarStatus?:'loading'|'ready'|'stale'|'error';radarUpdatedAtMs?:number|null;appearance?:string};
type MarkerEntry={marker:Leaflet.Marker;trip:LiveTrip|null;members:LiveTrip[];signature:string;trail:Leaflet.Polyline|null;zIndexOffset:number};
type Desired={id:string;position:[number,number];trip:LiveTrip|null;members:LiveTrip[]};

/** Marker identity belongs to a trip, not a React render or animation tick. */
export class LiveMapRenderer {
  private entries=new Map<string,MarkerEntry>();
  private frame:number|null=null;
  private generation=0;
  private canvas:Leaflet.Canvas;
  private mapIsMoving=false;
  private retryMissingPositions:number|null=null;
  // Leaflet changes marker transforms while navigating. Never interpolate
  // positions during user gestures, follow camera moves or zoom animations.
  private pauseMarkerGlide=()=>{
    this.mapIsMoving=true;
    for(const entry of this.entries.values())entry.marker.getElement()?.classList.remove('rail-marker-glide');
  };
  private resumeMarkerGlide=()=>{this.mapIsMoving=false;};
  constructor(private L:typeof Leaflet,private map:Leaflet.Map,private layer:Leaflet.LayerGroup,
    private select:(trip:LiveTrip)=>void){
    this.canvas=L.canvas({pane:'rail-routes',padding:.2});
    this.map.on('movestart',this.pauseMarkerGlide);
    this.map.on('zoomstart',this.pauseMarkerGlide);
    this.map.on('moveend',this.resumeMarkerGlide);
    this.map.on('zoomend',this.resumeMarkerGlide);
  }
  sync(trips:LiveTrip[],options:LiveMapOptions,at=Date.now()){
    const generation=++this.generation;if(this.frame!==null)cancelAnimationFrame(this.frame);
    if(this.retryMissingPositions!==null){cancelAnimationFrame(this.retryMissingPositions);this.retryMissingPositions=null;}
    let deferredPositions=false;
    const desired:Desired[]=[];
    const groups=new Map<string,Desired & {screen:Leaflet.Point}>();
    for(const trip of trips){
      const position=activeEstimatedPosition(trip,at);
      if(!position){
        // Unindexed route geometry is temporarily unavailable. Retry on the
        // next frame instead of permanently hiding otherwise active trains.
        const start=Date.parse(trip.departure),end=Date.parse(trip.arrival);
        if(Number.isFinite(start)&&Number.isFinite(end)&&start<=at&&at<=end)deferredPositions=true;
        continue;
      }
      if((options.zoom<10||options.view==='stress') && trip.tripId!==options.selectedId && trip.tripId!==options.trackedId){
        // Group by visible spacing, including neighbouring grid cells. Fixed
        // geographic buckets can leave overlapping bubbles when zoomed out.
        const screen=this.map.project(position,options.zoom),x=Math.floor(screen.x/48),y=Math.floor(screen.y/48);
        const id=`cluster:${x}:${y}`;
        let group=groups.get(id);
        for(let dx=-1;!group&&dx<=1;dx++)for(let dy=-1;!group&&dy<=1;dy++){
          const neighbour=groups.get(`cluster:${x+dx}:${y+dy}`);
          if(neighbour&&neighbour.screen.distanceTo(screen)<48)group=neighbour;
        }
        if(group){group.members.push(trip);group.position[0]+=position[0];group.position[1]+=position[1];}
        else groups.set(id,{id,position:[...position],trip:null,members:[trip],screen});
      }else desired.push({id:trip.tripId,position,trip,members:[trip]});
    }
    for(const group of groups.values()){
      group.position[0]/=group.members.length;group.position[1]/=group.members.length;
      // A single train is a train, never a count bubble.
      if(group.members.length===1){group.trip=group.members[0];group.id=group.trip.tripId;}
      desired.push(group);
    }
    const ids=new Set(desired.map(item=>item.id));
    for(const [id,entry]of this.entries)if(!ids.has(id)){this.layer.removeLayer(entry.marker);if(entry.trail)this.layer.removeLayer(entry.trail);this.entries.delete(id);}
    const styles=options.trails?getComputedStyle(document.documentElement):null;
    let cursor=0;
    const draw=()=>{
      if(generation!==this.generation)return;this.frame=null;const start=performance.now();
      do {
        const item=desired[cursor++];if(!item)break;
        let entry=this.entries.get(item.id);
        if(!entry){
          const railGlyph='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="15" rx="4"/><path d="M6 10h12M12 3v7M8 21l2-3m6 3-2-3"/><path d="M9 14h.01M15 14h.01"/></svg>';
          const marker=this.L.marker(item.position,{zIndexOffset:item.trip?900:0,icon:this.L.divIcon({className:item.trip?'live-train-wrap':'live-cluster-wrap',html:item.trip?`<div class="live-train-marker glyph"><i>${railGlyph}</i></div>`:`<div class="live-cluster">${railGlyph}<b></b></div>`,iconSize:[44,44],iconAnchor:[22,22]})}).addTo(this.layer);
          entry={marker,trip:null,members:[],signature:'',trail:null,zIndexOffset:item.trip?900:0};this.entries.set(item.id,entry);
          const current=entry;
          const activate=()=>{current.marker.closeTooltip();if(current.trip)this.select(current.trip);else if(current.members.length===1)this.select(current.members[0]);else this.map.setView(current.marker.getLatLng(),Math.max(this.map.getZoom()+2,11),{animate:true});};
          marker.on('click',activate);
          marker.on('keydown',event=>{const key=event.originalEvent as KeyboardEvent;if(key.key==='Enter'||key.key===' '){key.preventDefault();activate();}});
          const element=marker.getElement();if(element){element.dataset.tripId=item.id;element.setAttribute('role','button');element.setAttribute('tabindex','0');}
        }
        if(item.trip){
          const highlighted=item.trip.tripId===options.selectedId||item.trip.tripId===options.trackedId;
          const zIndexOffset=item.trip.tripId===options.trackedId?1450:highlighted?1250:900;
          // Leaflet writes the marker DOM style on every setZIndexOffset call.
          // With hundreds of markers a 4-second radar tick must not rewrite
          // unchanged z-index values and trigger unnecessary layout work.
          if(entry.zIndexOffset!==zIndexOffset){entry.marker.setZIndexOffset(zIndexOffset);entry.zIndexOffset=zIndexOffset;}
        }
        entry.members=item.members;
        const old=entry.marker.getLatLng();
        const changed=old.lat!==item.position[0]||old.lng!==item.position[1];
        // Re-project first: subpixel jitter should not trigger heading scans,
        // map marker animation, or rail-distance calculations on 180 trains.
        const screenChanged=changed && this.map.latLngToLayerPoint(old).distanceTo(this.map.latLngToLayerPoint(item.position))>=0.75;
        const icon=entry.marker.getElement();
        const jump=screenChanged?railDistanceKm([old.lat,old.lng],item.position):0;
        // Only animate a continuous, plausible four-second position update.
        // New markers, stale discontinuities and moving/zooming maps snap
        // immediately rather than traversing a fictional straight line.
        icon?.classList.toggle('rail-marker-glide',Boolean(
          entry.trip && item.trip && !this.mapIsMoving && screenChanged &&
          Number.isFinite(jump) && jump>0 && jump<=.5
        ));
        // Avoid expensive Leaflet projection and DOM positioning for tiny
        // sub-pixel changes during high-frequency interpolation ticks.
        // Keep the last rendered coordinate until its screen position moves.
        if(screenChanged)entry.marker.setLatLng(item.position);
        const element=entry.marker.getElement(),glyph=element?.firstElementChild;
        if(item.trip){
          const trip=item.trip,state=deriveRealtimePresentation({scheduled:trip.scheduledArrival,actual:trip.arrival,realtime:trip.realTime});
          // Derive north-relative train heading from consecutive valid interpolated
          // track positions. Both the icon and the underlying position remain estimates.
          if(glyph && (screenChanged || entry.trip!==trip)){
            // Reusing the same interpolated position should never rescan the
            // route geometry or rewrite 180 unchanged marker styles per tick.
            const progress=liveTripProgress(trip,at);
            const before=pointOnTrip(trip,Math.max(0,progress-.004));
            const after=pointOnTrip(trip,Math.min(1,progress+.004));
            const heading=headingDegrees(before,after);
            const style=heading!==null?`--train-heading:${heading}deg;--train-direction-visible:1`:'';
            if(glyph.getAttribute('style')!==style){
              if(style)glyph.setAttribute('style',style);
              else glyph.removeAttribute('style');
            }
          }
          const signature=`${trip.category}:${state.kind}:${options.trackedId===trip.tripId}:${options.selectedId===trip.tripId}`;
          if(glyph&&entry.signature!==signature)glyph.className=`live-train-marker glyph ${trip.category} status-${state.tone} status-${state.kind}${options.trackedId===trip.tripId?' tracked':''}${options.selectedId===trip.tripId?' selected':''}`;
          if(trip.tripId===options.selectedId||trip.tripId===options.trackedId)entry.marker.unbindTooltip();
          else if(entry.trip!==trip||!entry.marker.getTooltip()){
            entry.marker.bindTooltip(realtimeTooltip(`${trip.name} · ${trip.from.name} → ${trip.to.name}`,{scheduled:trip.scheduledArrival,actual:trip.arrival,realtime:trip.realTime}),{direction:'top',offset:[0,-11],className:'live-train-tooltip'});
          }
          if(entry.trip!==trip){
            element?.setAttribute('aria-label',`${trip.name}. Position geschätzt, keine GPS-Ortung. ${realtimeAccessibleLabel(state)} Details öffnen.`);
          }
          entry.signature=signature;entry.trip=trip;
          if(options.trails){
            const token=state.kind==='early'?'--status-early':{neutral:'--status-schedule',success:'--status-on-time',warning:'--status-delay',danger:'--status-disruption'}[state.tone];
            const points=trailForTrip(trip,liveTripProgress(trip,at)),color=styles!.getPropertyValue(token).trim();
            if(entry.trail)entry.trail.setLatLngs(points).setStyle({color});
            else entry.trail=this.L.polyline(points,{renderer:this.canvas,color,weight:1.6,opacity:.24,dashArray:'2 7',interactive:false}).addTo(this.layer);
          }else if(entry.trail){this.layer.removeLayer(entry.trail);entry.trail=null;}
        }else {
          const known=item.members.map(trip=>deriveRealtimePresentation({scheduled:trip.scheduledArrival,actual:trip.arrival,realtime:trip.realTime}).delayMinutes).filter((delay):delay is number=>delay!==null);
          const average=known.length?known.reduce((sum,value)=>sum+value,0)/known.length:null;
          const tone=average===null?'unknown':average>=11?'severe':average>=5?'late':'calm';
          if(glyph){glyph.className=`live-cluster ${tone}`;const count=glyph.querySelector('b');if(count)count.textContent=String(item.members.length);}
          const label=`${item.members.length} geschätzte Zugpositionen · ${known.length} mit bestätigten Zeitprognosen${average===null?'':` · Ø ${average.toLocaleString('de-DE',{maximumFractionDigits:1})} Min.`} · zum Vergrößern öffnen`;
          if(label!==entry.signature){const tooltip=document.createElement('span');tooltip.textContent=label;entry.marker.bindTooltip(tooltip);element?.setAttribute('aria-label',label);entry.signature=label;}
        }
      }while(cursor<desired.length&&performance.now()-start<4);
      if(cursor<desired.length)this.frame=requestAnimationFrame(draw);
    };
    if(desired.length)this.frame=requestAnimationFrame(draw);
    if(deferredPositions){
      this.retryMissingPositions=requestAnimationFrame(()=>{
        this.retryMissingPositions=null;
        if(generation===this.generation)this.sync(trips,options,at);
      });
    }
  }
  dispose(){
    ++this.generation;
    if(this.frame!==null)cancelAnimationFrame(this.frame);
    if(this.retryMissingPositions!==null)cancelAnimationFrame(this.retryMissingPositions);
    this.map.off('movestart',this.pauseMarkerGlide);
    this.map.off('zoomstart',this.pauseMarkerGlide);
    this.map.off('moveend',this.resumeMarkerGlide);
    this.map.off('zoomend',this.resumeMarkerGlide);
    for(const entry of this.entries.values()){this.layer.removeLayer(entry.marker);if(entry.trail)this.layer.removeLayer(entry.trail);}
    this.entries.clear();this.canvas.remove();
  }
}
