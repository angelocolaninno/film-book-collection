import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { collectionRepository } from "./repository";
import { prepareArtwork } from "./artwork";
import { getBookDetails, getFilmCredits, searchMedia } from "./metadata";
import type { CollectionItem, MediaKind, SearchResult } from "./types";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const formatDate = (date: string) =>
  date
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T00:00:00Z`))
    : "";
const empty = (kind: MediaKind): CollectionItem => ({
  id: crypto.randomUUID(),
  kind,
  title: "",
  activityDate: today(),
  notes: "",
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
  context: "At home",
  format: "Physical",
});

function App() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | MediaKind>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CollectionItem | null>(null);
  const [editor, setEditor] = useState<CollectionItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addingKind, setAddingKind] = useState<MediaKind | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [step, setStep] = useState<"choose" | "search" | "entry">("choose");
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const searchRun = useRef(0);
  const collectionSearchInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const artworkInput = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      setItems(await collectionRepository.getAll());
    } catch {
      setError("Your collection could not be opened. Try reloading the app.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (step === "search") searchInput.current?.focus();
  }, [step, addingKind]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        collectionSearchInput.current?.focus();
      }
      if (event.key === "Escape") {
        if (settingsOpen) setSettingsOpen(false);
        else if (addOpen || editor) closeAdd();
        else if (selected) setSelected(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsOpen, addOpen, editor, selected]);

  const visible = useMemo(
    () =>
      items
        .filter((item) => filter === "all" || item.kind === filter)
        .filter(
          (item) =>
            !query.trim() ||
            [
              item.title,
              item.originalTitle,
              item.director,
              item.cinematographer,
              item.publisher,
              ...(item.authors ?? []),
              ...(item.cast ?? []),
            ].some((value) =>
              value?.toLowerCase().includes(query.toLowerCase()),
            ),
        )
        .sort((a, b) => b.activityDate.localeCompare(a.activityDate)),
    [items, filter, query],
  );

  const closeAdd = () => {
    searchRun.current += 1;
    setSearching(false);
    setAddOpen(false);
    setAddingKind(null);
    setStep("choose");
    setEditor(null);
    setResults([]);
    setSearchQuery("");
    setSearchedQuery("");
    setError("");
  };
  const beginAdd = () => {
    searchRun.current += 1;
    setSearching(false);
    setAddOpen(true);
    setAddingKind(null);
    setStep("choose");
    setEditor(null);
    setResults([]);
    setSearchQuery("");
    setSearchedQuery("");
    setError("");
  };
  const chooseKind = (kind: MediaKind) => {
    searchRun.current += 1;
    setSearching(false);
    setSearchQuery("");
    setSearchedQuery("");
    setResults([]);
    setError("");
    setAddingKind(kind);
    setStep("search");
  };
  const startManualEntry = () => {
    if (!addingKind) return;
    setError("");
    setEditor(empty(addingKind));
    setStep("entry");
  };
  const runSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!addingKind || searchQuery.trim().length < 2) return;
    const requestId = ++searchRun.current;
    const term = searchQuery.trim();
    setSearchedQuery(term);
    setSearching(true);
    setError("");
    setResults([]);
    try {
      const matches = await searchMedia(addingKind, term);
      if (requestId === searchRun.current) setResults(matches);
    } catch {
      if (requestId === searchRun.current)
        setError("Search isn’t available right now.");
    } finally {
      if (requestId === searchRun.current) setSearching(false);
    }
  };
  const chooseResult = async (result: SearchResult) => {
    if (!addingKind) return;
    const item: CollectionItem = {
      ...empty(addingKind),
      title: result.title,
      originalTitle: addingKind === "film" ? result.subtitle : undefined,
      subtitle: addingKind === "book" ? result.subtitle : undefined,
      authors: result.authors,
      year: result.year,
      image: result.image,
      externalId: result.id,
    };
    setEditor(item);
    setStep("entry");
    setError("");
    try {
      const details =
        addingKind === "film"
          ? await getFilmCredits(result.id)
          : await getBookDetails(result.id);
      setEditor((current) =>
        current?.id === item.id ? { ...current, ...details } : current,
      );
    } catch {
      /* Search metadata remains useful if detail credits are unavailable. */
    }
  };
  const saveItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor || !editor.title.trim()) return;
    try {
      const saved = {
        ...editor,
        title: editor.title.trim(),
        modifiedAt: new Date().toISOString(),
      };
      await collectionRepository.save(saved);
      setItems((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      setSelected(null);
      setEditor(null);
      closeAdd();
      setToast("Saved to your collection");
    } catch {
      setError(
        "Could not save this entry. Check the available space on your device.",
      );
    }
  };
  const editItem = (item: CollectionItem) => {
    setSelected(null);
    setAddOpen(false);
    setAddingKind(null);
    setEditor({ ...item });
    setStep("entry");
  };
  const removeItem = async (item: CollectionItem) => {
    if (!window.confirm(`Remove “${item.title}” from your collection?`)) return;
    try {
      await collectionRepository.remove(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setSelected(null);
      setToast("Removed from your collection");
    } catch {
      setToast("Could not remove this entry");
    }
  };
  const updateEditor = (field: keyof CollectionItem, value: string) =>
    setEditor((current) =>
      current ? { ...current, [field]: value } : current,
    );
  const uploadArtwork = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const itemId = editor?.id;
    if (!file || !itemId) return;
    setImageBusy(true);
    setError("");
    try {
      const image = await prepareArtwork(file);
      setEditor((current) =>
        current?.id === itemId ? { ...current, image } : current,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This image could not be added. Try another file.",
      );
    } finally {
      input.value = "";
      setImageBusy(false);
    }
  };

  const exportData = async () => {
    try {
      const data = await collectionRepository.getAll();
      const blob = new Blob(
        [
          JSON.stringify(
            {
              format: "still-collection",
              version: 1,
              exportedAt: new Date().toISOString(),
              items: data,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `still-collection-${today()}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast("Backup downloaded");
    } catch {
      setToast("Could not export your collection");
    }
  };
  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      const candidate = Array.isArray(backup) ? backup : backup?.items;
      const isBackup =
        Array.isArray(backup) ||
        (backup?.format === "still-collection" && backup?.version === 1);
      if (
        !isBackup ||
        !Array.isArray(candidate) ||
        !candidate.every(isCollectionItem) ||
        new Set(candidate.map((item) => item.id)).size !== candidate.length
      )
        throw new Error("That file is not a valid Still collection backup.");
      const merge =
        items.length > 0 &&
        window.confirm(
          `Add ${candidate.length} entries to your ${items.length} existing entries? Choose Cancel to replace your collection.`,
        );
      if (
        items.length > 0 &&
        !merge &&
        !window.confirm(
          "Replace your current collection with this backup? This cannot be undone.",
        )
      )
        return;
      const incoming = candidate as CollectionItem[];
      const combined = merge
        ? [
            ...items.filter(
              (item) => !incoming.some((other) => other.id === item.id),
            ),
            ...incoming,
          ]
        : incoming;
      await collectionRepository.replaceAll(combined);
      setItems(combined);
      setSettingsOpen(false);
      setToast(
        `Imported ${incoming.length} ${incoming.length === 1 ? "entry" : "entries"}`,
      );
    } catch (cause) {
      setToast(
        cause instanceof Error
          ? cause.message
          : "This backup could not be opened.",
      );
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Still, my collection">
          <span className="brand-mark">s</span>
          <span>
            still<span className="brand-period">.</span>
          </span>
        </a>
        <div className="top-actions">
          <button
            className="icon-button settings-trigger"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <SettingsIcon />
          </button>
          <button className="button button-dark add-top" onClick={beginAdd}>
            <span aria-hidden="true">＋</span> Add
          </button>
        </div>
      </header>
      <main id="top" className="main-content">
        <section className="intro">
          <div className="intro-copy">
            <p className="eyebrow">A PERSONAL ARCHIVE</p>
            <h1>
              Things that
              <br className="mobile-break" /> stayed with me
              <span className="title-period">.</span>
            </h1>
            <p className="intro-subtitle">
              Films watched, books read, moments remembered.
            </p>
          </div>
          <div className="intro-count">
            <span>{items.length.toString().padStart(2, "0")}</span>
            <small>
              {items.length === 1 ? "memory collected" : "memories collected"}
            </small>
          </div>
        </section>
        <section className="collection-section" aria-label="My collection">
          <div className="collection-toolbar">
            <div
              className="filters"
              role="tablist"
              aria-label="Filter collection"
            >
              {(["all", "film", "book"] as const).map((value) => (
                <button
                  role="tab"
                  aria-selected={filter === value}
                  className={`filter ${filter === value ? "active" : ""}`}
                  key={value}
                  onClick={() => setFilter(value)}
                >
                  {value === "all"
                    ? "All"
                    : value === "film"
                      ? "Films"
                      : "Books"}
                  <span>
                    {value === "all"
                      ? items.length
                      : items.filter((item) => item.kind === value).length}
                  </span>
                </button>
              ))}
            </div>
            <label className="collection-search">
              <SearchIcon />
              <input
                ref={collectionSearchInput}
                aria-label="Search your collection"
                placeholder="Find a memory"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>
          </div>
          {error && !addOpen && !editor && !loading && (
            <div className="storage-alert" role="alert">
              <span>{error}</span>
              <button
                onClick={() => {
                  setError("");
                  setLoading(true);
                  void refresh();
                }}
              >
                Try again
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading-state">
              <span className="loader" />
              Gathering your collection…
            </div>
          ) : visible.length === 0 ? (
            <div className="empty-state">
              <div className="empty-art" aria-hidden="true">
                <span>✳</span>
                <span>◌</span>
                <span>✳</span>
              </div>
              <p className="eyebrow">A LITTLE SPACE FOR WHAT MATTERS</p>
              <h2>
                {query
                  ? "Nothing found just yet."
                  : items.length
                    ? "Nothing in this view."
                    : "Your collection starts here."}
              </h2>
              <p>
                {query
                  ? "Try another title, name, or search."
                  : items.length
                    ? "Try a different filter, or add something new."
                    : "The films you watch and books you read will find a home here."}
              </p>
              <button className="button button-dark" onClick={beginAdd}>
                Add your first memory <span>↗</span>
              </button>
            </div>
          ) : (
            <div className="gallery-grid">
              {visible.map((item, index) => (
                <button
                  key={item.id}
                  className="gallery-card"
                  onClick={() => setSelected(item)}
                  style={{ animationDelay: `${Math.min(index * 35, 280)}ms` }}
                  aria-label={`Open ${item.kind}: ${item.title}`}
                >
                  <span
                    className={`artwork ${item.kind === "book" ? "book-art" : "film-art"}`}
                  >
                    <Artwork
                      kind={item.kind}
                      title={item.title}
                      image={item.image}
                      alt={`${item.kind === "film" ? "Film poster" : "Book cover"} for ${item.title}`}
                    />
                  </span>
                  <span className="card-copy">
                    <span className="card-title">{item.title}</span>
                    <span className="card-meta">
                      {item.kind === "film" ? "Film" : "Book"}
                      <i>·</i>
                      {item.year ??
                        item.director ??
                        item.authors?.[0] ??
                        "A memory"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
        <footer className="page-footer">
          <span>Made for the things that stay.</span>
          <span>
            Just for you <span className="footer-spark">✳</span>
          </span>
        </footer>
      </main>

      {selected && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <article
            className="detail-panel"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
          >
            <button
              className="close-button"
              onClick={() => setSelected(null)}
              aria-label="Close details"
            >
              ×
            </button>
            <div className="detail-scroll">
              <div className="detail-heading">
                <p className="eyebrow">
                  {selected.kind === "film"
                    ? "A FILM I WATCHED"
                    : "A BOOK I READ"}
                </p>
                <h2>{selected.title}</h2>
                {selected.subtitle && (
                  <p className="detail-subtitle">{selected.subtitle}</p>
                )}
                <p className="detail-byline">
                  {selected.kind === "film"
                    ? selected.director
                    : selected.authors?.join(", ")}
                  {selected.kind === "film" &&
                  selected.director &&
                  selected.year
                    ? " · "
                    : ""}
                  {selected.year}
                </p>
              </div>
              <div className={`detail-artwork ${selected.kind}`}>
                <Artwork
                  kind={selected.kind}
                  title={selected.title}
                  image={selected.image}
                  alt={`${selected.kind === "film" ? "Poster" : "Cover"} for ${selected.title}`}
                />
              </div>
              <div className="remembered">
                <p className="eyebrow">
                  {selected.kind === "film" ? "WATCHED" : "READ"}
                </p>
                <p>
                  {formatDate(selected.activityDate)}
                  {selected.kind === "film" && selected.context
                    ? ` · ${selected.context}`
                    : selected.format
                      ? ` · ${selected.format}`
                      : ""}
                </p>
              </div>
              {selected.notes && (
                <div className="notes-block">
                  <p className="eyebrow">MY NOTES</p>
                  <p className="notes-text">{selected.notes}</p>
                </div>
              )}
              <div className="facts-block">
                <p className="eyebrow">
                  {selected.kind === "film" ? "FILM" : "BOOK"}
                </p>
                {selected.kind === "film" ? (
                  <>
                    <Fact label="Director" value={selected.director} />
                    <Fact
                      label="Cinematography"
                      value={selected.cinematographer}
                    />
                    <Fact label="Cast" value={selected.cast?.join(" · ")} />
                  </>
                ) : (
                  <>
                    <Fact label="Author" value={selected.authors?.join(", ")} />
                    <Fact label="Published" value={selected.year} />
                    <Fact label="Publisher" value={selected.publisher} />
                  </>
                )}
              </div>
              <div className="detail-actions">
                <button
                  className="button button-dark"
                  onClick={() => editItem(selected)}
                >
                  Edit this memory
                </button>
                <button
                  className="text-button danger"
                  onClick={() => void removeItem(selected)}
                >
                  Remove from collection
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      {(addOpen || editor) && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAdd();
          }}
        >
          <section
            className={`modal ${step === "entry" ? "modal-entry" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="close-button"
              onClick={closeAdd}
              aria-label="Close"
            >
              ×
            </button>
            {step === "choose" && !editor && addingKind === null && (
              <>
                <p className="eyebrow">ADD TO YOUR ARCHIVE</p>
                <h2 id="modal-title">What stayed with you?</h2>
                <p className="modal-lede">Choose a place to begin.</p>
                <div className="kind-choices">
                  <button
                    className="kind-choice"
                    onClick={() => chooseKind("film")}
                  >
                    <span className="choice-icon">▣</span>
                    <span>
                      <strong>A film</strong>
                      <small>Something you watched</small>
                    </span>
                    <b>↗</b>
                  </button>
                  <button
                    className="kind-choice"
                    onClick={() => chooseKind("book")}
                  >
                    <span className="choice-icon book-icon">▤</span>
                    <span>
                      <strong>A book</strong>
                      <small>Something you read</small>
                    </span>
                    <b>↗</b>
                  </button>
                </div>
              </>
            )}
            {step === "search" && addingKind && (
              <>
                <button
                  className="back-link"
                  onClick={() => {
                    searchRun.current += 1;
                    setSearching(false);
                    setSearchQuery("");
                    setSearchedQuery("");
                    setResults([]);
                    setStep("choose");
                    setAddingKind(null);
                    setError("");
                  }}
                >
                  ← Back
                </button>
                <p className="eyebrow">
                  A NEW {addingKind === "film" ? "FILM" : "BOOK"}
                </p>
                <h2 id="modal-title">
                  {addingKind === "film"
                    ? "What did you watch?"
                    : "What did you read?"}
                </h2>
                <p className="modal-lede">
                  Search by title, or add the details yourself.
                </p>
                <form className="metadata-search" onSubmit={runSearch}>
                  <SearchIcon />
                  <input
                    ref={searchInput}
                    placeholder={
                      addingKind === "film"
                        ? "Search for a film…"
                        : "Search for a book…"
                    }
                    value={searchQuery}
                    onChange={(event) => {
                      searchRun.current += 1;
                      setSearching(false);
                      setSearchQuery(event.target.value);
                      setSearchedQuery("");
                      setResults([]);
                      setError("");
                    }}
                  />
                  <button
                    className="button button-dark"
                    disabled={searching || searchQuery.trim().length < 2}
                  >
                    {searching ? "Searching…" : "Search"}
                  </button>
                </form>
                {error && (
                  <p className="inline-error" role="alert">
                    {error} You can still add it manually.
                  </p>
                )}
                {results.length > 0 && (
                  <div className="search-results" aria-label="Search results">
                    {results.map((result) => (
                      <button
                        className="result-row"
                        key={result.id}
                        onClick={() => void chooseResult(result)}
                      >
                        <span className="result-art">
                          <Artwork
                            kind={addingKind}
                            title={result.title}
                            image={result.image}
                            alt=""
                          />
                        </span>
                        <span className="result-copy">
                          <strong>{result.title}</strong>
                          <small>
                            {addingKind === "book"
                              ? result.authors?.join(", ")
                              : result.subtitle}
                            {(result.authors?.length || result.subtitle) &&
                            result.year
                              ? " · "
                              : ""}
                            {result.year}
                          </small>
                        </span>
                        <span className="result-arrow">↗</span>
                      </button>
                    ))}
                  </div>
                )}
                {!searching &&
                  searchQuery.trim().length > 1 &&
                  searchedQuery === searchQuery.trim() &&
                  !error &&
                  results.length === 0 && (
                    <div className="no-results">
                      <p>No matches found.</p>
                      <small>Try another title or add it manually.</small>
                    </div>
                  )}
                <button
                  className="text-button manual-entry-button"
                  onClick={startManualEntry}
                >
                  Add details manually <span aria-hidden="true">↗</span>
                </button>
              </>
            )}
            {step === "entry" && editor && (
              <>
                <button
                  className="back-link"
                  onClick={() => {
                    setEditor(null);
                    if (addingKind) setStep("search");
                    else closeAdd();
                  }}
                >
                  ← Back
                </button>
                <p className="eyebrow">MAKE IT YOURS</p>
                <h2 id="modal-title">
                  {addingKind ? "A memory, kept." : editor.title}
                </h2>
                <p className="modal-lede">Add the details you want to remember.</p>
                <form className="entry-form" onSubmit={saveItem}>
                  <label className="field-label">
                    Title
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder={editor.kind === "film" ? "Film title" : "Book title"}
                      value={editor.title}
                      onChange={(event) => updateEditor("title", event.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    {editor.kind === "film" ? "Director" : "Author(s)"}
                    <input
                      type="text"
                      placeholder="Optional"
                      value={editor.kind === "film" ? editor.director ?? "" : editor.authors?.join(", ") ?? ""}
                      onChange={(event) =>
                        editor.kind === "film"
                          ? updateEditor("director", event.target.value)
                          : setEditor((current) => current ? { ...current, authors: event.target.value.split(",").map((author) => author.trim()).filter(Boolean) } : current)
                      }
                    />
                  </label>
                  {editor.kind === "film" && (
                    <label className="field-label">
                      Original title <span className="optional">optional</span>
                      <input
                        type="text"
                        value={editor.originalTitle ?? ""}
                        onChange={(event) =>
                          updateEditor("originalTitle", event.target.value)
                        }
                      />
                    </label>
                  )}
                  {editor.kind === "book" && (
                    <label className="field-label">
                      Subtitle <span className="optional">optional</span>
                      <input type="text" value={editor.subtitle ?? ""} onChange={(event) => updateEditor("subtitle", event.target.value)} />
                    </label>
                  )}
                  <label className="field-label">
                    {editor.kind === "film" ? "Release year" : "Publication year"}
                    <input type="text" inputMode="numeric" maxLength={4} placeholder="Optional" value={editor.year ?? ""} onChange={(event) => updateEditor("year", event.target.value)} />
                  </label>
                  {editor.kind === "film" ? (
                    <label className="field-label">
                      Cinematography <span className="optional">optional</span>
                      <input type="text" value={editor.cinematographer ?? ""} onChange={(event) => updateEditor("cinematographer", event.target.value)} />
                    </label>
                  ) : (
                    <label className="field-label">
                      Publisher <span className="optional">optional</span>
                      <input type="text" value={editor.publisher ?? ""} onChange={(event) => updateEditor("publisher", event.target.value)} />
                    </label>
                  )}
                  {editor.kind === "film" && (
                    <label className="field-label">
                      Cast <span className="optional">optional, separate names with commas</span>
                      <input
                        type="text"
                        value={editor.cast?.join(", ") ?? ""}
                        onChange={(event) =>
                          setEditor((current) => current ? {
                            ...current,
                            cast: event.target.value.split(",").map((name) => name.trim()).filter(Boolean),
                          } : current)
                        }
                      />
                    </label>
                  )}
                  <div className="artwork-upload-field">
                    <span className="field-label-title">
                      Cover or poster <span className="optional">optional</span>
                    </span>
                    <div className="artwork-upload-row">
                      {editor.image && (
                        <div className={`artwork-preview ${editor.kind}`}>
                          <Artwork
                            kind={editor.kind}
                            title={editor.title || "Artwork preview"}
                            image={editor.image}
                            alt={`Preview of the ${editor.kind === "film" ? "poster" : "cover"} for ${editor.title || "this entry"}`}
                          />
                        </div>
                      )}
                      <div className="artwork-upload-controls">
                        <input
                          ref={artworkInput}
                          id="artwork-file"
                          className="artwork-file-input"
                          type="file"
                          accept="image/*"
                          aria-label={`Upload ${editor.kind === "film" ? "a film poster" : "a book cover"}`}
                          onChange={(event) => void uploadArtwork(event)}
                        />
                        <label
                          className="artwork-file-button"
                          htmlFor="artwork-file"
                        >
                          {imageBusy
                            ? "Preparing image…"
                            : editor.image
                              ? "Replace image"
                              : "Choose an image"}
                        </label>
                        <small>
                          JPEG, PNG, WebP · up to 15 MB. Images are resized before saving.
                        </small>
                        {editor.image && (
                          <button
                            type="button"
                            className="text-button artwork-remove-button"
                            onClick={() => updateEditor("image", "")}
                          >
                            Remove image
                          </button>
                        )}
                      </div>
                    </div>
                    <label className="field-label artwork-url-field">
                      Or use an image URL
                      <input
                        type="url"
                        placeholder="https://…"
                        value={editor.image?.startsWith("data:image/") ? "" : editor.image ?? ""}
                        onChange={(event) => updateEditor("image", event.target.value)}
                      />
                    </label>
                  </div>
                  <label className="field-label">
                    {editor.kind === "film" ? "Date watched" : "Date finished"}
                    <input
                      type="date"
                      required
                      value={editor.activityDate}
                      onChange={(event) =>
                        updateEditor("activityDate", event.target.value)
                      }
                    />
                  </label>
                  {editor.kind === "film" ? (
                    <label className="field-label">
                      Where did you watch it?
                      <select
                        value={editor.context ?? "At home"}
                        onChange={(event) =>
                          updateEditor("context", event.target.value)
                        }
                      >
                        <option>Cinema</option>
                        <option>At home</option>
                        <option>Other</option>
                      </select>
                    </label>
                  ) : (
                    <label className="field-label">
                      Format <span className="optional">optional</span>
                      <select
                        value={editor.format ?? "Physical"}
                        onChange={(event) =>
                          updateEditor("format", event.target.value)
                        }
                      >
                        <option>Physical</option>
                        <option>Ebook</option>
                        <option>Audiobook</option>
                      </select>
                    </label>
                  )}
                  <label className="field-label">
                    A note to yourself{" "}
                    <span className="optional">optional</span>
                    <textarea
                      placeholder="What stayed with you?"
                      rows={5}
                      value={editor.notes}
                      onChange={(event) =>
                        updateEditor("notes", event.target.value)
                      }
                    />
                  </label>
                  {error && (
                    <p className="inline-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    className="button button-dark save-button"
                    disabled={imageBusy}
                  >
                    Save to my collection <span>↗</span>
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {settingsOpen && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <section
            className="modal settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <button
              className="close-button"
              onClick={() => setSettingsOpen(false)}
              aria-label="Close settings"
            >
              ×
            </button>
            <p className="eyebrow">YOUR DATA, YOURS</p>
            <h2 id="settings-title">A safe place to keep it.</h2>
            <p className="modal-lede">
              Your collection lives on this device. Keep a copy somewhere safe.
            </p>
            <div className="settings-actions">
              <button className="kind-choice" onClick={() => void exportData()}>
                <span className="choice-icon">↓</span>
                <span>
                  <strong>Export collection</strong>
                  <small>Download entries, notes, and covers as JSON</small>
                </span>
                <b>↗</b>
              </button>
              <button
                className="kind-choice"
                onClick={() => fileInput.current?.click()}
              >
                <span className="choice-icon">↑</span>
                <span>
                  <strong>Import a backup</strong>
                  <small>Restore entries and their covers</small>
                </span>
                <b>↗</b>
              </button>
              <input
                ref={fileInput}
                hidden
                type="file"
                accept=".json,application/json"
                onChange={(event) => void importData(event)}
              />
            </div>
            <p className="privacy-note">
              No account or cloud sync. Your collection stays in this browser.
            </p>
            <div className="credits">
              <p className="eyebrow">CREDITS</p>
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg"
                  alt="TMDB"
                />
                <span>
                  This product uses TMDB and the TMDB APIs but is not endorsed,
                  certified, or otherwise approved by TMDB.
                </span>
              </a>
            </div>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function isCollectionItem(value: unknown): value is CollectionItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const optionalText = [
    "originalTitle",
    "subtitle",
    "image",
    "year",
    "externalId",
    "director",
    "cinematographer",
    "publisher",
  ];
  const validImage =
    item.image === undefined ||
    (item.image === "" ||
      (typeof item.image === "string" &&
      item.image.length <= 2_000_000 &&
      (/^https?:\/\//i.test(item.image) ||
        /^data:image\/(?:jpeg|png|webp);base64,/i.test(item.image))));
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    ["film", "book"].includes(String(item.kind)) &&
    typeof item.title === "string" &&
    item.title.length > 0 &&
    typeof item.activityDate === "string" &&
    !Number.isNaN(Date.parse(`${item.activityDate}T00:00:00`)) &&
    typeof item.notes === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.modifiedAt === "string" &&
    optionalText.every(
      (key) => item[key] === undefined || typeof item[key] === "string",
    ) &&
    validImage &&
    ["authors", "cast"].every(
      (key) =>
        item[key] === undefined ||
        (Array.isArray(item[key]) &&
          item[key].every((entry) => typeof entry === "string")),
    ) &&
    (item.context === undefined ||
      ["Cinema", "At home", "Other"].includes(String(item.context))) &&
    (item.format === undefined ||
      ["Physical", "Ebook", "Audiobook"].includes(String(item.format)))
  );
}
function Fact({ label, value }: { label: string; value?: string }) {
  return value ? (
    <div className="fact-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ) : null;
}
function Artwork({
  kind,
  title,
  image,
  alt,
}: {
  kind: MediaKind;
  title: string;
  image?: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  return image && !failed ? (
    <img src={image} alt={alt} loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <FallbackArt kind={kind} title={title} />
  );
}
function FallbackArt({ kind, title }: { kind: MediaKind; title: string }) {
  return (
    <span className={`fallback-art ${kind}`}>
      <span className="fallback-symbol">{kind === "film" ? "◉" : "▤"}</span>
      <span className="fallback-title">{title}</span>
      <span className="fallback-caption">A MEMORY KEPT</span>
    </span>
  );
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.6" />
      <path d="m16 16 4.4 4.4" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l1.5-1.2-1.8-3.1-1.8.7a7.8 7.8 0 0 0-2.6-1.5L14.4 3h-3.6l-.3 2.4a7.8 7.8 0 0 0-2.6 1.5l-1.8-.7-1.8 3.1 1.5 1.2a7.8 7.8 0 0 0 0 3l-1.5 1.2 1.8 3.1 1.8-.7a7.8 7.8 0 0 0 2.6 1.5l.3 2.4h3.6l.3-2.4a7.8 7.8 0 0 0 2.6-1.5l1.8.7 1.8-3.1z" />
    </svg>
  );
}

export default App;
