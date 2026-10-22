import { TrackRouter, type GeoStation, type RailNetwork } from './track-routing';

let router: TrackRouter | null = null;
const pending: {key:string; stations:GeoStation[]}[] = [];
function calculate(message: {key:string; stations:GeoStation[]}) {
  if (!router) { pending.push(message); return; }
  postMessage({key:message.key,geometry:router.geometry(message.stations)});
}
onmessage = async (event: MessageEvent) => {
  if (event.data.url) {
    try {
      const response = await fetch(event.data.url);
      if (!response.ok) throw new Error('Rail network unavailable');
      router = new TrackRouter(await response.json() as RailNetwork);
      postMessage({ready:true});
      for (const message of pending.splice(0)) calculate(message);
    } catch { postMessage({error:true}); }
  } else calculate(event.data);
};
