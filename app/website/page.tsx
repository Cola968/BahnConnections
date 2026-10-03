import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./website.module.css";

export const metadata: Metadata = {
  title: "BahnConnections – Bahnreisen. Klarer.",
  description: "BahnConnections verbindet Reiseplanung, Live-Abfahrten und Zugstatus in einer klaren Oberfläche – mit transparenten Daten statt erfundenen Verbindungen.",
  openGraph: {
    title: "BahnConnections – Bahnreisen. Klarer.",
    description: "Planen, Live-Status prüfen und Abfahrten verstehen – in einer ruhigen Oberfläche.",
    images: ["/og.png"],
  },
};

const Arrow = () => <span aria-hidden="true">↗</span>;

export default function WebsitePage() {
  return (
    <main className={styles.site} data-website="bahnconnections">
      <header className={styles.header}>
        <Link className={styles.brand} href="/website" aria-label="BahnConnections Website">
          <Image src="/app-icon.svg" alt="" width={34} height={34} priority />
          <span>BahnConnections</span>
        </Link>
        <nav className={styles.nav} aria-label="Website Navigation">
          <a href="#produkt">Produkt</a>
          <a href="#live">Live</a>
          <a href="#ausblick">Ausblick</a>
          <a href="#faq">FAQ</a>
        </nav>
        <Link className={styles.headerCta} href="/">App öffnen <Arrow /></Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><i /> Für Bahnreisen in Deutschland</span>
          <h1>Bahnreisen,<br /><em>endlich klar.</em></h1>
          <p className={styles.heroLead}>Planen, prüfen, losfahren. BahnConnections bringt Verbindungssuche, Live-Abfahrten und Zugstatus in eine ruhige Oberfläche, die nur zeigt, was du gerade brauchst.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/">BahnConnections öffnen <Arrow /></Link>
            <Link className={styles.secondaryCta} href="/install">Als App installieren</Link>
          </div>
          <div className={styles.trustRow}>
            <span><i className={styles.liveDot} /> Live-Daten, wenn verfügbar</span>
            <span>Keine erfundenen Verbindungen</span>
            <span>Klare Soll-/Ist-Zeiten</span>
          </div>
        </div>

        <div className={styles.heroProduct} aria-label="Beispielansicht von BahnConnections">
          <div className={styles.productChrome}>
            <span className={styles.fakeDot} />
            <span className={styles.fakeDot} />
            <span className={styles.fakeDot} />
            <strong>Beispielansicht</strong>
          </div>
          <div className={styles.productBody}>
            <div className={styles.routeCard}>
              <div className={styles.routeTop}>
                <span>Berlin Hbf</span><b>→</b><span>Hamburg Hbf</span>
              </div>
              <div className={styles.routeTime}><strong>18:02</strong><span>1 h 51 min</span><strong>19:53</strong></div>
              <div className={styles.routeMeta}>
                <span className={styles.iceBadge}>ICE</span>
                <span>Direkt</span>
                <span className={styles.good}>pünktlich</span>
              </div>
            </div>
            <div className={styles.boardPreview}>
              <div><span className={styles.trainBadge}>ICE</span><b>München Hbf</b><strong>16:41</strong></div>
              <small>1205</small><span className={styles.early}>3 Min. früher</span>
              <div><span className={styles.regioBadge}>RE</span><b>Leipzig Hbf</b><strong>16:52</strong></div>
              <small>3151</small><span>Gleis 7</span>
              <div><span className={styles.trainBadge}>ICE</span><b>Frankfurt (Main) Hbf</b><strong className={styles.cancel}>Entfällt</strong></div>
              <small>279</small><span className={styles.cancel}>Fahrt fällt aus</span>
            </div>
            <div className={styles.mapStrip} aria-hidden="true">
              <span className={styles.cityA} />
              <span className={styles.cityB} />
              <span className={styles.cityC} />
              <i />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.statement} id="produkt">
        <span>Ein Produkt. Drei Kernaufgaben.</span>
        <h2>Weniger suchen.<br />Mehr verstehen.</h2>
        <p>Die Website erklärt das Produkt. Die App erledigt die Reise. Keine überladene Funktionsliste, sondern ein klarer Weg von der Planung bis zur Abfahrt.</p>
      </section>

      <section className={styles.featureGrid}>
        <article className={styles.featureCard}>
          <div className={styles.featureNumber}>01</div>
          <h3>Verbindungen planen</h3>
          <p>Start, Ziel, Zeit. Danach nur noch die Informationen, die für die konkrete Reise zählen.</p>
          <div className={styles.miniPlanner} aria-hidden="true">
            <span><small>Von</small><b>Berlin Hbf</b></span>
            <span><small>Nach</small><b>Hamburg Hbf</b></span>
            <button tabIndex={-1}>Verbindungen anzeigen</button>
          </div>
        </article>

        <article className={styles.featureCard}>
          <div className={styles.featureNumber}>02</div>
          <h3>Abfahrten verstehen</h3>
          <p>Sollzeit, Istzeit, Gleis und Ausfall werden visuell getrennt. Frühere Fahrten sind grün, Störungen klar rot.</p>
          <div className={styles.statusDemo} aria-hidden="true">
            <div><span>16:44</span><del>16:44</del><b className={styles.early}>16:41</b></div>
            <small className={styles.early}>3 Min. früher</small>
          </div>
        </article>

        <article className={styles.featureCard}>
          <div className={styles.featureNumber}>03</div>
          <h3>Auf der Karte bleiben</h3>
          <p>Bahnhöfe, Zugverläufe und Live-Lage ergänzen die Reise, ohne die eigentliche Aufgabe zu überdecken.</p>
          <div className={styles.abstractMap} aria-hidden="true">
            <i /><i /><i /><i /><i />
            <span />
          </div>
        </article>
      </section>

      <section className={styles.liveSection} id="live">
        <div className={styles.liveIntro}>
          <span className={styles.eyebrow}><i className={styles.liveDot} /> Echtzeit mit Kontext</span>
          <h2>Live heißt bei uns<br />nicht automatisch genau.</h2>
          <p>BahnConnections unterscheidet sichtbar zwischen Fahrplan und bestätigter Echtzeit. Wenn eine Quelle keine Live-Daten liefert, wird daraus keine scheinbare Präzision.</p>
          <Link href="/">Live-Abfahrten öffnen <Arrow /></Link>
        </div>
        <div className={styles.statusStack}>
          <article><span className={styles.statusIconGreen}>✓</span><div><b>Früher</b><p>Bestätigte frühere Abfahrt oder Ankunft.</p></div><strong className={styles.early}>−3 Min.</strong></article>
          <article><span className={styles.statusIconNeutral}>•</span><div><b>Pünktlich</b><p>Ruhig dargestellt, ohne unnötige Signalfarbe.</p></div><strong>±0 Min.</strong></article>
          <article><span className={styles.statusIconAmber}>!</span><div><b>Verspätet</b><p>Abweichungen werden deutlich hervorgehoben.</p></div><strong className={styles.late}>+9 Min.</strong></article>
          <article><span className={styles.statusIconRed}>×</span><div><b>Entfällt</b><p>Ausfälle stehen klar über sekundären Informationen.</p></div><strong className={styles.cancel}>Ausfall</strong></article>
        </div>
      </section>

      <section className={styles.principles}>
        <div>
          <span>Designprinzip</span>
          <h2>Die Oberfläche soll verschwinden, sobald du weißt, was zu tun ist.</h2>
        </div>
        <div className={styles.principleList}>
          <article><b>01</b><span><strong>Hierarchie vor Dichte</strong><small>Wichtige Informationen zuerst. Technische Details nur bei Bedarf.</small></span></article>
          <article><b>02</b><span><strong>Echtzeit vor Effekten</strong><small>Statusfarben haben eine Bedeutung und werden nicht dekorativ verwendet.</small></span></article>
          <article><b>03</b><span><strong>Transparenz vor Behauptung</strong><small>Quellen, Grenzen und fehlende Daten bleiben nachvollziehbar.</small></span></article>
        </div>
      </section>

      <section className={styles.future} id="ausblick">
        <div className={styles.futureHead}>
          <span>In Planung</span>
          <h2>Die Reise endet nicht am Gleis.</h2>
          <p>Die nächsten Website-Module werden separat vom Kern der App entwickelt und erst veröffentlicht, wenn sie echten Nutzen bringen.</p>
        </div>
        <div className={styles.futureGrid}>
          <article><span>Passport</span><h3>Deine Reisen an einem Ort.</h3><p>Gefahrene Strecken, Städte und Züge als persönlicher Reiseverlauf.</p><small>Konzept</small></article>
          <article><span>Insights</span><h3>Verstehen, wie du reist.</h3><p>Persönliche Statistiken, wiederkehrende Strecken und Monatsrückblicke.</p><small>Konzept</small></article>
          <article><span>Assist</span><h3>Hilfe, wenn etwas schiefläuft.</h3><p>Störungen verständlich zusammenfassen und sinnvolle nächste Schritte zeigen.</p><small>Konzept</small></article>
        </div>
      </section>

      <section className={styles.faq} id="faq">
        <div>
          <span>FAQ</span>
          <h2>Kurz beantwortet.</h2>
        </div>
        <div className={styles.faqList}>
          <details><summary>Ist BahnConnections eine neue Bahn-App?</summary><p>BahnConnections ist eine eigenständige Fahrgastoberfläche für Verbindungssuche, Live-Abfahrten und Kartenansichten. Die Website hier erklärt das Produkt; die eigentliche Reiseplanung findet in der App statt.</p></details>
          <details><summary>Woher kommen die Fahrplan- und Echtzeitdaten?</summary><p>Die App nutzt unter anderem Transitous/MOTIS und kennzeichnet, ob Informationen als Fahrplan oder als Echtzeit vorliegen. Quellen und Methodik sind in der App transparent dokumentiert.</p></details>
          <details><summary>Ersetzt BahnConnections die Angebote der Verkehrsunternehmen?</summary><p>Nein. BahnConnections bündelt und visualisiert Informationen für die Reise. Verbindliche betriebliche Hinweise und Beförderungsbedingungen kommen weiterhin von den jeweiligen Verkehrsunternehmen.</p></details>
          <details><summary>Kostet die App etwas?</summary><p>Die Kernfunktionen für Verbindungssuche und Live-Tafeln sind als frei zugängliche Produktbasis vorgesehen. Zusätzliche Funktionen können später separat hinzukommen.</p></details>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <span className={styles.eyebrow}><i /> BahnConnections</span>
          <h2>Deine nächste Verbindung.<br />Ohne Umwege in der Oberfläche.</h2>
        </div>
        <div className={styles.finalActions}>
          <Link className={styles.primaryCta} href="/">App öffnen <Arrow /></Link>
          <Link className={styles.secondaryCta} href="/install">Installieren</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.footerBrand} href="/website"><Image src="/app-icon.svg" alt="" width={30} height={30} /><b>BahnConnections</b></Link>
        <div><Link href="/">App</Link><Link href="/install">Installation</Link><a href="#faq">FAQ</a></div>
        <p>Fahrplan- und Echtzeitinformationen können kurzfristig abweichen.</p>
      </footer>
    </main>
  );
}
