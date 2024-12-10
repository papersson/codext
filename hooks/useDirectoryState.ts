import { useState, useCallback } from 'react';

type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
};

interface DirectoryData {
  entries: FileNode[];
  hasMore: boolean;
}

export function useDirectoryState() {
  const [rootDirectoryHandle, setRootDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [directoryHandles, setDirectoryHandles] = useState<Map<string, FileSystemDirectoryHandle>>(new Map());
  const [directoryData, setDirectoryData] = useState<Record<string, DirectoryData>>({});
  const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const resetState = useCallback(() => {
    setDirectoryData({});
    setExpandedDirectories(new Set());
    setSelectedFiles(new Set());
  }, []);

  const readDirectoryEntries = useCallback(async (
    dirHandle: FileSystemDirectoryHandle,
    dirPath: string
  ): Promise<{
    entries: FileNode[];
    subDirs: { path: string; handle: FileSystemDirectoryHandle }[];
  }> => {
    const entries: FileNode[] = [];
    const subDirs: { path: string; handle: FileSystemDirectoryHandle }[] = [];

    for await (const entryHandle of dirHandle.values()) {
      const name = entryHandle.name;
      const nodePath = dirPath === '.' ? name : `${dirPath}/${name}`;
      if (entryHandle.kind === 'directory') {
        entries.push({ name, path: nodePath, type: 'directory' });
        subDirs.push({ path: nodePath, handle: entryHandle });
      } else {
        entries.push({ name, path: nodePath, type: 'file' });
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    return { entries, subDirs };
  }, []);

  const pickDirectory = useCallback(async () => {
    try {
      const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
      if (!handle) return;

      resetState();
      const { entries, subDirs } = await readDirectoryEntries(handle, '.');

      const handlesMap = new Map<string, FileSystemDirectoryHandle>();
      handlesMap.set('.', handle);
      subDirs.forEach((sub) => handlesMap.set(sub.path, sub.handle));

      setRootDirectoryHandle(handle);
      setDirectoryHandles(handlesMap);
      setDirectoryData({ '.': { entries, hasMore: false } });
    } catch (e) {
      console.error('Error in pickDirectory:', e);
    }
  }, [resetState, readDirectoryEntries]);

  const loadDirectory = useCallback(async (dirPath: string) => {
    const dirHandle = directoryHandles.get(dirPath);
    if (!dirHandle) {
      console.error('No directory handle found for:', dirPath);
      return;
    }

    try {
      const { entries, subDirs } = await readDirectoryEntries(dirHandle, dirPath);
      setDirectoryData((prev) => ({
        ...prev,
        [dirPath]: { entries, hasMore: false }
      }));

      if (subDirs.length > 0) {
        setDirectoryHandles((prevMap) => {
          const updatedMap = new Map(prevMap);
          subDirs.forEach((sub) => updatedMap.set(sub.path, sub.handle));
          return updatedMap;
        });
      }
    } catch (e) {
      console.error('Error in loadDirectory:', e);
    }
  }, [directoryHandles, readDirectoryEntries]);

  const toggleDirectory = useCallback(async (dirPath: string) => {
    const isCurrentlyOpen = expandedDirectories.has(dirPath);

    if (isCurrentlyOpen) {
      setExpandedDirectories((prev) => {
        const updated = new Set(prev);
        updated.delete(dirPath);
        return updated;
      });
    } else {
      if (!directoryData[dirPath]) {
        await loadDirectory(dirPath);
      }
      setExpandedDirectories((prev) => new Set(prev).add(dirPath));
    }
  }, [expandedDirectories, directoryData, loadDirectory]);

  const toggleFileSelection = useCallback((filePath: string) => {
    setSelectedFiles((prev) => {
      const updated = new Set(prev);
      if (updated.has(filePath)) {
        updated.delete(filePath);
      } else {
        updated.add(filePath);
      }
      return updated;
    });
  }, []);

  const refreshDirectory = useCallback(async () => {
    if (!rootDirectoryHandle) return;
    try {
      resetState();
      const { entries, subDirs } = await readDirectoryEntries(rootDirectoryHandle, '.');
      const handlesMap = new Map<string, FileSystemDirectoryHandle>();
      handlesMap.set('.', rootDirectoryHandle);
      subDirs.forEach((sub) => handlesMap.set(sub.path, sub.handle));

      setDirectoryHandles(handlesMap);
      setDirectoryData({ '.': { entries, hasMore: false } });
    } catch (e) {
      console.error('Error refreshing directory:', e);
    }
  }, [rootDirectoryHandle, resetState, readDirectoryEntries]);

  return {
    rootDirectoryHandle,
    directoryHandles,
    directoryData,
    expandedDirectories,
    selectedFiles,
    pickDirectory,
    toggleDirectory,
    toggleFileSelection,
    refreshDirectory,
  };
} 