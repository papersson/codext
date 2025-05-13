import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { sortEntries, collectAllFiles, collectAllDirs, CollectedDirInfo } from '@/lib/fsUtils';

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
  const [isBatchUpdating, setIsBatchUpdating] = useState<boolean>(false);

  // Caches for recursive collection functions
  const [fileCollectCache, setFileCollectCache] = useState<Map<string, Promise<string[]>>>(new Map());
  const [dirCollectCache, setDirCollectCache] = useState<Map<string, Promise<CollectedDirInfo[]>>>(new Map());

  const resetState = useCallback(() => {
    setDirectoryData({});
    setExpandedDirectories(new Set());
    setSelectedFiles(new Set());
    setFileCollectCache(new Map());
    setDirCollectCache(new Map());
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

    // Use sortEntries from fsUtils to ensure directories come first
    return { entries: sortEntries(entries), subDirs };
  }, []);

  const pickDirectory = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      toast({
        title: "Browser Not Supported",
        description: "Your browser doesn't support directory selection. Please use Chrome, Edge, or Safari.",
        variant: "destructive"
      });
      return;
    }

    try {
      const handle = await window.showDirectoryPicker();
      if (!handle) return;

      resetState();
      const { entries, subDirs } = await readDirectoryEntries(handle, '.');

      const handlesMap = new Map<string, FileSystemDirectoryHandle>();
      handlesMap.set('.', handle);
      subDirs.forEach((sub) => handlesMap.set(sub.path, sub.handle));

      setRootDirectoryHandle(handle);
      setDirectoryHandles(handlesMap);
      setDirectoryData({ '.': { entries, hasMore: false } });
      // Clear caches on new directory pick
      setFileCollectCache(new Map());
      setDirCollectCache(new Map());
    } catch (e) {
      console.error('Error in pickDirectory:', e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to access directory",
        variant: "destructive"
      });
    }
  }, [resetState, readDirectoryEntries]);

  const loadDirectory = useCallback(async (
    dirPath: string,
    explicitHandle?: FileSystemDirectoryHandle
  ) => {
    const dirHandle = explicitHandle || directoryHandles.get(dirPath);
    if (!dirHandle) {
      console.error('No directory handle found for:', dirPath);
      toast({ title: "Error", description: `Failed to load directory ${dirPath}. Handle not found.`, variant: "destructive" });
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
          subDirs.forEach((sub) => {
            if (!updatedMap.has(sub.path)) {
              updatedMap.set(sub.path, sub.handle);
            }
          });
          return updatedMap;
        });
      }
    } catch (e) {
      console.error('Error in loadDirectory:', dirPath, e);
      toast({ title: "Error", description: `Failed to load directory ${dirPath}.`, variant: "destructive"});
    }
  }, [directoryHandles, readDirectoryEntries, toast]);

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

  const toggleDirectorySelection = useCallback(
    async (dirPath: string, select: boolean, ignoredDirs: Set<string>) => {
      const mainDirHandle = directoryHandles.get(dirPath);
      if (!mainDirHandle) {
        console.error('Main directory handle not found for batch selection:', dirPath);
        toast({ title: "Error", description: `Directory ${dirPath} handle not found. Cannot process selection.`, variant: "destructive" });
        return;
      }

      setIsBatchUpdating(true);
      try {
        let filesToToggle: string[];
        if (fileCollectCache.has(dirPath)) {
          filesToToggle = await fileCollectCache.get(dirPath)!;
        } else {
          const promise = collectAllFiles(mainDirHandle, dirPath, ignoredDirs);
          setFileCollectCache(prev => new Map(prev).set(dirPath, promise));
          filesToToggle = await promise;
        }

        setSelectedFiles(prevSelected => {
          const updatedSelected = new Set(prevSelected);
          if (select) {
            filesToToggle.forEach(file => updatedSelected.add(file));
          } else {
            filesToToggle.forEach(file => updatedSelected.delete(file));
          }
          return updatedSelected;
        });

        if (select) {
          let collectedSubDirInfos: CollectedDirInfo[];
          if (dirCollectCache.has(dirPath)) {
            collectedSubDirInfos = await dirCollectCache.get(dirPath)!;
          } else {
            const promise = collectAllDirs(mainDirHandle, dirPath, ignoredDirs);
            setDirCollectCache(prev => new Map(prev).set(dirPath, promise));
            collectedSubDirInfos = await promise;
          }

          // All directory infos to process: the main one + its subdirectories
          const allDirInfosToProcess: CollectedDirInfo[] = [
            { path: dirPath, handle: mainDirHandle }, 
            ...collectedSubDirInfos
          ];

          // Update directoryHandles state with ALL discovered handles upfront
          setDirectoryHandles(prevMap => {
            const updatedMap = new Map(prevMap);
            allDirInfosToProcess.forEach(info => {
              if (!updatedMap.has(info.path)) {
                updatedMap.set(info.path, info.handle);
              }
            });
            return updatedMap;
          });
          
          const pathsToExpand: string[] = [];

          for (const info of allDirInfosToProcess) {
            pathsToExpand.push(info.path);
            if (!directoryData[info.path]) {
              // Call loadDirectory with the explicit handle from the current scope
              await loadDirectory(info.path, info.handle);
            }
          }

          setExpandedDirectories(prevExpanded => {
            const updatedExpanded = new Set(prevExpanded);
            pathsToExpand.forEach(p => updatedExpanded.add(p));
            return updatedExpanded;
          });
        }
      } catch (error) {
        console.error("Error during batch directory selection:", dirPath, error);
        toast({
          title: "Selection Error",
          description: `Could not update selection for ${dirPath}. ${(error as Error).message}`,
          variant: "destructive",
        });
      } finally {
        setIsBatchUpdating(false);
      }
    },
    // Ensure all dependencies are correctly listed, especially state setters and `loadDirectory`
    [ directoryHandles, directoryData, loadDirectory, fileCollectCache, dirCollectCache, toast, 
      setSelectedFiles, setExpandedDirectories, setDirectoryHandles, setFileCollectCache, setDirCollectCache, setIsBatchUpdating]
  );

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
      // Clear caches on refresh
      setFileCollectCache(new Map());
      setDirCollectCache(new Map());
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
    isBatchUpdating,
    pickDirectory,
    toggleDirectory,
    toggleFileSelection,
    toggleDirectorySelection,
    refreshDirectory,
  };
}