/* eslint-disable @next/next/no-html-link-for-pages -- Native links work before hydration. */
export default function Licenses() {
  return <main style={{maxWidth:820,margin:"0 auto",padding:"32px 20px",lineHeight:1.6,overflowWrap:"anywhere"}}>
    <a href="/">← Zurück zu BahnConnections</a>
    <h1>Lizenzen, Quellen und Datenqualität</h1>
    <p>Der eigene Anwendungscode steht unter MIT. Fremde Fahrplan- und Geodaten, Bibliotheken und Marken behalten ihre eigenen Bedingungen.</p>
    <h2>Fahrpläne und Karte</h2>
    <p><a href="https://transitous.org/sources/">Transitous-Datenquellen</a> · <a href="https://transitous.org/api/">Transitous-Nutzungsbedingungen</a> · <a href="https://v6.db.transport.rest/">DB transport.rest</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap-Mitwirkende, ODbL</a></p>
    <p>Ein DB-Abgleich ist eine Stichprobe. Er bestätigt weder die Vollständigkeit eines Bahnhofskomplexes noch eine unabhängige Freigabe des Betreibers. Nicht bestätigte Haltefolgen bleiben unbestätigt. Nur als Bus gemeldete Fahrten werden als Bus angezeigt; eine Liniennummer beweist keinen Ersatzverkehr.</p>
    <p>Verwaltungsgebiete: <a href="https://www.bkg.bund.de">© BKG (2026)</a>, <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>. VG250 wurde zur Zuordnung der Bundesländer verarbeitet. <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf">Quellen der Verwaltungsgebiete</a>.</p>
    <p>Die Freigabe der mitgelieferten DB-InfraGO-GeoViewer-Exporte (ISR Betriebsstellen und KOMBau Streckennetz) zur Weiterveröffentlichung ist noch nicht abschließend dokumentiert. Die MIT-Lizenz erteilt keine Rechte an diesen Daten.</p>
    <h2>Bibliotheken</h2>
    <p>Liquid Glass SDK, Next.js, React, React DOM und Stripe: MIT. Leaflet: BSD-2-Clause. Originaltexte und Copyright-Hinweise gelten zusätzlich.</p>
    <h2>Anwendungscode: MIT</h2>
    <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit"}}>{"MIT License\n\nCopyright (c) 2026 BahnConnections contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n"}</pre>
  </main>;
}
