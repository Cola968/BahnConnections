export type OccupancyForecast = {
  level: 1 | 2 | 3;
  label: "Niedrig" | "Mittel" | "Hoch";
  explanation: string;
};

export function occupancyForecast(when?: string, service = "Fernzug"): OccupancyForecast {
  const date = when ? new Date(when) : new Date();
  const hour = Number.isFinite(date.getTime()) ? date.getHours() : 12;
  const weekday = Number.isFinite(date.getTime()) ? date.getDay() : 1;
  const peak = (hour >= 6 && hour < 9) || (hour >= 15 && hour < 19);
  const weekend = weekday === 0 || weekday === 6;
  const leisurePeak = weekend && hour >= 9 && hour < 17;
  const premium = /ICE|IC|EC|RJ|TGV|FLX/i.test(service);
  const level: 1 | 2 | 3 = peak || (leisurePeak && premium) ? 3 : hour < 6 || hour >= 21 ? 1 : 2;
  const label = level === 3 ? "Hoch" : level === 2 ? "Mittel" : "Niedrig";
  const reason = peak ? "typische Pendlerzeit" : leisurePeak ? "typische Wochenend-Reisezeit" : level === 1 ? "verkehrsarme Tageszeit" : "normale Reisezeit";
  return { level, label, explanation:`Prognose aus Tageszeit, Wochentag und Zugart (${reason}); keine Live-Belegungsmessung.` };
}
