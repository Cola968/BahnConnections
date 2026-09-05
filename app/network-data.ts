export type TrainType = "ICE" | "IC" | "EC";
export type TimeBand = "early" | "day" | "evening";

export type Station = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  code?: string;
  eva?: string;
  hub?: boolean;
  source?: "curated" | "db";
  kind?: string;
  state?: string;
  passengerBand?: "< 100" | "100 - 1.000" | "> 1.000";
  mergedCodes?: string[];
  mergedCount?: number;
  transitousId?: string;
  dbId?: string;
};

export type Route = {
  id: string;
  type: TrainType;
  operator: string;
  frequency: number;
  days: number[];
  times: TimeBand[];
  note?: string;
  stops: string[];
};

const de = "DE";
const daily = [1, 2, 3, 4, 5, 6, 0];
const allDay: TimeBand[] = ["early", "day", "evening"];

export const STATIONS: Station[] = [
  { id:"westerland", name:"Westerland (Sylt)", lat:54.9079, lon:8.3082, country:de },
  { id:"niebuell", name:"Niebüll", lat:54.7864, lon:8.8290, country:de },
  { id:"husum", name:"Husum", lat:54.4750, lon:9.0520, country:de },
  { id:"heide", name:"Heide (Holst)", lat:54.1962, lon:9.1013, country:de },
  { id:"flensburg", name:"Flensburg", lat:54.7740, lon:9.4367, country:de, code:"AF" },
  { id:"kiel", name:"Kiel Hbf", lat:54.3150, lon:10.1315, country:de, code:"AK", eva:"8000199" },
  { id:"luebeck", name:"Lübeck Hbf", lat:53.8674, lon:10.6693, country:de, code:"AL" },
  { id:"hamburg_altona", name:"Hamburg-Altona", lat:53.5528, lon:9.9352, country:de, code:"AA", eva:"8002553" },
  { id:"hamburg", name:"Hamburg Hbf", lat:53.5528, lon:10.0064, country:de, code:"AH", eva:"8002549", hub:true },
  { id:"schwerin", name:"Schwerin Hbf", lat:53.6348, lon:11.4081, country:de, code:"WSN" },
  { id:"rostock", name:"Rostock Hbf", lat:54.0782, lon:12.1311, country:de, code:"WR" },
  { id:"stralsund", name:"Stralsund Hbf", lat:54.3092, lon:13.0818, country:de, code:"WS" },
  { id:"greifswald", name:"Greifswald", lat:54.0938, lon:13.3748, country:de },
  { id:"binz", name:"Ostseebad Binz", lat:54.4046, lon:13.5995, country:de, code:"WBIN" },
  { id:"norddeich", name:"Norddeich Mole", lat:53.6249, lon:7.1604, country:de, code:"HNDM" },
  { id:"emden", name:"Emden Hbf", lat:53.3673, lon:7.2070, country:de, code:"HEM" },
  { id:"oldenburg", name:"Oldenburg (Oldb) Hbf", lat:53.1434, lon:8.2214, country:de, code:"HOL" },
  { id:"bremen", name:"Bremen Hbf", lat:53.0835, lon:8.8139, country:de, code:"HB", eva:"8000050" },
  { id:"osnabrueck", name:"Osnabrück Hbf", lat:52.2727, lon:8.0618, country:de, code:"HO" },
  { id:"hannover", name:"Hannover Hbf", lat:52.3772, lon:9.7410, country:de, code:"HH", eva:"8000152", hub:true },
  { id:"berlin_spandau", name:"Berlin-Spandau", lat:52.5346, lon:13.1977, country:de, code:"BSPD" },
  { id:"berlin", name:"Berlin Hbf", lat:52.5251, lon:13.3694, country:de, code:"BLS", eva:"8011160", hub:true },
  { id:"berlin_ost", name:"Berlin Ostbahnhof", lat:52.5100, lon:13.4347, country:de, code:"BOSB" },
  { id:"berlin_sued", name:"Berlin Südkreuz", lat:52.4759, lon:13.3656, country:de, code:"BSKR" },
  { id:"stendal", name:"Stendal Hbf", lat:52.5946, lon:11.8547, country:de, code:"LS" },
  { id:"wolfsburg", name:"Wolfsburg Hbf", lat:52.4297, lon:10.7876, country:de, code:"HWOB", eva:"8000250" },
  { id:"braunschweig", name:"Braunschweig Hbf", lat:52.2523, lon:10.5409, country:de, code:"HBS", eva:"8000049" },
  { id:"magdeburg", name:"Magdeburg Hbf", lat:52.1303, lon:11.6267, country:de, code:"LM" },
  { id:"cottbus", name:"Cottbus Hbf", lat:51.7518, lon:14.3257, country:de, code:"BC" },
  { id:"frankfurt_oder", name:"Frankfurt (Oder)", lat:52.3369, lon:14.5478, country:de, code:"BFP" },
  { id:"bielefeld", name:"Bielefeld Hbf", lat:52.0280, lon:8.5320, country:de, code:"EBIL", eva:"8000036" },
  { id:"muenster", name:"Münster (Westf) Hbf", lat:51.9566, lon:7.6359, country:de, code:"EMST", eva:"8000263" },
  { id:"paderborn", name:"Paderborn Hbf", lat:51.7157, lon:8.7523, country:de, code:"EP" },
  { id:"hamm", name:"Hamm (Westf) Hbf", lat:51.6780, lon:7.8078, country:de, code:"EHM" },
  { id:"dortmund", name:"Dortmund Hbf", lat:51.5179, lon:7.4593, country:de, code:"EDO", eva:"8000080", hub:true },
  { id:"bochum", name:"Bochum Hbf", lat:51.4787, lon:7.2229, country:de, code:"EBO" },
  { id:"essen", name:"Essen Hbf", lat:51.4514, lon:7.0138, country:de, code:"EE", eva:"8000098" },
  { id:"duisburg", name:"Duisburg Hbf", lat:51.4297, lon:6.7751, country:de, code:"EDG", eva:"8000086" },
  { id:"oberhausen", name:"Oberhausen Hbf", lat:51.4746, lon:6.8530, country:de },
  { id:"duesseldorf", name:"Düsseldorf Hbf", lat:51.2199, lon:6.7943, country:de, code:"KD", eva:"8000085", hub:true },
  { id:"hagen", name:"Hagen Hbf", lat:51.3627, lon:7.4603, country:de, code:"EH" },
  { id:"wuppertal", name:"Wuppertal Hbf", lat:51.2544, lon:7.1508, country:de, code:"KW" },
  { id:"solingen", name:"Solingen Hbf", lat:51.1615, lon:7.0052, country:de, code:"KSG" },
  { id:"koeln", name:"Köln Hbf", lat:50.9430, lon:6.9587, country:de, code:"KK", eva:"8000207", hub:true },
  { id:"aachen", name:"Aachen Hbf", lat:50.7678, lon:6.0915, country:de, code:"KA", eva:"8000001" },
  { id:"siegen", name:"Siegen Hbf", lat:50.8748, lon:8.0167, country:de },
  { id:"bonn", name:"Bonn Hbf", lat:50.7320, lon:7.0968, country:de, code:"KB", eva:"8000044" },
  { id:"siegburg", name:"Siegburg/Bonn", lat:50.7938, lon:7.2020, country:de, code:"KSIB" },
  { id:"montabaur", name:"Montabaur", lat:50.4448, lon:7.8253, country:de, code:"FMT" },
  { id:"limburg", name:"Limburg Süd", lat:50.3829, lon:8.0960, country:de, code:"FLIS" },
  { id:"koblenz", name:"Koblenz Hbf", lat:50.3500, lon:7.5890, country:de, code:"KKOL" },
  { id:"trier", name:"Trier Hbf", lat:49.7560, lon:6.6526, country:de, code:"STR" },
  { id:"goettingen", name:"Göttingen", lat:51.5369, lon:9.9268, country:de, code:"HG", eva:"8000128" },
  { id:"kassel", name:"Kassel-Wilhelmshöhe", lat:51.3127, lon:9.4472, country:de, code:"FKW", eva:"8003200", hub:true },
  { id:"halle", name:"Halle (Saale) Hbf", lat:51.4782, lon:11.9872, country:de, code:"LH", eva:"8010159" },
  { id:"leipzig", name:"Leipzig Hbf", lat:51.3451, lon:12.3822, country:de, code:"LL", eva:"8010205", hub:true },
  { id:"dresden", name:"Dresden Hbf", lat:51.0402, lon:13.7320, country:de, code:"DH", eva:"8010085", hub:true },
  { id:"chemnitz", name:"Chemnitz Hbf", lat:50.8395, lon:12.9303, country:de, code:"DCH" },
  { id:"gera", name:"Gera Hbf", lat:50.8822, lon:12.0762, country:de },
  { id:"jena", name:"Jena Paradies", lat:50.9289, lon:11.5873, country:de, code:"UJP" },
  { id:"weimar", name:"Weimar", lat:50.9919, lon:11.3264, country:de, code:"UW" },
  { id:"erfurt", name:"Erfurt Hbf", lat:50.9726, lon:11.0379, country:de, code:"UE", eva:"8010101", hub:true },
  { id:"fulda", name:"Fulda", lat:50.5531, lon:9.6843, country:de, code:"FFU", eva:"8000115" },
  { id:"marburg", name:"Marburg (Lahn)", lat:50.8208, lon:8.7751, country:de, code:"FMBG" },
  { id:"giessen", name:"Gießen", lat:50.5798, lon:8.6620, country:de, code:"FG" },
  { id:"frankfurt", name:"Frankfurt (Main) Hbf", lat:50.1071, lon:8.6638, country:de, code:"FF", eva:"8000105", hub:true },
  { id:"airport", name:"Frankfurt Flughafen Fernbf", lat:50.0532, lon:8.5703, country:de, code:"FFLF", eva:"8070003", hub:true },
  { id:"mainz", name:"Mainz Hbf", lat:50.0012, lon:8.2590, country:de, code:"FMZ", eva:"8000240" },
  { id:"darmstadt", name:"Darmstadt Hbf", lat:49.8728, lon:8.6326, country:de, code:"FD" },
  { id:"wuerzburg", name:"Würzburg Hbf", lat:49.8010, lon:9.9358, country:de, code:"NW", eva:"8000260", hub:true },
  { id:"bamberg", name:"Bamberg", lat:49.9002, lon:10.9007, country:de, code:"NBA" },
  { id:"coburg", name:"Coburg", lat:50.2636, lon:10.9592, country:de, code:"NC" },
  { id:"mannheim", name:"Mannheim Hbf", lat:49.4792, lon:8.4695, country:de, code:"RM", eva:"8000244", hub:true },
  { id:"heidelberg", name:"Heidelberg Hbf", lat:49.4035, lon:8.6750, country:de, code:"RH" },
  { id:"kaiserslautern", name:"Kaiserslautern Hbf", lat:49.4362, lon:7.7688, country:de, code:"SKL" },
  { id:"saarbruecken", name:"Saarbrücken Hbf", lat:49.2418, lon:6.9914, country:de, code:"SS", eva:"8000323" },
  { id:"karlsruhe", name:"Karlsruhe Hbf", lat:48.9934, lon:8.4006, country:de, code:"RK", eva:"8000191", hub:true },
  { id:"baden_baden", name:"Baden-Baden", lat:48.7903, lon:8.1909, country:de, code:"RBB" },
  { id:"offenburg", name:"Offenburg", lat:48.4765, lon:7.9468, country:de, code:"RO" },
  { id:"freiburg", name:"Freiburg (Breisgau) Hbf", lat:47.9978, lon:7.8413, country:de, code:"RF", eva:"8000107" },
  { id:"basel_bad", name:"Basel Bad Bf", lat:47.5680, lon:7.6070, country:de, code:"RBBF", eva:"8014499" },
  { id:"stuttgart", name:"Stuttgart Hbf", lat:48.7830, lon:9.1816, country:de, code:"TS", eva:"8000096", hub:true },
  { id:"ulm", name:"Ulm Hbf", lat:48.3995, lon:9.9824, country:de, code:"TU", eva:"8000170" },
  { id:"augsburg", name:"Augsburg Hbf", lat:48.3655, lon:10.8863, country:de, code:"MA", eva:"8000013" },
  { id:"nuernberg", name:"Nürnberg Hbf", lat:49.4469, lon:11.0823, country:de, code:"NN", eva:"8000284", hub:true },
  { id:"ingolstadt", name:"Ingolstadt Hbf", lat:48.7444, lon:11.4378, country:de, code:"MIH" },
  { id:"regensburg", name:"Regensburg Hbf", lat:49.0134, lon:12.1000, country:de, code:"NRH" },
  { id:"passau", name:"Passau Hbf", lat:48.5748, lon:13.4508, country:de, code:"NPA" },
  { id:"muenchen", name:"München Hbf", lat:48.1402, lon:11.5586, country:de, code:"MH", eva:"8000261", hub:true },
  { id:"rosenheim", name:"Rosenheim", lat:47.8500, lon:12.1190, country:de, code:"MRO" },
  { id:"oberstdorf", name:"Oberstdorf", lat:47.4100, lon:10.2787, country:de, code:"MO" },
  { id:"schleswig", name:"Schleswig", lat:54.499878, lon:9.537378, country:de, code:"ASW" },
  { id:"neumuenster", name:"Neumünster", lat:54.076356, lon:9.979856, country:de, code:"AN" },
  { id:"itzehoe", name:"Itzehoe", lat:53.923954, lon:9.510189, country:de, code:"AIZ" },
  { id:"bergen_ruegen", name:"Bergen auf Rügen", lat:54.420443, lon:13.417805, country:de, code:"WBG" },
  { id:"warnemuende", name:"Warnemünde", lat:54.175686, lon:12.091473, country:de, code:"WWM" },
  { id:"buetzow", name:"Bützow", lat:53.837370, lon:11.998577, country:de, code:"WB" },
  { id:"ribnitz", name:"Ribnitz-Damgarten West", lat:54.239190, lon:12.437114, country:de, code:"WRI" },
  { id:"zuessow", name:"Züssow", lat:53.973382, lon:13.548830, country:de, code:"WZS" },
  { id:"anklam", name:"Anklam", lat:53.856125, lon:13.701766, country:de, code:"WAK" },
  { id:"waren", name:"Waren (Müritz)", lat:53.521419, lon:12.680460, country:de, code:"WWR" },
  { id:"pasewalk", name:"Pasewalk", lat:53.515297, lon:13.988988, country:de, code:"WP" },
  { id:"ludwigslust", name:"Ludwigslust", lat:53.334795, lon:11.494189, country:de, code:"WL" },
  { id:"buechen", name:"Büchen", lat:53.475181, lon:10.622657, country:de, code:"ABCH" },
  { id:"lueneburg", name:"Lüneburg", lat:53.249743, lon:10.419733, country:de, code:"ALBG" },
  { id:"wittenberge", name:"Wittenberge", lat:53.003434, lon:11.762867, country:de, code:"WW" },
  { id:"neustrelitz", name:"Neustrelitz Hbf", lat:53.356746, lon:13.072379, country:de, code:"WNT" },
  { id:"prenzlau", name:"Prenzlau", lat:53.321641, lon:13.866432, country:de, code:"WPL" },
  { id:"norden", name:"Norden", lat:53.586744, lon:7.221040, country:de, code:"HNN" },
  { id:"marienhafe", name:"Marienhafe", lat:53.520916, lon:7.270488, country:de, code:"HMAR" },
  { id:"leer", name:"Leer (Ostfriesl)", lat:53.231381, lon:7.465357, country:de, code:"HLEE" },
  { id:"papenburg", name:"Papenburg (Ems)", lat:53.089658, lon:7.386683, country:de, code:"HPAP" },
  { id:"meppen", name:"Meppen", lat:52.696036, lon:7.297933, country:de, code:"HMEP" },
  { id:"lingen", name:"Lingen (Ems)", lat:52.519854, lon:7.321724, country:de, code:"HLIG" },
  { id:"rheine", name:"Rheine", lat:52.276358, lon:7.434502, country:de, code:"HR" },
  { id:"verden", name:"Verden (Aller)", lat:52.920824, lon:9.237730, country:de, code:"HV" },
  { id:"nienburg", name:"Nienburg (Weser)", lat:52.645568, lon:9.217709, country:de, code:"HNBG" },
  { id:"celle", name:"Celle", lat:52.620990, lon:10.062499, country:de, code:"HC" },
  { id:"salzwedel", name:"Salzwedel", lat:52.858226, lon:11.161657, country:de, code:"LSW" },
  { id:"minden", name:"Minden (Westf)", lat:52.290650, lon:8.934038, country:de, code:"HM" },
  { id:"recklinghausen", name:"Recklinghausen Hbf", lat:51.616050, lon:7.203434, country:de, code:"ERE" },
  { id:"gelsenkirchen", name:"Gelsenkirchen Hbf", lat:51.504581, lon:7.102722, country:de, code:"EG" },
  { id:"wanne_eickel", name:"Herne-Wanne-Eickel Hbf", lat:51.531062, lon:7.166530, country:de, code:"EWAN" },
  { id:"herford", name:"Herford", lat:52.119545, lon:8.664015, country:de, code:"EHFD" },
  { id:"guetersloh", name:"Gütersloh Hbf", lat:51.906934, lon:8.384973, country:de, code:"EGLO" },
  { id:"helmstedt", name:"Helmstedt", lat:52.222130, lon:11.010643, country:de, code:"HHLM" },
  { id:"wittenberg", name:"Lutherstadt Wittenberg Hbf", lat:51.867735, lon:12.661644, country:de, code:"LW" },
  { id:"hildesheim", name:"Hildesheim Hbf", lat:52.160332, lon:9.952089, country:de, code:"HHI" },
  { id:"koethen", name:"Köthen", lat:51.752370, lon:11.989357, country:de, code:"LK" },
  { id:"bitterfeld", name:"Bitterfeld", lat:51.622935, lon:12.316951, country:de, code:"LBT" },
  { id:"witten", name:"Witten Hbf", lat:51.435332, lon:7.329234, country:de, code:"EWIT" },
  { id:"letmathe", name:"Iserlohn-Letmathe", lat:51.362710, lon:7.618040, country:de, code:"ELE" },
  { id:"altena", name:"Altena (Westf)", lat:51.301878, lon:7.668807, country:de, code:"EALN" },
  { id:"finnentrop", name:"Finnentrop", lat:51.173274, lon:7.964755, country:de, code:"EFP" },
  { id:"altenhundem", name:"Lennestadt-Altenhundem", lat:51.104811, lon:8.071793, country:de, code:"EA" },
  { id:"grevenbroich", name:"Grevenbroich", lat:51.093251, lon:6.580294, country:de, code:"KGRB" },
  { id:"moenchengladbach", name:"Mönchengladbach Hbf", lat:51.196466, lon:6.446216, country:de, code:"KM" },
  { id:"herzogenrath", name:"Herzogenrath", lat:50.870894, lon:6.094456, country:de, code:"KHEZ" },
  { id:"krefeld", name:"Krefeld Hbf", lat:51.325585, lon:6.569961, country:de, code:"KKR" },
  { id:"duesseldorf_flughafen", name:"Düsseldorf Flughafen", lat:51.291555, lon:6.786968, country:de, code:"KDFF" },
  { id:"wetzlar", name:"Wetzlar", lat:50.565562, lon:8.503976, country:de, code:"FWR" },
  { id:"treysa", name:"Treysa", lat:50.910632, lon:9.185804, country:de, code:"FTS" },
  { id:"wabern", name:"Wabern (Bz Kassel)", lat:51.103134, lon:9.358139, country:de, code:"FWAB" },
  { id:"bad_hersfeld", name:"Bad Hersfeld", lat:50.869942, lon:9.716521, country:de, code:"FBHF" },
  { id:"eisenach", name:"Eisenach", lat:50.976780, lon:10.332013, country:de, code:"UEI" },
  { id:"naumburg", name:"Naumburg (Saale) Hbf", lat:51.163056, lon:11.796661, country:de, code:"UNM" },
  { id:"weissenfels", name:"Weißenfels", lat:51.204687, lon:11.971101, country:de, code:"UWS" },
  { id:"freiberg", name:"Freiberg (Sachs)", lat:50.908697, lon:13.344597, country:de, code:"DFR" },
  { id:"bad_schandau", name:"Bad Schandau", lat:50.918766, lon:14.139854, country:de, code:"DSA" },
  { id:"riesa", name:"Riesa", lat:51.309620, lon:13.287433, country:de, code:"DR" },
  { id:"elsterwerda", name:"Elsterwerda", lat:51.460103, lon:13.516442, country:de, code:"BEW" },
  { id:"rudolstadt", name:"Rudolstadt (Thür)", lat:50.718014, lon:11.339164, country:de, code:"UR" },
  { id:"saalfeld", name:"Saalfeld (Saale)", lat:50.650474, lon:11.374702, country:de, code:"US" },
  { id:"stadtroda", name:"Stadtroda", lat:50.868166, lon:11.723219, country:de, code:"USR" },
  { id:"hermsdorf", name:"Hermsdorf-Klosterlausnitz", lat:50.903722, lon:11.858551, country:de, code:"UHK" },
  { id:"ludwigsstadt", name:"Ludwigsstadt", lat:50.486730, lon:11.382938, country:de, code:"NLUS" },
  { id:"kronach", name:"Kronach", lat:50.239660, lon:11.320237, country:de, code:"NK" },
  { id:"lichtenfels", name:"Lichtenfels", lat:50.146449, lon:11.059386, country:de, code:"NLF" },
  { id:"erlangen", name:"Erlangen", lat:49.595977, lon:11.001742, country:de, code:"NER" },
  { id:"hanau", name:"Hanau Hbf", lat:50.120553, lon:8.928786, country:de, code:"FH" },
  { id:"aschaffenburg", name:"Aschaffenburg Hbf", lat:49.980359, lon:9.143843, country:de, code:"NAH" },
  { id:"friedberg", name:"Friedberg (Hess)", lat:50.332832, lon:8.761288, country:de, code:"FFG" },
  { id:"wiesbaden", name:"Wiesbaden Hbf", lat:50.070448, lon:8.243550, country:de, code:"FW" },
  { id:"bensheim", name:"Bensheim", lat:49.681401, lon:8.616529, country:de, code:"FBH" },
  { id:"weinheim", name:"Weinheim (Bergstr) Hbf", lat:49.553707, lon:8.665714, country:de, code:"RWE" },
  { id:"ansbach", name:"Ansbach", lat:49.297948, lon:10.577761, country:de, code:"NAN" },
  { id:"crailsheim", name:"Crailsheim", lat:49.138505, lon:10.064728, country:de, code:"TC" },
  { id:"wiesloch", name:"Wiesloch-Walldorf", lat:49.291026, lon:8.664232, country:de, code:"RWS" },
  { id:"ellwangen", name:"Ellwangen", lat:48.964146, lon:10.129709, country:de, code:"TEL" },
  { id:"aalen", name:"Aalen Hbf", lat:48.841111, lon:10.096472, country:de, code:"TA" },
  { id:"schwaebisch_gmuend", name:"Schwäbisch Gmünd", lat:48.801191, lon:9.788407, country:de, code:"TSG" },
  { id:"vaihingen", name:"Vaihingen (Enz)", lat:48.947229, lon:8.959096, country:de, code:"TV" },
  { id:"bruchsal", name:"Bruchsal", lat:49.124580, lon:8.589793, country:de, code:"RBR" },
  { id:"pforzheim", name:"Pforzheim Hbf", lat:48.894060, lon:8.702988, country:de, code:"TPH" },
  { id:"muehlacker", name:"Mühlacker", lat:48.953239, lon:8.845801, country:de, code:"TM" },
  { id:"boeblingen", name:"Böblingen", lat:48.688002, lon:9.004294, country:de, code:"TBO" },
  { id:"herrenberg", name:"Herrenberg", lat:48.594143, lon:8.862886, country:de, code:"THE" },
  { id:"bondorf", name:"Bondorf (b Herrenberg)", lat:48.523457, lon:8.827741, country:de, code:"TBD" },
  { id:"gaeufelden", name:"Gäufelden", lat:48.559736, lon:8.850077, country:de, code:"TGFD" },
  { id:"horb", name:"Horb", lat:48.441635, lon:8.689220, country:de, code:"THB" },
  { id:"sulz", name:"Sulz (Neckar)", lat:48.366853, lon:8.636863, country:de, code:"TSUL" },
  { id:"oberndorf", name:"Oberndorf (Neckar)", lat:48.295325, lon:8.575550, country:de, code:"TOB" },
  { id:"rottweil", name:"Rottweil", lat:48.165172, lon:8.639351, country:de, code:"TR" },
  { id:"tuttlingen", name:"Tuttlingen", lat:47.980506, lon:8.798737, country:de, code:"TTU" },
  { id:"singen", name:"Singen (Hohentwiel)", lat:47.758821, lon:8.841210, country:de, code:"RSI" },
  { id:"engen", name:"Engen", lat:47.856353, lon:8.772820, country:de, code:"RENG" },
  { id:"ringsheim", name:"Ringsheim/Europa-Park", lat:48.248923, lon:7.773224, country:de, code:"RRI" },
  { id:"muellheim", name:"Müllheim im Markgräflerland", lat:47.810037, lon:7.599555, country:de, code:"RML" },
  { id:"weil_am_rhein", name:"Weil am Rhein", lat:47.594047, lon:7.608482, country:de, code:"RW" },
  { id:"st_georgen", name:"St Georgen (Schwarzw)", lat:48.123916, lon:8.342125, country:de, code:"RSGO" },
  { id:"villingen", name:"Villingen (Schwarzw)", lat:48.057841, lon:8.465523, country:de, code:"RVL" },
  { id:"donaueschingen", name:"Donaueschingen", lat:47.947912, lon:8.498805, country:de, code:"RDO" },
  { id:"aulendorf", name:"Aulendorf", lat:47.953084, lon:9.643976, country:de, code:"TAU" },
  { id:"biberach", name:"Biberach (Riß)", lat:48.101845, lon:9.793160, country:de, code:"TBI" },
  { id:"ravensburg", name:"Ravensburg", lat:47.784345, lon:9.605998, country:de, code:"TRB" },
  { id:"friedrichshafen", name:"Friedrichshafen Stadt", lat:47.653250, lon:9.473504, country:de, code:"TF" },
  { id:"lindau", name:"Lindau-Reutin", lat:47.552446, lon:9.702873, country:de, code:"MLIR" },
  { id:"kempten", name:"Kempten (Allgäu) Hbf", lat:47.711818, lon:10.317702, country:de, code:"MKP" },
  { id:"buchloe", name:"Buchloe", lat:48.033766, lon:10.716190, country:de, code:"MBU" },
  { id:"memmingen", name:"Memmingen", lat:47.985847, lon:10.187066, country:de, code:"MM" },
  { id:"immenstadt", name:"Immenstadt", lat:47.559064, lon:10.214205, country:de, code:"MIMS" },
  { id:"plattling", name:"Plattling", lat:48.779686, lon:12.863979, country:de, code:"NPL" },
  { id:"schaffhausen", name:"Schaffhausen", lat:47.698480, lon:8.632359, country:"CH", code:"RSCF" },
  { id:"basel_sbb", name:"Basel SBB", lat:47.5476, lon:7.5896, country:"CH", hub:true },
  { id:"zuerich", name:"Zürich HB", lat:47.3782, lon:8.5402, country:"CH", hub:true },
  { id:"salzburg", name:"Salzburg Hbf", lat:47.8131, lon:13.0454, country:"AT", hub:true },
  { id:"wien", name:"Wien Hbf", lat:48.1850, lon:16.3768, country:"AT", hub:true },
  { id:"amsterdam", name:"Amsterdam Centraal", lat:52.3791, lon:4.8994, country:"NL", hub:true },
  { id:"bruxelles", name:"Bruxelles-Midi", lat:50.8357, lon:4.3365, country:"BE", hub:true },
  { id:"paris", name:"Paris Est", lat:48.8760, lon:2.3592, country:"FR", hub:true },
  { id:"praha", name:"Praha hl.n.", lat:50.0831, lon:14.4350, country:"CZ", hub:true },
  { id:"kopenhagen", name:"København H", lat:55.6727, lon:12.5647, country:"DK", hub:true },
  { id:"goerlitz", name:"Görlitz", lat:51.1476, lon:14.9795, country:de },
  { id:"wroclaw", name:"Wrocław Główny", lat:51.0990, lon:17.0360, country:"PL" },
  { id:"krakow", name:"Kraków Główny", lat:50.0672, lon:19.9450, country:"PL", hub:true },
];

export const ROUTES: Route[] = [
  { id:"ICE 10", type:"ICE", operator:"DB Fernverkehr", frequency:18, days:daily, times:allDay, stops:["berlin_ost","berlin","berlin_spandau","wolfsburg","hannover","minden","bielefeld","hamm","dortmund","bochum","essen","duisburg","duesseldorf"] },
  { id:"ICE 10 Wupper", type:"ICE", operator:"DB Fernverkehr", frequency:9, days:daily, times:allDay, stops:["berlin_ost","berlin","berlin_spandau","wolfsburg","hannover","bielefeld","hamm","hagen","wuppertal","solingen","koeln"] },
  { id:"ICE 11", type:"ICE", operator:"DB Fernverkehr", frequency:10, days:daily, times:allDay, stops:["berlin_sued","berlin","leipzig","erfurt","fulda","frankfurt","mannheim","stuttgart","ulm","augsburg","muenchen"] },
  { id:"ICE 12", type:"ICE", operator:"DB Fernverkehr", frequency:9, days:daily, times:allDay, stops:["berlin_ost","berlin","berlin_spandau","wolfsburg","braunschweig","hildesheim","goettingen","kassel","fulda","frankfurt","mannheim","karlsruhe","baden_baden","offenburg","freiburg","basel_bad","basel_sbb"] },
  { id:"ICE 13", type:"ICE", operator:"DB Fernverkehr", frequency:8, days:daily, times:allDay, stops:["berlin_ost","berlin","berlin_spandau","wolfsburg","braunschweig","hildesheim","goettingen","kassel","fulda","frankfurt","airport"] },
  { id:"ICE 15", type:"ICE", operator:"DB Fernverkehr", frequency:10, days:daily, times:allDay, stops:["berlin","halle","erfurt","fulda","frankfurt"] },
  { id:"ICE 18", type:"ICE", operator:"DB Fernverkehr", frequency:14, days:daily, times:allDay, stops:["hamburg_altona","hamburg","berlin_spandau","berlin","halle","erfurt","bamberg","erlangen","nuernberg","ingolstadt","muenchen"] },
  { id:"ICE 20", type:"ICE", operator:"DB Fernverkehr", frequency:9, days:daily, times:allDay, stops:["kiel","hamburg","hannover","goettingen","kassel","fulda","frankfurt","mannheim","karlsruhe","offenburg","freiburg","basel_bad","basel_sbb"] },
  { id:"ICE 22", type:"ICE", operator:"DB Fernverkehr", frequency:9, days:daily, times:allDay, stops:["kiel","hamburg","hannover","goettingen","kassel","fulda","frankfurt","mannheim","stuttgart"] },
  { id:"ICE 25", type:"ICE", operator:"DB Fernverkehr", frequency:12, days:daily, times:allDay, stops:["hamburg_altona","hamburg","hannover","goettingen","kassel","wuerzburg","nuernberg","ingolstadt","muenchen"] },
  { id:"ICE 26", type:"ICE", operator:"DB Fernverkehr", frequency:8, days:daily, times:allDay, stops:["hamburg_altona","hamburg","hannover","goettingen","kassel","wabern","treysa","marburg","giessen","friedberg","frankfurt","darmstadt","bensheim","weinheim","heidelberg","wiesloch","karlsruhe"] },
  { id:"ICE 28", type:"ICE", operator:"DB Fernverkehr", frequency:10, days:daily, times:allDay, stops:["hamburg","ludwigslust","berlin_spandau","berlin","leipzig","erfurt","bamberg","erlangen","nuernberg","muenchen"] },
  { id:"ICE 29", type:"ICE", operator:"DB Fernverkehr", frequency:10, days:daily, times:allDay, stops:["berlin","halle","erfurt","coburg","lichtenfels","erlangen","nuernberg","muenchen"] },
  { id:"ICE 41", type:"ICE", operator:"DB Fernverkehr", frequency:18, days:daily, times:allDay, stops:["dortmund","bochum","essen","duisburg","duesseldorf","koeln","airport","frankfurt","wuerzburg","nuernberg","muenchen"] },
  { id:"ICE 42", type:"ICE", operator:"DB Fernverkehr", frequency:12, days:daily, times:allDay, stops:["dortmund","essen","duisburg","duesseldorf","koeln","siegburg","airport","mannheim","stuttgart","ulm","augsburg","muenchen"] },
  { id:"ICE 43", type:"ICE", operator:"DB Fernverkehr", frequency:8, days:daily, times:allDay, stops:["dortmund","hagen","wuppertal","solingen","koeln","airport","mannheim","karlsruhe","offenburg","freiburg","basel_bad","basel_sbb"] },
  { id:"ICE 47", type:"ICE", operator:"DB Fernverkehr", frequency:8, days:daily, times:["day","evening"], stops:["dortmund","essen","duisburg","duesseldorf","koeln","airport","mannheim","stuttgart"] },
  { id:"ICE 49", type:"ICE", operator:"DB Fernverkehr", frequency:8, days:daily, times:allDay, stops:["koeln","siegburg","montabaur","limburg","airport","frankfurt"] },
  { id:"ICE 50", type:"ICE", operator:"DB Fernverkehr", frequency:10, days:daily, times:allDay, stops:["dresden","riesa","leipzig","erfurt","eisenach","bad_hersfeld","fulda","frankfurt","mainz","wiesbaden"] },
  { id:"ICE 91", type:"ICE", operator:"DB Fernverkehr / ÖBB", frequency:6, days:daily, times:["early","day","evening"], stops:["hamburg","hannover","goettingen","kassel","wuerzburg","nuernberg","regensburg","plattling","passau","wien"] },
  { id:"ICE 78", type:"ICE", operator:"DB Fernverkehr / NS", frequency:7, days:daily, times:allDay, stops:["amsterdam","oberhausen","duisburg","duesseldorf","koeln","airport","frankfurt"] },
  { id:"ICE 79", type:"ICE", operator:"DB Fernverkehr / SNCB", frequency:6, days:daily, times:["day","evening"], stops:["bruxelles","aachen","koeln","airport","frankfurt"] },
  { id:"ICE/TGV 82", type:"ICE", operator:"DB Fernverkehr / SNCF", frequency:5, days:daily, times:["day","evening"], stops:["paris","saarbruecken","kaiserslautern","mannheim","frankfurt"] },
  { id:"ICE L Sylt", type:"ICE", operator:"DB Fernverkehr", frequency:4, days:daily, times:["day"], note:"ab Mai 2026", stops:["berlin","hamburg","heide","husum","niebuell","westerland"] },
  { id:"IC 17", type:"IC", operator:"DB Fernverkehr", frequency:8, days:daily, times:allDay, stops:["warnemuende","rostock","waren","neustrelitz","berlin","berlin_sued","elsterwerda","dresden","freiberg","chemnitz"] },
  { id:"IC 30", type:"IC", operator:"DB Fernverkehr", frequency:8, days:daily, times:allDay, stops:["hamburg_altona","hamburg","bremen","osnabrueck","muenster","dortmund","essen","duisburg","duesseldorf","koeln","bonn","koblenz","mainz","mannheim","stuttgart"] },
  { id:"IC 31", type:"IC", operator:"DB Fernverkehr", frequency:7, days:daily, times:allDay, stops:["hamburg","bremen","osnabrueck","muenster","dortmund","essen","duisburg","duesseldorf","koeln","bonn","koblenz","mainz","frankfurt"] },
  { id:"IC 34", type:"IC", operator:"DB Fernverkehr", frequency:6, days:daily, times:["day","evening"], stops:["frankfurt","friedberg","giessen","wetzlar","marburg","siegen","altenhundem","finnentrop","altena","letmathe","hagen","witten","dortmund","muenster"] },
  { id:"IC 35", type:"IC", operator:"DB Fernverkehr", frequency:6, days:daily, times:["early","day","evening"], stops:["norddeich","norden","marienhafe","emden","leer","papenburg","meppen","lingen","rheine","muenster","recklinghausen","wanne_eickel","gelsenkirchen","essen","duisburg","duesseldorf","koeln","bonn","koblenz","mainz","mannheim","stuttgart"] },
  { id:"IC 51", type:"IC", operator:"DB Fernverkehr", frequency:5, days:[5,6,0], times:["day","evening"], note:"Wochenendangebot", stops:["gera","hermsdorf","stadtroda","jena","weimar","erfurt","eisenach","kassel","paderborn","hamm","dortmund"] },
  { id:"IC 55", type:"IC", operator:"DB Fernverkehr", frequency:8, days:daily, times:allDay, stops:["dresden","riesa","leipzig","halle","koethen","magdeburg","braunschweig","hannover","minden","herford","bielefeld","guetersloh","hamm","dortmund","essen","duisburg","duesseldorf","koeln"] },
  { id:"IC 56", type:"IC", operator:"DB Fernverkehr", frequency:8, days:daily, times:allDay, stops:["norddeich","norden","marienhafe","emden","leer","oldenburg","bremen","verden","nienburg","hannover","braunschweig","helmstedt","magdeburg","koethen","halle","leipzig"] },
  { id:"IC Ostsee", type:"IC", operator:"DB Fernverkehr", frequency:4, days:[5,6,0], times:["day"], note:"saisonal / Wochenende", stops:["hamburg","buechen","schwerin","buetzow","rostock","ribnitz","stralsund","greifswald","bergen_ruegen","binz"] },
  { id:"IC Allgäu", type:"IC", operator:"DB Fernverkehr", frequency:4, days:daily, times:["day"], stops:["dortmund","duesseldorf","koeln","mannheim","stuttgart","ulm","memmingen","kempten","immenstadt","oberstdorf"] },
  { id:"EC 9", type:"EC", operator:"DB Fernverkehr / SBB", frequency:6, days:daily, times:allDay, stops:["hamburg","bremen","osnabrueck","muenster","dortmund","essen","duisburg","duesseldorf","koeln","bonn","koblenz","mainz","mannheim","karlsruhe","freiburg","basel_sbb","zuerich"] },
  { id:"EC 27", type:"EC", operator:"DB Fernverkehr / ČD", frequency:7, days:daily, times:allDay, stops:["hamburg","ludwigslust","wittenberge","berlin","berlin_sued","elsterwerda","dresden","bad_schandau","praha"] },
  { id:"EC 89", type:"EC", operator:"DB Fernverkehr / ÖBB", frequency:6, days:daily, times:allDay, stops:["muenchen","rosenheim","salzburg","wien"] },
  { id:"EC København–Praha", type:"EC", operator:"DSB / DB / ČD", frequency:4, days:daily, times:["day"], note:"ab Mai 2026", stops:["kopenhagen","hamburg","berlin","dresden","praha"] },
  { id:"EC Leipzig–Kraków", type:"EC", operator:"DB Fernverkehr / PKP", frequency:4, days:daily, times:["day"], note:"neu im Fahrplan 2026", stops:["leipzig","dresden","goerlitz","wroclaw","krakow"] },
  { id:"EC 76", type:"EC", operator:"DSB / DB Fernverkehr", frequency:6, days:daily, times:allDay, stops:["kopenhagen","flensburg","schleswig","neumuenster","hamburg"] },
  { id:"IC 14", type:"IC", operator:"DB Fernverkehr", frequency:6, days:daily, times:allDay, stops:["aachen","herzogenrath","moenchengladbach","grevenbroich","koeln","hamm","guetersloh","bielefeld","herford","minden","hannover","braunschweig","magdeburg","berlin"] },
  { id:"IC 24", type:"IC", operator:"DB Fernverkehr", frequency:4, days:daily, times:["day"], stops:["hamburg","lueneburg","celle","hannover","goettingen","kassel","wuerzburg","ansbach","augsburg","muenchen"] },
  { id:"IC 61", type:"IC", operator:"DB Fernverkehr", frequency:7, days:daily, times:allDay, stops:["karlsruhe","pforzheim","muehlacker","vaihingen","stuttgart","schwaebisch_gmuend","aalen","ellwangen","crailsheim","ansbach","nuernberg","erlangen","bamberg","lichtenfels","kronach","ludwigsstadt","saalfeld","rudolstadt","jena","naumburg","weissenfels","leipzig"] },
  { id:"IC 62", type:"IC", operator:"DB Fernverkehr / ÖBB", frequency:6, days:daily, times:allDay, stops:["frankfurt","darmstadt","bensheim","weinheim","heidelberg","stuttgart","ulm","augsburg","muenchen","rosenheim","salzburg"] },
  { id:"IC 75", type:"IC", operator:"DB Fernverkehr", frequency:5, days:daily, times:["day","evening"], stops:["westerland","niebuell","husum","heide","itzehoe","hamburg"] },
  { id:"IC 77", type:"IC", operator:"DB Fernverkehr / NS", frequency:7, days:daily, times:allDay, stops:["amsterdam","rheine","osnabrueck","minden","hannover","wolfsburg","stendal","berlin_spandau","berlin"] },
  { id:"IC 87", type:"IC", operator:"DB Fernverkehr / SBB", frequency:6, days:daily, times:allDay, stops:["stuttgart","boeblingen","herrenberg","horb","sulz","oberndorf","rottweil","tuttlingen","singen","schaffhausen","zuerich"] },
  { id:"IC Bodensee", type:"IC", operator:"DB Fernverkehr", frequency:4, days:daily, times:["day"], stops:["stuttgart","ulm","biberach","aulendorf","ravensburg","friedrichshafen","lindau"] },
  { id:"IC Schwarzwald", type:"IC", operator:"DB Fernverkehr", frequency:4, days:[5,6,0], times:["day"], note:"Wochenende / saisonal", stops:["karlsruhe","offenburg","st_georgen","villingen","donaueschingen","engen","singen"] },
  { id:"IC Rhein", type:"IC", operator:"DB Fernverkehr", frequency:5, days:daily, times:["day","evening"], stops:["karlsruhe","baden_baden","offenburg","ringsheim","freiburg","muellheim","weil_am_rhein","basel_bad","basel_sbb"] },
];

export const STATION_BY_ID = new Map(STATIONS.map((station) => [station.id, station]));
export const OPERATORS = [...new Set(ROUTES.map((route) => route.operator))].sort();
export const TYPE_COLORS: Record<TrainType, string> = { ICE:"#e43f4c", IC:"#0f8b8d", EC:"#7657d6" };

function distanceKm(a: Station, b: Station) {
  const radius = 6371;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

export function routePath(route: Route, from: string, to: string) {
  const fromIndex = route.stops.indexOf(from);
  const toIndex = route.stops.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return [];
  const ids = fromIndex <= toIndex ? route.stops.slice(fromIndex, toIndex + 1) : route.stops.slice(toIndex, fromIndex + 1).reverse();
  return ids.map((id) => STATION_BY_ID.get(id)).filter((station): station is Station => Boolean(station));
}

export function estimateMinutes(route: Route, from: string, to: string) {
  const path = routePath(route, from, to);
  let distance = 0;
  for (let index = 1; index < path.length; index += 1) distance += distanceKm(path[index - 1], path[index]);
  const speed = route.type === "ICE" ? 145 : route.type === "EC" ? 118 : 112;
  return Math.max(28, Math.round(distance / speed * 60 + Math.max(0, path.length - 2) * 6));
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} Std. ${rest ? `${rest} Min.` : ""}` : `${rest} Min.`;
}
