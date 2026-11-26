export interface HeadingItem {
  id: string;
  level: number;
  text: string;
}

export interface ChapterMeta {
  num: string;
  slug: string;
  title: string;
  summary: string;
  moduleId: string;
  moduleNumber: number;
  moduleTitle: string;
  prerequisites: string;
  readingTime: string;
  wordCount: number;
  lineCount: number;
  headings: HeadingItem[];
  labIds: string[];
  prevSlug: string | null;
  nextSlug: string | null;
  sourceRelPath: string;
}

export interface ModuleMeta {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  accent: string;
  chapterSlugs: string[];
}

export interface ReadingPath {
  id: string;
  title: string;
  goal: string;
  chapterNums: string[];
  accent: string;
}

export interface LabDefinition {
  id: string;
  title: string;
  subtitle: string;
  chapterSlug: string;
  chapterNum: string;
  badge: string;
}

export interface ManifestData {
  generatedAt: string;
  stats: {
    totalChapters: number;
    totalModules: number;
    totalWords: number;
    totalLines: number;
    totalGlossaryTerms: number;
    totalLabs: number;
  };
  modules: ModuleMeta[];
  chapters: ChapterMeta[];
  readingPaths: ReadingPath[];
  labs: LabDefinition[];
}

export interface ChapterDetail extends ChapterMeta {
  html: string;
}

export interface SearchItem {
  type: 'chapter' | 'section' | 'glossary' | 'lab';
  title: string;
  subtitle: string;
  route: string;
  keywords: string;
  badge: string;
}

export interface GlossaryEntry {
  id: string;
  term: string;
  letter: string;
  definitionHtml: string;
  definitionText: string;
  chapters: { num: string; slug: string }[];
}
