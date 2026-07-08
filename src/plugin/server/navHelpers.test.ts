import {
  buildBreadcrumbSegments,
  buildBreadcrumbsHtml,
  displayFileName,
  getFolderSiblings,
  getPrevNext,
  parentDir,
} from './navHelpers';

describe('navHelpers', () => {
  describe('displayFileName', () => {
    it('strips markdown and canvas extensions', () => {
      expect(displayFileName('Note.md')).toBe('Note');
      expect(displayFileName('Board.canvas')).toBe('Board');
    });

    it('strips excalidraw compound extension', () => {
      expect(displayFileName('Drawing.excalidraw.md')).toBe('Drawing');
    });
  });

  describe('parentDir', () => {
    it('returns empty string for root files', () => {
      expect(parentDir('Note.md')).toBe('');
    });

    it('returns parent path for nested files', () => {
      expect(parentDir('Folder/Sub/Note.md')).toBe('Folder/Sub');
    });
  });

  describe('buildBreadcrumbSegments', () => {
    it('builds home + folders + current for nested notes', () => {
      const segs = buildBreadcrumbSegments('Projects/Alpha/Spec.md');
      expect(segs).toEqual([
        { label: 'Home', href: '/', current: false },
        { label: 'Projects', href: null, current: false },
        { label: 'Alpha', href: null, current: false },
        { label: 'Spec', href: null, current: true },
      ]);
    });

    it('handles root-level notes', () => {
      const segs = buildBreadcrumbSegments('Inbox.md');
      expect(segs).toEqual([
        { label: 'Home', href: '/', current: false },
        { label: 'Inbox', href: null, current: true },
      ]);
    });
  });

  describe('buildBreadcrumbsHtml', () => {
    it('renders links, folders, and current segment', () => {
      const html = buildBreadcrumbsHtml('Folder/Note.md');
      expect(html).toContain('href="/"');
      expect(html).toContain('ws-breadcrumbs-folder');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('Note');
      expect(html).not.toContain('<script');
    });

    it('escapes HTML in path segments', () => {
      const html = buildBreadcrumbsHtml('A<b>/x.md');
      expect(html).toContain('A&lt;b&gt;');
      expect(html).not.toContain('<b>');
    });
  });

  describe('getFolderSiblings / getPrevNext', () => {
    const files = [
      { path: 'Z.md', name: 'Z.md' },
      { path: 'Folder/b.md', name: 'b.md' },
      { path: 'Folder/a.md', name: 'a.md' },
      { path: 'Folder/c.md', name: 'c.md' },
      { path: 'Other/x.md', name: 'x.md' },
    ];

    it('returns same-folder siblings sorted by name', () => {
      const siblings = getFolderSiblings(files, 'Folder/b.md');
      expect(siblings.map((f) => f.name)).toEqual(['a.md', 'b.md', 'c.md']);
    });

    it('returns prev and next around the current file', () => {
      expect(getPrevNext(files, 'Folder/b.md')).toEqual({
        prev: { path: 'Folder/a.md', name: 'a.md' },
        next: { path: 'Folder/c.md', name: 'c.md' },
      });
    });

    it('omits prev on the first sibling and next on the last', () => {
      expect(getPrevNext(files, 'Folder/a.md').prev).toBeNull();
      expect(getPrevNext(files, 'Folder/c.md').next).toBeNull();
    });

    it('treats root-level files as one sibling group', () => {
      const rootFiles = [
        { path: 'B.md', name: 'B.md' },
        { path: 'A.md', name: 'A.md' },
        { path: 'Folder/x.md', name: 'x.md' },
      ];
      expect(getPrevNext(rootFiles, 'A.md')).toEqual({
        prev: null,
        next: { path: 'B.md', name: 'B.md' },
      });
    });

    it('returns nulls when current path is not in the list', () => {
      expect(getPrevNext(files, 'Missing.md')).toEqual({
        prev: null,
        next: null,
      });
    });
  });
});
