'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, Wand2, Copy } from 'lucide-react';
import path from 'path';
import { useToast } from "@/hooks/use-toast";

type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
};

type DirData = {
  entries: FileNode[];
  hasMore: boolean;
};

export default function Page() {
  const { toast } = useToast();
  const [directories, setDirectories] = useState<Record<string, DirData>>({});
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState<string>('');
  const [ignoreInput, setIgnoreInput] = useState<string>('node_modules');

  const rootPath = '.';

  useEffect(() => {
    loadDirectory(rootPath);
  }, []);

  const loadDirectory = async (dirPath: string, offset = 0) => {
    const limit = 50;
    const params = new URLSearchParams({ path: dirPath, limit: limit.toString(), offset: offset.toString() });
    const res = await fetch('/api/files?' + params.toString());
    const data = await res.json() as { entries: FileNode[], hasMore: boolean };

    setDirectories(prev => {
      const existing = prev[dirPath] || { entries: [], hasMore: false };
      const newEntries = offset === 0 ? data.entries : [...existing.entries, ...data.entries];
      return {
        ...prev,
        [dirPath]: { entries: newEntries, hasMore: data.hasMore }
      };
    });
  };

  const toggleFileSelection = useCallback((filePath: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  }, []);

  const toggleDirectory = (dirPath: string) => {
    setExpandedDirs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dirPath)) {
        newSet.delete(dirPath);
      } else {
        if (!directories[dirPath]) {
          loadDirectory(dirPath);
        }
        newSet.add(dirPath);
      }
      return newSet;
    });
  };

  const loadMore = (dirPath: string) => {
    const dirData = directories[dirPath];
    if (!dirData) return;
    loadDirectory(dirPath, dirData.entries.length);
  };

  const generatePrompt = async () => {
    // Fetch selected files' content
    const params = new URLSearchParams();
    Array.from(selectedFiles).forEach(f => {
      params.append('selected', f);
    });
    const fileRes = await fetch('/api/files?' + params.toString());
    const fileData = await fileRes.json();
    const { selectedFilesData } = fileData;

    // Prepare ignored dirs for full tree request
    const ignoredDirs = ignoreInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const treeParams = new URLSearchParams({ fullTree: 'true' });
    for (const ig of ignoredDirs) {
      treeParams.append('ignore', ig);
    }

    // Fetch full directory structure excluding ignored directories
    const treeRes = await fetch('/api/files?' + treeParams.toString());
    const treeData = await treeRes.json();
    const treeText = treeData.directoryStructure || '';

    const cwd = process.cwd();
    let filesText = '';
    for (const file of (selectedFilesData || [])) {
      const relativePath = path.relative(cwd, file.path);
      filesText += `\n\nFile: ${relativePath}\n\`\`\`\n${file.content}\n\`\`\``;
    }

    const finalPrompt = `<directory_structure>\n${treeText}</directory_structure>\n\n<code_files>\n${filesText}\n</code_files>`;
    setPrompt(finalPrompt);
  };

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard",
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
        duration: 2000,
      });
    }
  }, [toast]);

  const renderDirectory = (dirPath: string) => {
    const dirData = directories[dirPath];
    if (!dirData) return null;

    return (
      <ul className="space-y-1">
        {dirData.entries.map(node => {
          if (node.type === 'directory') {
            const isOpen = expandedDirs.has(node.path);
            return (
              <li key={node.path} className="text-sm">
                <div
                  className="flex items-center space-x-1 cursor-pointer rounded px-1 py-0.5 hover:bg-secondary transition-colors"
                  onClick={() => toggleDirectory(node.path)}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 text-foreground" /> : <ChevronRight className="h-4 w-4 text-foreground" />}
                  <span className="font-medium text-foreground">{node.name}</span>
                </div>
                {isOpen && (
                  <div className="pl-5">
                    {renderDirectory(node.path)}
                    {directories[node.path]?.hasMore && (
                      <Button variant="ghost" size="sm" className="text-xs text-foreground/70 hover:bg-secondary mt-1"
                        onClick={(e) => { e.stopPropagation(); loadMore(node.path); }}>
                        Load more
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          } else {
            return (
              <li key={node.path} className="flex items-center space-x-2 text-sm rounded px-1 py-0.5 hover:bg-secondary transition-colors">
                <Checkbox
                  checked={selectedFiles.has(node.path)}
                  onCheckedChange={() => toggleFileSelection(node.path)}
                />
                <span className="text-foreground/90">{node.name}</span>
              </li>
            );
          }
        })}
        {dirData.hasMore && !expandedDirs.has(dirPath) && (
          <Button variant="ghost" size="sm" className="text-xs text-foreground/70 hover:bg-secondary"
            onClick={() => loadMore(dirPath)}>
            Load more
          </Button>
        )}
      </ul>
    );
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col w-1/3 h-full px-4 py-4">
        <div className="flex flex-col space-y-3 mb-3">
          <h1 className="text-base font-semibold text-foreground">Code Base Context Generator</h1>
          <div>
            <label htmlFor="ignore-input" className="block text-sm font-medium mb-1 text-foreground">
              Ignore directories (comma-separated):
            </label>
            <input
              id="ignore-input"
              type="text"
              value={ignoreInput}
              onChange={(e) => setIgnoreInput(e.target.value)}
              className="border border-border rounded px-2 py-1 text-sm w-full"
              placeholder="e.g. node_modules, .git"
            />
          </div>
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
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {renderDirectory(rootPath)}
        </ScrollArea>
      </div>

      <div className="flex-1 h-full p-4 overflow-auto">
        {prompt && (
          <div className="relative bg-muted/50 rounded-lg border border-border shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-muted/50 to-background/50 opacity-50" />
            <div className="relative p-6">
              <div className="absolute top-4 right-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    copyToClipboard(prompt);
                  }}
                  className="h-8 w-8 hover:bg-muted"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <pre className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                {prompt}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
