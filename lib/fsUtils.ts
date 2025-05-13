export type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
};

export interface DirectoryData {
  entries: FileNode[];
  hasMore: boolean;
}

export interface FileResult {
  file: FileSystemFileHandle | null;
  error?: string;
}

/**
 * Reads and returns the text content of a file.
 */
export async function readFileContent(fileHandle: FileSystemFileHandle): Promise<string> {
  const file = await fileHandle.getFile();
  return await file.text();
}

/**
 * Gets a file handle from a directory handle and path.
 */
export async function getFileFromPath(
  rootHandle: FileSystemDirectoryHandle,
  filePath: string
): Promise<FileResult> {
  const parts = filePath.split('/');
  const fileName = parts.pop()!;
  let currentHandle: FileSystemDirectoryHandle = rootHandle;

  // Navigate to the directory containing the file
  for (const part of parts) {
    if (part === '.') continue;
    try {
      currentHandle = await currentHandle.getDirectoryHandle(part);
    } catch (e) {
      return {
        file: null,
        error: `Directory not found: ${part}`
      };
    }
  }

  try {
    const fileHandle = await currentHandle.getFileHandle(fileName);
    return { file: fileHandle };
  } catch (e) {
    return {
      file: null,
      error: `File not found: ${fileName}`
    };
  }
}

/**
 * Converts a glob-like pattern to a regular expression.
 * Supports * as a wildcard.
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = escaped.replace(/\\\*/g, '.*');
  return new RegExp(`^${regex}$`);
}

/**
 * Checks if a directory should be ignored based on its name.
 * Supports glob-like patterns with * as wildcard.
 */
export function shouldIgnoreDirectory(dirName: string, ignoredDirs: Set<string>): boolean {
  for (const pattern of ignoredDirs) {
    if (pattern.includes('*')) {
      const regex = patternToRegex(pattern);
      if (regex.test(dirName)) {
        return true;
      }
    } else if (pattern === dirName) {
      return true;
    }
  }
  return false;
}

/**
 * Sorts file system entries alphabetically, with directories first.
 */
export function sortEntries(entries: FileNode[]): FileNode[] {
  return [...entries].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Interface for storing collected directory information including its handle.
 */
export interface CollectedDirInfo {
  path: string;
  handle: FileSystemDirectoryHandle;
}

/**
 * Recursively collects all file paths under a given directory.
 */
export async function collectAllFiles(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string,
  ignoredDirs: Set<string>
): Promise<string[]> {
  const allFiles: string[] = [];

  for await (const entryHandle of dirHandle.values()) {
    const entryName = entryHandle.name;
    const entryPath = basePath === '.' ? entryName : `${basePath}/${entryName}`;

    if (entryHandle.kind === 'directory') {
      if (shouldIgnoreDirectory(entryName, ignoredDirs)) {
        continue;
      }
      const nestedFiles = await collectAllFiles(
        entryHandle as FileSystemDirectoryHandle,
        entryPath,
        ignoredDirs
      );
      allFiles.push(...nestedFiles);
    } else if (entryHandle.kind === 'file') {
      allFiles.push(entryPath);
    }
  }
  return allFiles;
}

/**
 * Recursively collects all subdirectory paths under a given directory.
 */
export async function collectAllDirs(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string,
  ignoredDirs: Set<string>
): Promise<CollectedDirInfo[]> {
  const allDirs: CollectedDirInfo[] = [];

  for await (const entryHandle of dirHandle.values()) {
    const entryName = entryHandle.name;
    const entryPath = basePath === '.' ? entryName : `${basePath}/${entryName}`;

    if (entryHandle.kind === 'directory') {
      if (shouldIgnoreDirectory(entryName, ignoredDirs)) {
        continue;
      }
      const currentDirHandle = entryHandle as FileSystemDirectoryHandle;
      allDirs.push({ path: entryPath, handle: currentDirHandle });
      const nestedDirs = await collectAllDirs(
        currentDirHandle,
        entryPath,
        ignoredDirs
      );
      allDirs.push(...nestedDirs);
    }
  }
  return allDirs;
} 