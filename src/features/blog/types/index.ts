export interface BlogPost {
  id: number;
  /**
   * URL-safe identifier used for deep-linking to an individual article at
   * `/dashboard/blog/:slug`. Must be unique across posts and contain only
   * lowercase alphanumerics separated by single hyphens (e.g.
   * `future-of-decentralized-development`). Treated as untrusted when it
   * arrives from the URL and is validated/looked up against the known post
   * set before use.
   */
  slug: string;
  title: string;
  excerpt: string;
  content?: string; // Full content for individual post pages
  date: string;
  readTime: string;
  author?: string;
  category?: string;
  icon?: string;
  image?: string;
  isFeatured?: boolean;
}

export interface BlogStatistic {
  icon: React.ReactNode;
  value: string;
  label: string;
}

export interface BlogFeature {
  number: number;
  title: string;
  description: string;
}

export interface BlogWhyChooseCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}
