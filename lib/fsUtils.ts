export type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
};

export interface DirectoryData {
  entries: FileNode[];
  hasMore: boolean;
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
): Promise<FileSystemFileHandle | null> {
  const parts = filePath.split('/');
  const fileName = parts.pop()!;
  let currentHandle: FileSystemDirectoryHandle = rootHandle;

  // Navigate to the directory containing the file
  for (const part of parts) {
    if (part === '.') continue;
    try {
      currentHandle = await currentHandle.getDirectoryHandle(part);
    } catch (e) {
      console.error('Error getting directory handle:', e);
      return null;
    }
  }

  try {
    return await currentHandle.getFileHandle(fileName);
  } catch (e) {
    console.error('Error getting file handle:', e);
    return null;
  }
}

/**
 * Checks if a directory should be ignored based on its name.
 */
export function shouldIgnoreDirectory(dirName: string, ignoredDirs: Set<string>): boolean {
  return ignoredDirs.has(dirName);
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