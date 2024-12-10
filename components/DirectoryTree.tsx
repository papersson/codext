import { ChevronRight, ChevronDown, Folder as FolderIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
};

interface DirectoryData {
  entries: FileNode[];
  hasMore: boolean;
}

interface DirectoryTreeProps {
  directoryData: Record<string, DirectoryData>;
  expandedDirectories: Set<string>;
  selectedFiles: Set<string>;
  onToggleDirectory: (dirPath: string) => void;
  onToggleFileSelection: (filePath: string) => void;
}

export function DirectoryTree({
  directoryData,
  expandedDirectories,
  selectedFiles,
  onToggleDirectory,
  onToggleFileSelection,
}: DirectoryTreeProps) {
  function renderDirectory(dirPath: string, visitedPaths = new Set<string>()): JSX.Element | null {
    if (visitedPaths.has(dirPath)) {
      return (
        <div className="text-sm text-muted-foreground italic px-2 py-1">
          Cyclic directory reference detected
        </div>
      );
    }

    const dir = directoryData[dirPath];
    if (!dir) return null;

    visitedPaths.add(dirPath);

    return (
      <ul className="space-y-1">
        {dir.entries.map((node) => {
          if (node.type === 'directory') {
            const isOpen = expandedDirectories.has(node.path);
            return (
              <li key={node.path} className="text-sm">
                <div
                  className="flex items-center space-x-1 cursor-pointer rounded px-1 py-0.5 hover:bg-secondary transition-colors"
                  onClick={() => onToggleDirectory(node.path)}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-foreground" />
                  )}
                  <FolderIcon className="h-4 w-4 text-foreground" />
                  <span className="font-medium text-foreground">{node.name}</span>
                </div>
                {isOpen && <div className="pl-5">{renderDirectory(node.path, new Set(visitedPaths))}</div>}
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
                onCheckedChange={() => onToggleFileSelection(node.path)}
              />
              <span className="text-foreground/90">{node.name}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      {renderDirectory('.')}
    </ScrollArea>
  );
} 