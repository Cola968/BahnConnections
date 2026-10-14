import type * as Leaflet from 'leaflet';
import type { BoardMapTrip } from './live-board';
import { railContinuityLinks, splitRailGeometry } from './rail-geometry';
import { serviceColors } from './transit-style';

/** Append new previews in small frames. Already drawn lines survive every batch. */
export class StationMapRenderer {
  private layer:Leaflet.LayerGroup;
  private rendered=new Map<string,{trip:BoardMapTrip;layers:Leaflet.Layer[]}>();
  private frame:number|null=null;
  private generation=0;
  private added=0;
  constructor(private L:typeof Leaflet,private map:Leaflet.Map,private canvas:Leaflet.Canvas,
    private hint:string,private onSelect:(trip:BoardMapTrip)=>void){
    this.layer=L.layerGroup().addTo(map);
  }
  sync(trips:BoardMapTrip[]){
    const generation=++this.generation;
    if(this.frame!==null)cancelAnimationFrame(this.frame);
    const desired=new Map(trips.map(trip=>[trip.tripId,trip]));
    for(const [id,current]of this.rendered)if(desired.get(id)!==current.trip){
      current.layers.forEach(layer=>this.layer.removeLayer(layer));this.rendered.delete(id);
    }
    const queue=trips.filter(trip=>!this.rendered.has(trip.tripId));let cursor=0;
    const draw=()=>{
      if(generation!==this.generation)return;
      this.frame=null;const start=performance.now();
      do {
        const trip=queue[cursor++];if(!trip)break;
        const segments=trip.previewSegments??trip.segments.flatMap(segment=>splitRailGeometry(segment));
        const color=serviceColors(trip.category,trip.color,trip.textColor,trip.name,this.hint).background;
        const layers:Leaflet.Layer[]=[];
        // Data sources occasionally omit rail alignment between valid parts
        // of the SAME journey. Display uncertainty instead of an abrupt hole.
        for(const joining of railContinuityLinks(segments)){
          const inferred=this.L.polyline(joining,{renderer:this.canvas,
            color,weight:2.6,opacity:.62,dashArray:'5 7',lineCap:'round',lineJoin:'round'});
          inferred.bindTooltip('Ungefähre Verbindung · genauer Gleisverlauf nicht verfügbar');
          inferred.addTo(this.layer);layers.push(inferred);
        }
        for(const segment of segments){
          const line=this.L.polyline(segment,{renderer:this.canvas,smoothFactor:1.5,
            color,weight:3.2,opacity:.8,lineCap:'round',lineJoin:'round',className:'station-trip-preview'});
          // DOM text rather than provider HTML: source line names are untrusted.
          const label=document.createElement('span');label.textContent=`${trip.name} · ${trip.stops.length} Halte`;
          line.bindTooltip(label,{sticky:true});line.on('click',()=>this.onSelect(trip));
          line.addTo(this.layer);layers.push(line);
        }
        this.rendered.set(trip.tripId,{trip,layers});this.added++;
      }while(cursor<queue.length&&performance.now()-start<4);
      const element=this.map.getPane('rail-routes')?.querySelector('canvas');
      if(element){element.dataset.routeCount=String(this.rendered.size);element.dataset.routeAdded=String(this.added);element.dataset.routeRevision=String(Number(element.dataset.routeRevision??0)+1);}
      if(cursor<queue.length)this.frame=requestAnimationFrame(draw);
    };
    if(queue.length)this.frame=requestAnimationFrame(draw);
  }
  get count(){return this.rendered.size;}
  dispose(){++this.generation;if(this.frame!==null)cancelAnimationFrame(this.frame);this.layer.remove();const element=this.map.getPane('rail-routes')?.querySelector('canvas');if(element)element.dataset.routeCount='0';}
}
