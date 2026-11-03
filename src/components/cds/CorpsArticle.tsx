import type { ReactNode } from "react";
import { analyserCorps, avecSommaire, segmentsEnLigne, sommaire, type Bloc } from "@/lib/corps";

/** Texte d'un article (socle 1.12.0) : intertitres ancrés, sommaire, encadré, questions-réponses. */
export function CorpsArticle({ texte, className = "" }: { texte: string; className?: string }) {
  const blocs = analyserCorps(texte);
  const entrees = avecSommaire(blocs) ? sommaire(blocs) : [];
  return (
    <div className={`space-y-4 text-base leading-relaxed text-foreground ${className}`}>
      {entrees.length > 0 ? (
        <nav
          aria-labelledby="sommaire-titre"
          className="rounded-xl border border-border bg-card p-4 text-sm"
        >
          <p id="sommaire-titre" className="font-semibold text-foreground">
            Sommaire
          </p>
          <ol className="mt-2 space-y-1 rounded-md border border-border p-3">
            {entrees.map((e) => (
              <li key={e.ancre} className={e.niveau === 3 ? "pl-4" : ""}>
                <a href={`#${e.ancre}`} className="text-primary-text hover:underline">
                  {e.texte}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      {blocs.map((b, i) => (
        <BlocArticle key={i} bloc={b} />
      ))}
    </div>
  );
}

function BlocArticle({ bloc }: { bloc: Bloc }) {
  switch (bloc.type) {
    case "h2":
      return (
        <h2 id={bloc.ancre} className="scroll-mt-24 pt-4 text-2xl font-semibold text-foreground">
          {enLigne(bloc.texte)}
        </h2>
      );
    case "h3":
      return (
        <h3 id={bloc.ancre} className="scroll-mt-24 pt-2 text-xl font-semibold text-foreground">
          {enLigne(bloc.texte)}
        </h3>
      );
    case "p":
      return <p>{enLigne(bloc.texte)}</p>;
    case "citation":
      return (
        <blockquote className="border-l-4 border-primary pl-4 italic">
          {enLigne(bloc.texte)}
        </blockquote>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-3 text-xs">
          <code>{bloc.texte}</code>
        </pre>
      );
    case "ul":
    case "ol": {
      const Liste = bloc.type;
      return (
        <Liste
          className={`${bloc.type === "ul" ? "list-disc" : "list-decimal"} space-y-1 rounded-md border border-border py-3 pl-8 pr-3`}
        >
          {bloc.items.map((item, j) => (
            <li key={j}>{enLigne(item)}</li>
          ))}
        </Liste>
      );
    }
    case "retenir":
      return (
        <aside
          aria-label="À retenir"
          className="rounded-xl border border-info-border bg-info-soft p-4 text-info-text"
        >
          <p className="font-semibold">À retenir</p>
          {bloc.lignes.map((l, j) => (
            <p key={j} className="mt-1">
              {enLigne(l.replace(/^[-*]\s+/, ""))}
            </p>
          ))}
        </aside>
      );
    case "faq":
      return (
        <section aria-label="Questions fréquentes" className="space-y-3">
          {bloc.questions.map((q, j) => (
            <details key={j} className="rounded-xl border border-border bg-card p-4">
              <summary className="cursor-pointer font-semibold text-foreground">
                {enLigne(q.question)}
              </summary>
              <p className="mt-2">{enLigne(q.reponse)}</p>
            </details>
          ))}
        </section>
      );
  }
}

function enLigne(texte: string): ReactNode[] {
  return segmentsEnLigne(texte).map((s, i) => {
    switch (s.type) {
      case "gras":
        return <strong key={i}>{s.texte}</strong>;
      case "italique":
        return <em key={i}>{s.texte}</em>;
      case "code":
        return (
          <code key={i} className="rounded bg-muted px-1 text-sm">
            {s.texte}
          </code>
        );
      case "lien":
        return (
          <a
            key={i}
            href={s.href}
            className="font-medium text-primary-text underline underline-offset-2"
            {...(s.externe ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {s.texte}
          </a>
        );
      default:
        return <span key={i}>{s.texte}</span>;
    }
  });
}
