import type { MediaKind, SearchResult } from "./types";

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as
  string | undefined;
const tmdbImage = (path?: string) =>
  path ? `https://image.tmdb.org/t/p/w500${path}` : undefined;

async function getJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Search is unavailable right now.");
  return response.json();
}

export async function searchMedia(
  kind: MediaKind,
  query: string,
): Promise<SearchResult[]> {
  if (kind === "film") {
    if (!TMDB_KEY)
      throw new Error("Add a TMDB API key in .env to search for films.");
    const url = new URL("https://api.themoviedb.org/3/search/movie");
    url.searchParams.set("api_key", TMDB_KEY);
    url.searchParams.set("query", query);
    url.searchParams.set("include_adult", "false");
    const data = await getJson(url.toString());
    return (data.results ?? []).slice(0, 8).map((movie: any) => ({
      id: String(movie.id),
      title: movie.title,
      subtitle:
        movie.original_title !== movie.title ? movie.original_title : undefined,
      year: movie.release_date?.slice(0, 4),
      image: tmdbImage(movie.poster_path),
      description: movie.overview,
    }));
  }
  if (!GOOGLE_BOOKS_KEY)
    throw new Error("Add a Google Books API key in .env to search for books.");
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", `intitle:${query}`);
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("printType", "books");
  url.searchParams.set("key", GOOGLE_BOOKS_KEY);
  const data = await getJson(url.toString());
  return (data.items ?? []).map((entry: any) => {
    const info = entry.volumeInfo ?? {};
    const image = info.imageLinks?.thumbnail
      ?.replace("http://", "https://")
      .replace("zoom=1", "zoom=2");
    return {
      id: entry.id,
      title: info.title ?? "Untitled",
      subtitle: info.subtitle,
      authors: info.authors ?? [],
      year: info.publishedDate?.slice(0, 4),
      image,
      description: info.description,
    };
  });
}

export async function getFilmCredits(id: string) {
  if (!TMDB_KEY) return {};
  const data = await getJson(
    `https://api.themoviedb.org/3/movie/${id}/credits?api_key=${encodeURIComponent(TMDB_KEY)}`,
  );
  const director = data.crew?.find(
    (person: any) => person.job === "Director",
  )?.name;
  const cinematographer = data.crew?.find((person: any) =>
    ["Director of Photography", "Cinematography", "Cinematographer"].includes(
      person.job,
    ),
  )?.name;
  const cast = data.cast?.slice(0, 5).map((person: any) => person.name) ?? [];
  return { director, cinematographer, cast };
}

export async function getBookDetails(id: string) {
  const data = await getJson(
    `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}?key=${encodeURIComponent(GOOGLE_BOOKS_KEY ?? "")}`,
  );
  const info = data.volumeInfo ?? {};
  return { authors: info.authors ?? [], publisher: info.publisher };
}
