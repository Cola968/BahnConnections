import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { APP_VERSION_LABEL } from "../app-version";
import styles from "./website.module.css";

export const metadata: Metadata = {
  title: "BahnConnections | Fahrplan, Abfahrten und Echtzeit",
  description: "BahnConnections ist eine unabhängige Webanwendung für Verbindungssuche, Live-Abfahrten, Fahrtdetails und Bahnkarte.",
  applicationName: "BahnConnections",
  category: "travel",
  openGraph: {
    title: "BahnConnections | Fahrplan, Abfahrten und Echtzeit",
    description: "Verbindungen planen, Abfahrten prüfen und Fahrtdetails nachvollziehen.",
    images: ["/og.png"],
  },
};

const Arrow = () => <span aria-hidden="true">→</span>;
const External = () => <span aria-hidden="true">↗</span>;

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "BahnConnections",
  applicationCategory: "TravelApplication",
  operatingSystem: "Web",
  description: "Unabhängige Webanwendung für Verbindungssuche, Live-Abfahrten, Fahrtdetails und Bahnkarte.",
};

export default function WebsitePage() {
  return (
    <div className={styles.site} data-website="bahnconnections">
      <a className={styles.skipLink} href="#main-content">Zum Inhalt springen</a>

      <header className={styles.headerShell}>
        <div className={styles.header}>
          <Link className={styles.brand} href="/website" aria-label="BahnConnections Startseite">
            <Image src="/app-icon.svg" alt="" width={32} height={32} priority />
            <span>BahnConnections</span>
          </Link>

          <nav className={styles.nav} aria-label="Hauptnavigation">
            <a href="#funktionen">Funktionen</a>
            <a href="#echtzeit">Echtzeit</a>
            <a href="#daten">Daten</a>
            <a href="#db">DB-Perspektive</a>
            <a href="#hilfe">Hilfe</a>
          </nav>

          <div className={styles.headerActions}>
            <span className={styles.versionBadge}>{APP_VERSION_LABEL}</span>
            <Link className={styles.headerLink} href="/install">Installieren</Link>
            <Link className={styles.appButton} href="/">Web-App öffnen</Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>BahnConnections Web</span>
            <h1>Bahnreisen planen. Abfahrten prüfen.</h1>
            <p>BahnConnections bündelt Verbindungssuche, Bahnhofstafeln, Fahrtdetails und Karte in einer eigenständigen Webanwendung für den Browser.</p>

            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/">Web-App öffnen <Arrow /></Link>
              <a className={styles.textLink} href="#daten">Daten & Echtzeit verstehen <Arrow /></a>
            </div>

            <dl className={styles.heroFacts}>
              <div><dt>Web-App</dt><dd>{APP_VERSION_LABEL}</dd></div>
              <div><dt>Zugang</dt><dd>ohne Konto möglich</dd></div>
              <div><dt>Installation</dt><dd>optional als PWA</dd></div>
            </dl>
          </div>

          <aside className={styles.boardExample} aria-label="Beispiel einer BahnConnections-Abfahrtstafel">
            <div className={styles.boardTop}>
              <div>
                <span>Beispieldarstellung</span>
                <strong>Berlin Hbf · Abfahrten</strong>
              </div>
              <small>keine Live-Tafel</small>
            </div>

            <div className={styles.boardColumns}>
              <span>Zug</span><span>Ziel</span><span>Zeit</span><span>Gleis</span>
            </div>

            <div className={styles.boardRow}>
              <span className={styles.serviceCell}><b className={styles.ice}>ICE</b><small>1205</small></span>
              <strong>München Hbf</strong>
              <span className={styles.timeCell}><del>16:44</del><b className={styles.early}>16:41</b><small className={styles.early}>3 Min. früher</small></span>
              <strong>4</strong>
            </div>

            <div className={styles.boardRow}>
              <span className={styles.serviceCell}><b className={styles.re}>RE</b><small>3151</small></span>
              <strong>Leipzig Hbf</strong>
              <span className={styles.timeCell}><b>16:52</b><small>planmäßig</small></span>
              <strong>7</strong>
            </div>

            <div className={styles.boardRow}>
              <span className={styles.serviceCell}><b className={styles.ice}>ICE</b><small>279</small></span>
              <strong>Frankfurt (Main) Hbf</strong>
              <span className={styles.timeCell}><del>17:03</del><b className={styles.cancelled}>Entfällt</b></span>
              <strong>—</strong>
            </div>

            <div className={styles.boardFoot}>Beispieldaten zur Darstellung der Statuslogik</div>
          </aside>
        </section>

        <section className={styles.capabilityBar} aria-label="Kernfunktionen">
          <div><strong>Verbindungen</strong><span>Start, Ziel, Reisezeit und Alternativen</span></div>
          <div><strong>Abfahrten</strong><span>Sollzeit, Istzeit, Gleis und Ausfall</span></div>
          <div><strong>Fahrtdetails</strong><span>Halte, Änderungen und Datenlage</span></div>
          <div><strong>Karte</strong><span>Bahnhöfe, Strecken und Zugverläufe</span></div>
        </section>

        <section className={styles.section} id="funktionen">
          <div className={styles.sectionIntro}>
            <span>Funktionen</span>
            <h2>Eine Oberfläche für die komplette Reiseinformation.</h2>
            <p>Planung, Bahnhofstafel, Fahrtverlauf und Karte greifen ineinander. Technische Details bleiben im Hintergrund, solange sie für die konkrete Reise nicht gebraucht werden.</p>
          </div>

          <div className={styles.serviceTable}>
            <article>
              <span className={styles.index}>01</span>
              <div><h3>Verbindungssuche</h3><p>Reisezeit eingeben, Alternativen vergleichen und die passende Verbindung öffnen.</p></div>
              <span className={styles.availability}>Web-App</span>
            </article>
            <article>
              <span className={styles.index}>02</span>
              <div><h3>Abfahrten & Ankünfte</h3><p>Bahnhofstafel mit verständlicher Echtzeit-, Gleis- und Ausfalllogik.</p></div>
              <span className={styles.availability}>Web-App</span>
            </article>
            <article>
              <span className={styles.index}>03</span>
              <div><h3>Fahrtverlauf</h3><p>Halte, Soll-/Ist-Zeiten und Gleisänderungen einer konkreten Fahrt nachvollziehen.</p></div>
              <span className={styles.availability}>Web-App</span>
            </article>
            <article>
              <span className={styles.index}>04</span>
              <div><h3>Karte</h3><p>Bahnhöfe und Zugverläufe räumlich einordnen, ohne die Reiseinformation zu überladen.</p></div>
              <span className={styles.availability}>Web-App</span>
            </article>
          </div>
        </section>

        <section className={styles.realtimeBand} id="echtzeit">
          <div className={styles.realtimeInner}>
            <div className={styles.realtimeIntro}>
              <span>Echtzeitlogik</span>
              <h2>Fahrplan bleibt Fahrplan. Echtzeit bleibt Echtzeit.</h2>
              <p>Eine geplante Zeit wird nicht als Live-Prognose ausgegeben. Statusfarben erscheinen nur dort, wo sie tatsächlich eine Abweichung kommunizieren.</p>
            </div>

            <div className={styles.statusList}>
              <div><span><i className={styles.greenDot}/>Früher</span><strong className={styles.early}>−3 Min.</strong><p>bestätigte frühere Abfahrt oder Ankunft</p></div>
              <div><span><i className={styles.neutralDot}/>Pünktlich</span><strong>±0 Min.</strong><p>neutraler Normalzustand</p></div>
              <div><span><i className={styles.amberDot}/>Verspätet</span><strong className={styles.amber}>+9 Min.</strong><p>erkennbare Abweichung vom Fahrplan</p></div>
              <div><span><i className={styles.redDot}/>Entfällt</span><strong className={styles.cancelled}>Ausfall</strong><p>Ausfall hat Priorität vor Nebendetails</p></div>
            </div>
          </div>
        </section>

        <section className={styles.dataSection} id="daten">
          <div className={styles.sectionIntro}>
            <span>Daten & Transparenz</span>
            <h2>Quellen, Rollen und Grenzen sind nachvollziehbar.</h2>
            <p>BahnConnections kombiniert externe Quellen und kennzeichnet Datenlücken. Fehlende Echtzeit wird nicht durch erfundene Prognosen ersetzt.</p>
          </div>

          <div className={styles.sourceTable}>
            <div className={styles.sourceHead}><span>Quelle</span><span>Einsatz</span><span>Rolle</span><span /></div>
            <div>
              <strong>Transitous / MOTIS</strong>
              <span>Haltestellen, Fahrten und Echtzeit</span>
              <b>Hauptquelle</b>
              <a href="https://transitous.org/sources/" target="_blank" rel="noreferrer">Quellen & Lizenzen <External /></a>
            </div>
            <div>
              <strong>transport.rest</strong>
              <span>zusätzliche Prüfung ausgewählter Fahrplandaten</span>
              <b>Gegenprüfung</b>
              <a href="https://transport.rest/" target="_blank" rel="noreferrer">Quelle <External /></a>
            </div>
            <div>
              <strong>OpenStreetMap</strong>
              <span>Karte und geografischer Kontext</span>
              <b>Kartenquelle</b>
              <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">Quelle <External /></a>
            </div>
          </div>

          <p className={styles.dataNote}>BahnConnections ist kein offizielles Angebot dieser Anbieter. Verbindliche betriebliche Informationen stammen weiterhin von den jeweiligen Verkehrsunternehmen.</p>
        </section>

        <section className={styles.dbSection} id="db">
          <div className={styles.dbHeader}>
            <div>
              <span>Kooperationsperspektive Deutsche Bahn</span>
              <h2>Ein mögliches Ziel — keine bestehende Partnerschaft.</h2>
            </div>
            <span className={styles.dbStatus}>Aktuell unabhängig</span>
          </div>

          <div className={styles.dbGrid}>
            <article>
              <span>Heute</span>
              <h3>Unabhängige Webanwendung</h3>
              <p>Eigene Oberfläche, externe Datenquellen und keine offizielle DB-Zugehörigkeit.</p>
            </article>
            <article>
              <span>Mögliche Kooperation</span>
              <h3>Offizielle technische Schnittstellen</h3>
              <p>Eine Vereinbarung könnte Datenrollen, Störungsinformationen und technische Übergaben verbindlicher machen.</p>
            </article>
            <article>
              <span>Nur bei Vereinbarung</span>
              <h3>Verknüpfte Servicewege</h3>
              <p>Beispielsweise klar gekennzeichnete Deep-Links zu offiziellen DB-Buchungs- oder Serviceangeboten.</p>
            </article>
          </div>

          <p className={styles.dbNote}><strong>Status:</strong> Es besteht derzeit keine offizielle Partnerschaft mit der Deutschen Bahn AG. BahnConnections verwendet deshalb keine DB-Logos als Partnerkennzeichnung und stellt keine Kooperation als bestehend dar.</p>
        </section>

        <section className={styles.browserSection}>
          <div className={styles.sectionIntro}>
            <span>Browser & Installation</span>
            <h2>Direkt im Browser. Optional als PWA.</h2>
            <p>Die gleiche Webanwendung funktioniert auf Desktop und Mobilgeräten und kann zusätzlich installiert werden.</p>
          </div>

          <div className={styles.browserFacts}>
            <div><strong>Desktop</strong><span>große Karte und Seitenpanel</span></div>
            <div><strong>Mobil</strong><span>kompakte Navigation und Bottom-Sheet</span></div>
            <div><strong>Android</strong><span>Google-Play-Veröffentlichung in Vorbereitung</span></div>
            <div><strong>Accessibility</strong><span>Tastaturnavigation, System-Dark-Mode und Reduced Motion</span></div>
          </div>
        </section>

        <section className={styles.faqSection} id="hilfe">
          <div className={styles.sectionIntro}>
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
              <p>Nein. Eine technische Zusammenarbeit ist eine mögliche Perspektive, derzeit aber nicht vereinbart.</p>
            </details>
            <details>
              <summary>Kann ich BahnConnections direkt im Browser nutzen?</summary>
              <p>Ja. Die Anwendung läuft im Browser und kann zusätzlich als Progressive Web App installiert werden.</p>
            </details>
            <details>
              <summary>Was passiert ohne Echtzeitdaten?</summary>
              <p>Dann bleibt die Information als Fahrplan gekennzeichnet. Fehlende Echtzeit wird nicht durch eine erfundene Prognose ersetzt.</p>
            </details>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div>
            <span>BahnConnections</span>
            <h2>Verbindung in der Web-App prüfen.</h2>
            <p>Öffentliche Kernfunktionen können ohne Konto genutzt werden.</p>
          </div>
          <div>
            <Link className={styles.primaryButton} href="/">Web-App öffnen <Arrow /></Link>
            <Link className={styles.secondaryButton} href="/install">Installieren</Link>
          </div>
        </section>
      </main>

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
            <a href="#db">DB-Perspektive</a>
            <a href="#hilfe">Hilfe</a>
            <Link href="/privacy">Datenschutz</Link>
            <Link href="/terms">Nutzung</Link>
            <Link href="/support">Support</Link>
            <a href="https://github.com/Cola968/BahnConnections" target="_blank" rel="noreferrer">GitHub <External /></a>
          </nav>
        </div>

        <div className={styles.footerMeta}>
          <span>Web-App {APP_VERSION_LABEL}</span>
          <span>Unabhängiges Projekt · keine offizielle Anwendung der Deutschen Bahn AG</span>
          <span>Fahrplan- und Echtzeitinformationen können kurzfristig abweichen.</span>
        </div>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </div>
  );
}
