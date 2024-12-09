'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronRight,
  ChevronDown,
  Wand2,
  Copy,
  Folder as FolderIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
};

interface DirectoryData {
  entries: FileNode[];
  hasMore: boolean;
}

export default function Page() {
  const { toast } = useToast();

  const [rootDirectoryHandle, setRootDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [directoryHandles, setDirectoryHandles] = useState<Map<string, FileSystemDirectoryHandle>>(new Map());
  const [directoryData, setDirectoryData] = useState<Record<string, DirectoryData>>({});
  const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [ignoreDirsInput, setIgnoreDirsInput] = useState<string>('node_modules');
  const [promptOutput, setPromptOutput] = useState<string>('');

  function resetState() {
    setDirectoryData({});
    setExpandedDirectories(new Set());
    setSelectedFiles(new Set());
    setPromptOutput('');
  }

  async function readDirectoryEntries(
    dirHandle: FileSystemDirectoryHandle,
    dirPath: string
  ): Promise<{
    entries: FileNode[];
    subDirs: { path: string; handle: FileSystemDirectoryHandle }[];
  }> {
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
  }

  async function pickDirectory() {
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
  }

  async function loadDirectory(dirPath: string) {
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
  }

  async function toggleDirectory(dirPath: string) {
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
  }

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

  function renderDirectory(dirPath: string): JSX.Element | null {
    const dir = directoryData[dirPath];
    if (!dir) return null;

    return (
      <ul className="space-y-1">
        {dir.entries.map((node) => {
          if (node.type === 'directory') {
            const isOpen = expandedDirectories.has(node.path);
            return (
              <li key={node.path} className="text-sm">
                <div
                  className="flex items-center space-x-1 cursor-pointer rounded px-1 py-0.5 hover:bg-secondary transition-colors"
                  onClick={() => toggleDirectory(node.path)}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-foreground" />
                  )}
                  <FolderIcon className="h-4 w-4 text-foreground" />
                  <span className="font-medium text-foreground">{node.name}</span>
                </div>
                {isOpen && <div className="pl-5">{renderDirectory(node.path)}</div>}
              </li>
            );
          }

          return (
            <li
              key={node.path}
              className="flex items-center space-x-2 text-sm rounded px-1 py-0.5 hover:bg-secondary transition-colors"
            >
              <Checkbox
                checked={selectedFiles.has(node.path)}
                onCheckedChange={() => toggleFileSelection(node.path)}
              />
              <span className="text-foreground/90">{node.name}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: 'Copied!',
          description: 'Prompt copied to clipboard',
          duration: 2000
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to copy to clipboard',
          variant: 'destructive',
          duration: 2000
        });
      }
    },
    [toast]
  );

  async function buildFullTree(
    dirHandle: FileSystemDirectoryHandle,
    ignoredDirs: Set<string>,
    basePath = '.',
    indent = ''
  ): Promise<string> {
    const lines: string[] = [];
    const allEntries: FileSystemHandle[] = [];

    for await (const entryHandle of dirHandle.values()) {
      allEntries.push(entryHandle);
    }

    allEntries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entryHandle of allEntries) {
      const name = entryHandle.name;
      if (ignoredDirs.has(name)) continue;

      const nodePath = basePath === '.' ? name : `${basePath}/${name}`;
      if (entryHandle.kind === 'directory') {
        lines.push(`${indent}${name}/`);
        const subtree = await buildFullTree(
          entryHandle as FileSystemDirectoryHandle,
          ignoredDirs,
          nodePath,
          indent + '  '
        );
        if (subtree) lines.push(subtree);
      } else {
        lines.push(`${indent}${name}`);
      }
    }

    return lines.join('\n');
  }

  async function generatePrompt() {
    if (!rootDirectoryHandle) return;
    const ignoredDirs = new Set(
      ignoreDirsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );

    const directoryStructure = await buildFullTree(rootDirectoryHandle, ignoredDirs);

    let filesText = '';
    for (const filePath of selectedFiles) {
      const fileDir = filePath.substring(0, filePath.lastIndexOf('/')) || '.';
      const fileName = filePath.split('/').pop()!;
      const fileDirHandle = directoryHandles.get(fileDir);
      if (!fileDirHandle) continue;

      try {
        const fileHandle = await fileDirHandle.getFileHandle(fileName, { create: false });
        const file = await fileHandle.getFile();
        const content = await file.text();
        filesText += `\n\nFile: ${filePath}\n\`\`\`\n${content}\n\`\`\``;
      } catch (e) {
        console.error('Error reading file:', filePath, e);
      }
    }

    const finalPrompt = `<directory_structure>\n${directoryStructure}\n</directory_structure>\n\n<code_files>${filesText}\n</code_files>`;
    setPromptOutput(finalPrompt);
  }

  async function refreshDirectory() {
    if (!rootDirectoryHandle) return;
    try {
      setDirectoryData({});
      setExpandedDirectories(new Set());
      setSelectedFiles(new Set());
      setPromptOutput('');

      const { entries, subDirs } = await readDirectoryEntries(rootDirectoryHandle, '.');
      const handlesMap = new Map<string, FileSystemDirectoryHandle>();
      handlesMap.set('.', rootDirectoryHandle);
      subDirs.forEach((sub) => handlesMap.set(sub.path, sub.handle));

      setDirectoryHandles(handlesMap);
      setDirectoryData({ '.': { entries, hasMore: false } });
    } catch (e) {
      console.error('Error refreshing directory:', e);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="flex flex-col w-1/3 h-full border-r border-border p-4">
        <h1 className="text-base font-semibold mb-4">Codext</h1>

        <div className="flex flex-col space-y-3 mb-4">
          {!rootDirectoryHandle && (
            <Button variant="default" size="sm" onClick={pickDirectory}>
              Select Workspace Folder
            </Button>
          )}
          {rootDirectoryHandle && (
            <>
              <div>
                <label htmlFor="ignore-input" className="block text-sm font-medium mb-1">
                  Ignore directories (comma-separated):
                </label>
                <input
                  id="ignore-input"
                  type="text"
                  value={ignoreDirsInput}
                  onChange={(e) => setIgnoreDirsInput(e.target.value)}
                  className="border border-border rounded px-2 py-1 text-sm w-full"
                  placeholder="e.g. node_modules, .git"
                />
              </div>
              <div className="flex space-x-2 justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={refreshDirectory}
                  className="flex items-center gap-2 self-end"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      d="M4 2a1 1 0 000 2h1.257a8 8 0 0113.235 3.121.999.999 0 10.943-1.332A10 10 0 005.239 2H4zM16 18a1 1 0 000-2H14.74a8 8 0 01-13.36-2.979.999.999 0 10-.933 1.358A10 10 0 0014.761 18H16z"
                    />
                  </svg>
                  Refresh
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={generatePrompt}
                  className="flex items-center gap-2 self-end"
                >
                  <Wand2 className="h-4 w-4" />
                  Generate
                </Button>
              </div>
            </>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)]">
          {rootDirectoryHandle && renderDirectory('.')}
        </ScrollArea>
      </div>

      <div className="flex-1 h-full p-4">
        {promptOutput && (
          <div className="h-full relative bg-muted/50 rounded-lg border border-border shadow-sm">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-muted/50 to-background/50 opacity-50" />
            <div className="relative h-full flex flex-col p-6">
              <div className="flex justify-end mb-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(promptOutput)}
                  className="flex items-center gap-2 hover:bg-muted"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </Button>
              </div>

              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <pre className="text-sm text-foreground/90 font-mono leading-relaxed whitespace-pre-wrap break-all">
                    {promptOutput}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
