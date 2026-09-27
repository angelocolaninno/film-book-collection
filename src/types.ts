export type MediaKind = "film" | "book";
export type ViewingContext = "Cinema" | "At home" | "Other";
export type ReadingFormat = "Physical" | "Ebook" | "Audiobook";

export interface CollectionItem {
  id: string;
  kind: MediaKind;
  title: string;
  originalTitle?: string;
  subtitle?: string;
  image?: string;
  year?: string;
  activityDate: string;
  notes: string;
  createdAt: string;
  modifiedAt: string;
  externalId?: string;
  director?: string;
  cast?: string[];
  cinematographer?: string;
  authors?: string[];
  publisher?: string;
  context?: ViewingContext;
  format?: ReadingFormat;
}

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  authors?: string[];
  image?: string;
  year?: string;
  description?: string;
}
