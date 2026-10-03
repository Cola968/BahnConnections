import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./website.module.css";

export const metadata: Metadata = {
  title: "BahnConnections | Fahrplan, Live-Abfahrten und Bahnkarte",
  description: "BahnConnections ist eine unabhängige Webanwendung für Verbindungssuche, Live-Abfahrten, Fahrtdetails und Bahnkarte.",
  openGraph: {
    title: "BahnConnections | Fahrplan und Live-Informationen",
    description: "Bahnreisen planen, Abfahrten prüfen und Echtzeitinformationen nachvollziehen.",
    images: ["/og.png"],
  },
};

const Arrow = () => <span aria-hidden="true">→</span>;

export default function WebsitePage() {
  return (
    <main className={styles.site} data-website="bahnconnections">
      <div className={styles.independenceNotice}>
        <span>Unabhängiges Projekt</span>
        <span aria-hidden="true">·</span>
        <span>keine offizielle Anwendung der Deutschen Bahn AG</span>
      </div>

      <header className={styles.header}>
        <Link className={styles.brand} href="/website" aria-label="BahnConnections Startseite">
          <Image src="/app-icon.svg" alt="" width={32} height={32} priority />
          <span>BahnConnections</span>
        </Link>

        <nav className={styles.nav} aria-label="Hauptnavigation">
          <a href="#funktionen">Funktionen</a>
          <a href="#echtzeit">Echtzeit</a>
          <a href="#daten">Daten</a>
          <a href="#db-partnerschaft">DB-Zielbild</a>
          <a href="#faq">Hilfe</a>
        </nav>

        <div className={styles.headerActions}>
          <Link href="/install">Installieren</Link>
          <Link className={styles.appButton} href="/">Web-App öffnen</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <span className={styles.eyebrow}>Fahrplan & Echtzeit</span>
          <h1>Fahrplan, Abfahrten und Live-Informationen.</h1>
          <p>BahnConnections bündelt Verbindungssuche, Bahnhofstafeln und Fahrtverläufe in einer eigenständigen Webanwendung.</p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/">Fahrplan öffnen <Arrow /></Link>
            <Link className={styles.secondaryButton} href="/install">Als App installieren</Link>
          </div>

          <dl className={styles.heroFacts}>
            <div><dt>Netz</dt><dd>Deutschlandweit</dd></div>
            <div><dt>Echtzeit</dt><dd>wenn Quelle verfügbar</dd></div>
            <div><dt>Nutzung</dt><dd>ohne Konto möglich</dd></div>
          </dl>
        </div>

        <aside className={styles.journeyExample} aria-label="Beispieldarstellung einer Abfahrtstafel">
          <div className={styles.exampleHead}>
            <div>
              <span>Beispiel</span>
              <strong>Abfahrten · Berlin Hbf</strong>
            </div>
            <small>Darstellung der Statuslogik</small>
          </div>

          <div className={styles.departureHeader}>
            <span>Zug</span><span>Ziel</span><span>Zeit</span><span>Gleis</span>
          </div>

          <div className={styles.departureRow}>
            <span><b className={styles.ice}>ICE</b><small>1205</small></span>
            <strong>München Hbf</strong>
            <span className={styles.timeBlock}><del>16:44</del><b className={styles.early}>16:41</b><small className={styles.early}>3 Min. früher</small></span>
            <strong>4</strong>
          </div>

          <div className={styles.departureRow}>
            <span><b className={styles.re}>RE</b><small>3151</small></span>
            <strong>Leipzig Hbf</strong>
            <span className={styles.timeBlock}><b>16:52</b><small>planmäßig</small></span>
            <strong>7</strong>
          </div>

          <div className={styles.departureRow}>
            <span><b className={styles.ice}>ICE</b><small>279</small></span>
            <strong>Frankfurt (Main) Hbf</strong>
            <span className={styles.timeBlock}><del>17:03</del><b className={styles.cancelled}>Entfällt</b></span>
            <strong>—</strong>
          </div>

          <div className={styles.exampleFoot}>Beispieldaten · keine aktuelle Bahnhofstafel</div>
        </aside>
      </section>

      <section className={styles.quickLinks} aria-label="Funktionen der Web-App">
        <div className={styles.quickIntro}><strong>In der Web-App</strong><span>Die Reiseplanung selbst findet in BahnConnections statt.</span></div>
        <div className={styles.quickItem}><strong>Verbindung planen</strong><span>Start, Ziel, Zeit und Alternativen</span></div>
        <div className={styles.quickItem}><strong>Abfahrten prüfen</strong><span>Ist-Zeit, Gleis und Ausfälle</span></div>
        <div className={styles.quickItem}><strong>Karte und Fahrten</strong><span>Bahnhöfe, Strecken und Verläufe</span></div>
      </section>

      <section className={styles.section} id="funktionen">
        <div className={styles.sectionHeading}>
          <span>Funktionen</span>
          <h2>Die Reiseinformation steht im Mittelpunkt.</h2>
          <p>Keine getrennten Produktwelten: Planung, Tafel, Fahrtdetails und Karte gehören zu derselben Reise.</p>
        </div>

        <div className={styles.serviceList}>
          <article>
            <span className={styles.serviceIndex}>01</span>
            <div><h3>Verbindungssuche</h3><p>Start, Ziel und Reisezeit eingeben und Verbindungen mit Alternativen vergleichen.</p></div>
            <ul><li>Fern- und Regionalverkehr</li><li>Umstiege und Alternativen</li><li>erwartete Ankunft</li></ul>
          </article>
          <article>
            <span className={styles.serviceIndex}>02</span>
            <div><h3>Abfahrten und Ankünfte</h3><p>Bahnhofstafel mit Sollzeit, Istzeit, Gleis und Ausfällen.</p></div>
            <ul><li>früher = grün</li><li>Verspätung = amber</li><li>Ausfall = rot</li></ul>
          </article>
          <article>
            <span className={styles.serviceIndex}>03</span>
            <div><h3>Fahrtdetails</h3><p>Alle Halte einer Fahrt mit verfügbaren Echtzeitinformationen und Gleisänderungen.</p></div>
            <ul><li>kompletter Fahrtverlauf</li><li>Soll-/Ist-Zeiten</li><li>Datenlage sichtbar</li></ul>
          </article>
          <article>
            <span className={styles.serviceIndex}>04</span>
            <div><h3>Karte</h3><p>Bahnhöfe, Strecken und Zugverläufe ergänzen die tabellarischen Reiseinformationen.</p></div>
            <ul><li>Bahnhofshierarchie</li><li>Streckenverläufe</li><li>Live-Lage nach Datenquelle</li></ul>
          </article>
        </div>
      </section>

      <section className={styles.realtimeSection} id="echtzeit">
        <div className={styles.sectionHeading}>
          <span>Echtzeit</span>
          <h2>Fahrplan ist nicht automatisch Echtzeit.</h2>
          <p>BahnConnections hält geplante Zeiten, bestätigte Abweichungen und Ausfälle visuell auseinander.</p>
        </div>

        <div className={styles.statusTable}>
          <div className={styles.statusHeader}><span>Status</span><span>Beispiel</span><span>Darstellung</span><span>Warum</span></div>
          <div><span><i className={styles.greenDot}/>Früher</span><strong className={styles.green}>−3 Min.</strong><span>grün</span><p>bestätigte frühere Abfahrt oder Ankunft</p></div>
          <div><span><i className={styles.neutralDot}/>Pünktlich</span><strong>±0 Min.</strong><span>neutral</span><p>Normalbetrieb braucht keine Signalfarbe</p></div>
          <div><span><i className={styles.amberDot}/>Verspätet</span><strong className={styles.amber}>+9 Min.</strong><span>amber</span><p>erkennbare Abweichung vom Fahrplan</p></div>
          <div><span><i className={styles.redDot}/>Entfällt</span><strong className={styles.red}>Ausfall</strong><span>rot</span><p>Ausfall hat Priorität vor Nebendetails</p></div>
        </div>
      </section>

      <section className={styles.dataSection} id="daten">
        <div className={styles.sectionHeading}>
          <span>Daten</span>
          <h2>Quellen und Grenzen bleiben sichtbar.</h2>
          <p>BahnConnections kombiniert mehrere externe Quellen. Eine fehlende Live-Information wird nicht in eine scheinbar exakte Prognose umgedeutet.</p>
        </div>

        <div className={styles.sourceTable}>
          <div className={styles.sourceHeader}><span>Quelle</span><span>Einsatz</span><span>Rolle</span></div>
          <div><strong>Transitous / MOTIS</strong><span>Haltestellen, Fahrten und Echtzeit</span><b>Hauptquelle</b></div>
          <div><strong>transport.rest</strong><span>zusätzliche Prüfung ausgewählter DB-Fahrplandaten</span><b>unabhängige Gegenprüfung</b></div>
          <div><strong>OpenStreetMap</strong><span>Karte und geografischer Kontext</span><b>Kartenquelle</b></div>
        </div>

        <p className={styles.sourceNote}>BahnConnections ist kein offizielles Angebot dieser Anbieter. Verbindliche betriebliche Informationen stammen weiterhin von den jeweiligen Verkehrsunternehmen.</p>
      </section>

      <section className={styles.partnershipSection} id="db-partnerschaft">
        <div className={styles.partnershipLabel}>
          <span>DB-Partnerschaft</span>
          <strong>Zielbild · nicht aktuell vereinbart</strong>
        </div>

        <div className={styles.partnershipContent}>
          <div>
            <h2>Perspektive: offizielle technische Zusammenarbeit mit der Deutschen Bahn.</h2>
            <p>Eine formale Partnerschaft könnte BahnConnections langfristig verlässlichere offizielle Datenzugänge und bessere Übergänge zu DB-Reiseinformationen ermöglichen. Sie wird erst dann als Partnerschaft bezeichnet, wenn tatsächlich eine Vereinbarung besteht.</p>
          </div>

          <ol className={styles.partnershipSteps}>
            <li><span>Heute</span><div><strong>Unabhängige Webanwendung</strong><p>Externe Datenquellen, eigene Oberfläche, keine offizielle DB-Zugehörigkeit.</p></div></li>
            <li><span>Ziel</span><div><strong>Technische Kooperation</strong><p>Offizielle Schnittstellen, Störungsinformationen und klar definierte Datenrollen.</p></div></li>
            <li><span>Später</span><div><strong>Verknüpfte Reisewege</strong><p>Zum Beispiel Deep-Links zu offiziellen DB-Buchungs- oder Servicewegen, sofern vereinbart.</p></div></li>
          </ol>
        </div>

        <div className={styles.partnershipRule}><strong>Wichtig:</strong> Solange keine Vereinbarung besteht, verwendet BahnConnections weder DB-Logos als Partnerkennzeichnung noch Formulierungen, die eine offizielle Kooperation suggerieren.</div>
      </section>

      <section className={styles.webSection}>
        <div className={styles.sectionHeading}>
          <span>Browser zuerst</span>
          <h2>Eine Webanwendung, die auch installiert werden kann.</h2>
          <p>BahnConnections funktioniert direkt im Browser. Wer möchte, kann dieselbe Webanwendung zusätzlich als Progressive Web App installieren.</p>
        </div>
        <div className={styles.webFacts}>
          <div><strong>Desktop</strong><span>große Karte und Seitenpanel</span></div>
          <div><strong>Mobil</strong><span>Bottom-Sheet und kompakte Navigation</span></div>
          <div><strong>PWA</strong><span>installierbar ohne separaten App-Store</span></div>
        </div>
      </section>

      <section className={styles.faqSection} id="faq">
        <div className={styles.sectionHeading}>
          <span>Hilfe</span>
          <h2>Häufige Fragen.</h2>
        </div>

        <div className={styles.faqList}>
          <details>
            <summary>Ist BahnConnections eine offizielle DB-Anwendung?</summary>
            <p>Nein. BahnConnections ist aktuell ein unabhängiges Projekt und keine offizielle Anwendung der Deutschen Bahn AG.</p>
          </details>
          <details>
            <summary>Besteht bereits eine Partnerschaft mit der Deutschen Bahn?</summary>
            <p>Nein. Eine offizielle technische Zusammenarbeit ist ein Zielbild für eine spätere Ausbaustufe, aber derzeit nicht vereinbart.</p>
          </details>
          <details>
            <summary>Kann ich BahnConnections direkt im Browser nutzen?</summary>
            <p>Ja. Die Anwendung läuft im Browser und kann zusätzlich als Progressive Web App installiert werden.</p>
          </details>
          <details>
            <summary>Was passiert, wenn keine Echtzeitdaten vorhanden sind?</summary>
            <p>Dann bleibt die Darstellung als Fahrplaninformation gekennzeichnet. Fehlende Echtzeit wird nicht durch erfundene Prognosen ersetzt.</p>
          </details>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div><span>BahnConnections</span><h2>Web-App öffnen und Verbindung prüfen.</h2></div>
        <div><Link className={styles.primaryButton} href="/">Web-App öffnen <Arrow /></Link><Link className={styles.secondaryButton} href="/install">Installieren</Link></div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <Link className={styles.brand} href="/website">
            <Image src="/app-icon.svg" alt="" width={30} height={30} />
            <span>BahnConnections</span>
          </Link>
          <nav aria-label="Footer-Navigation">
            <a href="#funktionen">Funktionen</a>
            <a href="#echtzeit">Echtzeit</a>
            <a href="#daten">Daten</a>
            <a href="#db-partnerschaft">DB-Zielbild</a>
            <a href="#faq">Hilfe</a>
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <span>Unabhängiges Projekt · keine offizielle Anwendung der Deutschen Bahn AG</span>
          <span>Fahrplan- und Echtzeitinformationen können kurzfristig abweichen.</span>
        </div>
      </footer>
    </main>
  );
}
