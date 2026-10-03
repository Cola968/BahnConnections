import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./website.module.css";

export const metadata: Metadata = {
  title: "BahnConnections | Fahrplan, Live-Abfahrten und Karte",
  description: "BahnConnections ist eine unabhängige Bahn-Webanwendung für Verbindungssuche, Live-Abfahrten, Fahrtdetails und Kartenansichten.",
  openGraph: {
    title: "BahnConnections | Bahnreisen planen und Live-Status prüfen",
    description: "Verbindungen, Abfahrten und Echtzeitinformationen in einer klaren Weboberfläche.",
    images: ["/og.png"],
  },
};

const Arrow = () => <span aria-hidden="true">→</span>;

export default function WebsitePage() {
  return (
    <main className={styles.site} data-website="bahnconnections">
      <div className={styles.notice}>Unabhängiges Projekt · keine offizielle Anwendung der Deutschen Bahn AG</div>

      <header className={styles.header}>
        <Link className={styles.brand} href="/website" aria-label="BahnConnections Startseite">
          <Image src="/app-icon.svg" alt="" width={32} height={32} priority />
          <span>BahnConnections</span>
        </Link>
        <nav className={styles.nav} aria-label="Hauptnavigation">
          <a href="#funktionen">Funktionen</a>
          <a href="#echtzeit">Echtzeit</a>
          <a href="#daten">Daten & DB</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className={styles.headerActions}>
          <Link href="/install">Installieren</Link>
          <Link className={styles.appButton} href="/">App öffnen</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>Bahnreisen in Deutschland</span>
          <h1>Bahnreisen planen.<br />Echtzeit prüfen.</h1>
          <p>BahnConnections verbindet Fahrplanauskunft, Live-Abfahrten und Kartenansichten in einer übersichtlichen Weboberfläche. Ohne unnötige Produkttexte und ohne vorgetäuschte Echtzeit.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/">Verbindung planen <Arrow /></Link>
            <Link className={styles.textButton} href="/?view=departures">Abfahrten ansehen <Arrow /></Link>
          </div>
        </div>

        <aside className={styles.quickPanel} aria-label="Schnellzugriff">
          <div className={styles.quickPanelHead}>
            <strong>Schnellzugriff</strong>
            <span>Direkt in BahnConnections</span>
          </div>
          <Link href="/">
            <span><b>Verbindung suchen</b><small>Start, Ziel und Reisezeit</small></span><Arrow />
          </Link>
          <Link href="/?view=departures">
            <span><b>Abfahrten prüfen</b><small>Sollzeit, Istzeit und Gleis</small></span><Arrow />
          </Link>
          <Link href="/?view=map">
            <span><b>Karte öffnen</b><small>Bahnhöfe und Zugverläufe</small></span><Arrow />
          </Link>
          <Link href="/install">
            <span><b>Als App installieren</b><small>PWA für Desktop und Mobilgeräte</small></span><Arrow />
          </Link>
        </aside>
      </section>

      <section className={styles.serviceStrip} aria-label="Produktübersicht">
        <div><strong>Verbindungssuche</strong><span>Fern-, Regional- und Stadtverkehr</span></div>
        <div><strong>Live-Abfahrten</strong><span>mit sichtbarer Datenlage</span></div>
        <div><strong>Fahrtdetails</strong><span>Halte, Gleise und Abweichungen</span></div>
        <div><strong>Kartenansicht</strong><span>Strecken und Bahnhöfe</span></div>
      </section>

      <section className={styles.contentSection} id="funktionen">
        <div className={styles.sectionIntro}>
          <span className={styles.sectionLabel}>Funktionen</span>
          <h2>Für die Reise gebaut, nicht für eine Produktdemo.</h2>
          <p>Die Website erklärt die wichtigsten Funktionen. Die eigentliche Reiseplanung findet direkt in BahnConnections statt.</p>
        </div>

        <div className={styles.featureRows}>
          <article>
            <span className={styles.featureIndex}>01</span>
            <div><h3>Verbindungen</h3><p>Verbindungen mit Alternativen, Umstiegen und erwarteter Ankunft vergleichen.</p></div>
            <Link href="/">Planer öffnen <Arrow /></Link>
          </article>
          <article>
            <span className={styles.featureIndex}>02</span>
            <div><h3>Abfahrten</h3><p>Abfahrt, Ankunft, Gleis und Ausfall werden getrennt und eindeutig dargestellt.</p></div>
            <Link href="/?view=departures">Abfahrten öffnen <Arrow /></Link>
          </article>
          <article>
            <span className={styles.featureIndex}>03</span>
            <div><h3>Fahrtverlauf</h3><p>Alle Halte einer Fahrt mit Soll-/Ist-Zeiten und verfügbaren Echtzeitinformationen.</p></div>
            <Link href="/">Fahrt suchen <Arrow /></Link>
          </article>
          <article>
            <span className={styles.featureIndex}>04</span>
            <div><h3>Karte</h3><p>Bahnhöfe, Strecken und Zugverläufe als Ergänzung zur Reiseinformation.</p></div>
            <Link href="/?view=map">Karte öffnen <Arrow /></Link>
          </article>
        </div>
      </section>

      <section className={styles.realtimeSection} id="echtzeit">
        <div className={styles.sectionIntro}>
          <span className={styles.sectionLabel}>Echtzeit</span>
          <h2>Fahrplan und Live-Daten bleiben unterscheidbar.</h2>
          <p>Eine geplante Zeit wird nicht als Echtzeit ausgegeben. Abweichungen werden nur hervorgehoben, wenn die zugrunde liegende Information das hergibt.</p>
        </div>

        <div className={styles.statusTable}>
          <div className={styles.statusHeader}><span>Status</span><span>Darstellung</span><span>Bedeutung</span></div>
          <div><span><i className={styles.greenDot} />Früher</span><strong className={styles.green}>−3 Min.</strong><p>Bestätigte frühere Abfahrt oder Ankunft.</p></div>
          <div><span><i className={styles.neutralDot} />Pünktlich</span><strong>±0 Min.</strong><p>Keine unnötige Signalfarbe bei normalem Betrieb.</p></div>
          <div><span><i className={styles.amberDot} />Verspätet</span><strong className={styles.amber}>+9 Min.</strong><p>Abweichung gegenüber dem Fahrplan.</p></div>
          <div><span><i className={styles.redDot} />Entfällt</span><strong className={styles.red}>Ausfall</strong><p>Ausfall wird vor sekundären Informationen priorisiert.</p></div>
        </div>
      </section>

      <section className={styles.dataSection} id="daten">
        <div className={styles.dataCopy}>
          <span className={styles.sectionLabel}>Daten & DB</span>
          <h2>Klare Quellen. Klare Rollen.</h2>
          <p>BahnConnections nutzt externe Fahrplan- und Echtzeitquellen und kennzeichnet Datenlücken sichtbar. Die Anwendung ist aktuell unabhängig und kein offizielles Angebot der Deutschen Bahn.</p>

          <dl className={styles.sourceList}>
            <div><dt>Transitous / MOTIS</dt><dd>Hauptquelle für Haltestellen, Fahrten und Echtzeitdaten</dd></div>
            <div><dt>DB transport.rest</dt><dd>Unabhängige Gegenprüfung ausgewählter Reiseinformationen</dd></div>
            <div><dt>OpenStreetMap</dt><dd>Kartenmaterial und geografischer Kontext</dd></div>
          </dl>
        </div>

        <aside className={styles.partnershipBox}>
          <span className={styles.statusTag}>Zielbild</span>
          <h3>Offizielle DB-Partnerschaft</h3>
          <p>Für eine spätere Ausbaustufe ist eine offizielle technische Zusammenarbeit mit der Deutschen Bahn ein mögliches Ziel. Sie könnte Datenzugänge, Störungsinformationen und Verknüpfungen zu offiziellen Buchungswegen verbessern.</p>
          <ul>
            <li>verlässlichere offizielle Datenzugänge</li>
            <li>klarere Verknüpfung mit DB-Reiseinformationen</li>
            <li>mögliche Deep-Links zu offiziellen Buchungswegen</li>
          </ul>
          <div className={styles.partnershipNote}><strong>Aktueller Status:</strong> keine offizielle Partnerschaft. DB-Marken oder Logos werden deshalb nicht als Partnerkennzeichnung verwendet.</div>
        </aside>
      </section>

      <section className={styles.projectSection}>
        <div>
          <span className={styles.sectionLabel}>Projekt</span>
          <h2>Webanwendung statt Marketing-Fassade.</h2>
        </div>
        <div className={styles.projectText}>
          <p>BahnConnections soll vor allem eine funktionierende Fahrgastoberfläche sein. Deshalb stehen Datenqualität, Lesbarkeit und nachvollziehbare Echtzeit vor dekorativen Effekten.</p>
          <p>Neue Funktionen kommen erst dann auf die Website, wenn sie in der Anwendung einen konkreten Nutzen haben.</p>
        </div>
      </section>

      <section className={styles.faqSection} id="faq">
        <div className={styles.sectionIntro}>
          <span className={styles.sectionLabel}>FAQ</span>
          <h2>Häufige Fragen.</h2>
        </div>

        <div className={styles.faqList}>
          <details>
            <summary>Ist BahnConnections ein Angebot der Deutschen Bahn?</summary>
            <p>Nein. BahnConnections ist aktuell ein unabhängiges Projekt und keine offizielle Anwendung der Deutschen Bahn AG.</p>
          </details>
          <details>
            <summary>Gibt es bereits eine DB-Partnerschaft?</summary>
            <p>Nein. Eine offizielle technische Partnerschaft ist ein mögliches Ziel für eine spätere Ausbaustufe, wird auf dieser Website aber nicht als bestehend dargestellt.</p>
          </details>
          <details>
            <summary>Woher kommen Fahrplan- und Echtzeitdaten?</summary>
            <p>Die Anwendung nutzt Transitous/MOTIS als Hauptquelle und DB transport.rest als zusätzliche Gegenprüfung. Kartenmaterial stammt aus OpenStreetMap-Quellen.</p>
          </details>
          <details>
            <summary>Kann ich BahnConnections im Browser nutzen?</summary>
            <p>Ja. BahnConnections ist eine Webanwendung und kann direkt im Browser geöffnet werden. Zusätzlich lässt sie sich als Progressive Web App installieren.</p>
          </details>
        </div>
      </section>

      <section className={styles.finalSection}>
        <div><h2>BahnConnections im Browser öffnen.</h2><p>Keine Registrierung erforderlich, um die öffentlichen Kernfunktionen zu nutzen.</p></div>
        <div className={styles.finalActions}>
          <Link className={styles.primaryButton} href="/">App öffnen <Arrow /></Link>
          <Link className={styles.secondaryButton} href="/install">Installieren</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerMain}>
          <Link className={styles.brand} href="/website">
            <Image src="/app-icon.svg" alt="" width={30} height={30} />
            <span>BahnConnections</span>
          </Link>
          <nav aria-label="Footer">
            <Link href="/">App</Link>
            <Link href="/install">Installation</Link>
            <a href="#daten">Daten & DB</a>
            <a href="#faq">FAQ</a>
          </nav>
        </div>
        <div className={styles.footerLegal}>
          <span>Unabhängiges Projekt. Keine offizielle Anwendung der Deutschen Bahn AG.</span>
          <span>Fahrplan- und Echtzeitinformationen können kurzfristig abweichen.</span>
        </div>
      </footer>
    </main>
  );
}
