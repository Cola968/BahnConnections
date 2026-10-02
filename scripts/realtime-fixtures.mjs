// Deliberate UI fixtures. These are not live timetable or route-quality evidence.
export const realtimeScenarios = [
  {name:"on-time",delay:0,tone:"success",kind:"on-time"},
  {name:"minor-3",delay:3,tone:"success",kind:"minor-delay"},
  {name:"delay-10",delay:10,tone:"warning",kind:"delay"},
  {name:"major-24",delay:24,tone:"danger",kind:"major-delay"},
  {name:"severe-45",delay:45,tone:"danger",kind:"major-delay"},
  {name:"early",delay:-3,tone:"warning",kind:"early"},
  {name:"platform",delay:0,tone:"success",kind:"on-time",platform:true},
  {name:"cancelled-stop",delay:0,tone:"danger",kind:"cancelled",cancelled:true},
  {name:"cancelled-leg",delay:0,tone:"danger",kind:"cancelled",cancelled:true,legCancelled:true},
  {name:"schedule",delay:0,tone:"neutral",kind:"schedule",schedule:true},
  {name:"unknown",delay:0,tone:"neutral",kind:"unknown",unknown:true},
];
const shifted = (value, minutes) => value ? new Date(new Date(value).getTime() + minutes * 60_000).toISOString() : undefined;

export function journeyFixture(base, scenario) {
  const legs = base.legs.map(leg => {
    const stops = leg.stops.map((stop,index) => ({
      ...stop, arrival:shifted(stop.scheduledArrival,scenario.delay), departure:shifted(stop.scheduledDeparture,scenario.delay),
      ...(scenario.unknown && index === 0 ? { scheduledArrival:undefined, scheduledDeparture:undefined } : {}),
      cancelled:Boolean(scenario.cancelled && (scenario.legCancelled || index === 0)),
      track:scenario.platform && index === 0 ? "7" : stop.scheduledTrack,
      scheduledTrack:scenario.platform && index === 0 ? "4" : stop.scheduledTrack,
    }));
    return {...leg,from:stops[0],to:stops.at(-1),stops,
      startTime:shifted(leg.scheduledStartTime,scenario.delay),endTime:shifted(leg.scheduledEndTime,scenario.delay),
      realtime:!scenario.schedule,cancelled:Boolean(scenario.legCancelled)};
  });
  return {...base,id:`qa-${scenario.name}`,legs,transitLegs:legs.filter(leg => leg.category !== "walk"),
    startTime:legs[0].startTime,endTime:legs.at(-1).endTime,
    realtime:!scenario.schedule,cancelled:Boolean(scenario.cancelled),
    realtimeStatus:scenario.schedule ? "schedule" : "live"};
}

export function boardFixture() {
  const scheduled = new Date(Date.now() + 60 * 60_000).toISOString();
  return { source:"UI-QA-Fixture",updatedAt:new Date().toISOString(),warnings:[],verification:{status:"unavailable"},
    stopTimes:realtimeScenarios.map((scenario,index) => ({
      tripId:`qa-board-${index}`,displayName:`ICE ${1200+index}`,mode:"HIGHSPEED_RAIL",realTime:!scenario.schedule,
      headsign:"München Hauptbahnhof – Zugang über den Bahnhofsvorplatz",
      place:{ departure:shifted(scheduled,scenario.delay),scheduledDeparture:scenario.unknown ? undefined : scheduled,
        track:scenario.platform ? "7" : "4",scheduledTrack:"4",cancelled:scenario.cancelled },
    })),
  };
}
