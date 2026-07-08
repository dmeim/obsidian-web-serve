/** Pure helpers for breadcrumbs and previous/next note navigation. */

export type NavFile = {
  path: string;
  name: string;
};

/** Display label matching sidebar conventions (strip .excalidraw.md / .md / .canvas). */
export function displayFileName(fileName: string): string {
  return fileName
    .replace(/\.excalidraw\.md$/i, '')
    .replace(/\.(md|canvas)$/i, '');
}

/** Parent directory of a vault-relative path, or '' for root-level files. */
export function parentDir(filePath: string): string {
  const idx = filePath.lastIndexOf('/');
  return idx === -1 ? '' : filePath.slice(0, idx);
}

export type BreadcrumbSegment = {
  label: string;
  /** Absolute URL path when clickable; null for non-link segments. */
  href: string | null;
  current: boolean;
};

/**
 * Build breadcrumb segments for a vault file path.
 * Root links to `/`; intermediate folders are non-clickable; final segment is current.
 */
export function buildBreadcrumbSegments(filePath: string): BreadcrumbSegment[] {
  const parts = filePath.split('/').filter(Boolean);
  if (parts.length === 0) {
    return [{ label: 'Home', href: '/', current: true }];
  }

  const segments: BreadcrumbSegment[] = [
    { label: 'Home', href: '/', current: false },
  ];

  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const label = isLast ? displayFileName(parts[i]) : parts[i];
    segments.push({
      label,
      href: null,
      current: isLast,
    });
  }

  return segments;
}

/** Escape text for safe HTML attribute/text content. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Server-rendered breadcrumb HTML for `#VAR{BREADCRUMBS}`. */
export function buildBreadcrumbsHtml(filePath: string): string {
  const segments = buildBreadcrumbSegments(filePath);
  const parts = segments.map((seg, i) => {
    const sep =
      i === 0
        ? ''
        : '<span class="ws-breadcrumbs-sep" aria-hidden="true">/</span>';
    if (seg.href && !seg.current) {
      return (
        sep +
        `<a class="ws-breadcrumbs-link" href="${escapeHtml(seg.href)}">${escapeHtml(seg.label)}</a>`
      );
    }
    if (seg.current) {
      return (
        sep +
        `<span class="ws-breadcrumbs-current" aria-current="page">${escapeHtml(seg.label)}</span>`
      );
    }
    return (
      sep +
      `<span class="ws-breadcrumbs-folder">${escapeHtml(seg.label)}</span>`
    );
  });
  return parts.join('');
}

/**
 * Sibling files in the same folder, sorted like the sidebar (`name.localeCompare`).
 */
export function getFolderSiblings(
  files: NavFile[],
  currentPath: string
): NavFile[] {
  const parent = parentDir(currentPath);
  return files
    .filter((f) => parentDir(f.path) === parent)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type PrevNextResult = {
  prev: NavFile | null;
  next: NavFile | null;
};

/** Previous/next siblings for the current path within the same folder. */
export function getPrevNext(
  files: NavFile[],
  currentPath: string
): PrevNextResult {
  const siblings = getFolderSiblings(files, currentPath);
  const index = siblings.findIndex((f) => f.path === currentPath);
  if (index === -1) {
    return { prev: null, next: null };
  }
  return {
    prev: index > 0 ? siblings[index - 1] : null,
    next: index < siblings.length - 1 ? siblings[index + 1] : null,
  };
}
