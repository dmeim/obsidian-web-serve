import { App } from 'obsidian';

export const INTERNAL_CSS_ENPOINT =
  '/.obsidian/plugins/web-serve/app.css';
export const INTERNAL_LOGIN_ENPOINT =
  '/.obsidian/plugins/web-serve/login.html';
export const INTERNAL_FILES_ENDPOINT = '/.api/files';

export const tryResolveFilePath: (
  requestedUrl: string,
  resolveFrom: string,
  app: App
) => string | null = (requestedUrl, resolveFrom, app) => {
  if ([INTERNAL_CSS_ENPOINT, INTERNAL_LOGIN_ENPOINT, INTERNAL_FILES_ENDPOINT].includes(requestedUrl))
    return requestedUrl;

  const requestedFile = app.metadataCache.getFirstLinkpathDest(
    requestedUrl.substring(1),
    resolveFrom
  );

  if (requestedFile) return requestedFile.path;

  //@ts-ignore
  return global.app.fileManager[requestedUrl.substring(1)];
};
