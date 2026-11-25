/** One package in the notices that scripts/third-party-notices.mjs writes during app builds. */
export interface NoticePackage {
  name: string;
  version: string;
  license: string;
  source: 'crate' | 'npm';
  repository: string;
  /** Keys into `Notices.texts`, one per license or notice file the package ships. */
  texts: string[];
}

export interface Notices {
  packages: NoticePackage[];
  texts: Record<string, string>;
}

// The file only exists after a build has generated it, so a missing file yields null rather than a
// failed import. It is loaded as its own chunk, only when the viewer opens.
const generated = import.meta.glob<Notices>('../generated/third-party-notices.json', { import: 'default' });

export async function loadNotices(): Promise<Notices | null> {
  const load = Object.values(generated)[0];
  return load ? load() : null;
}
