import { ChevronRight, ChevronDown, FolderClosed, FolderOpen, FileText } from 'lucide-react';
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
  onToggleDirectorySelection: (dirPath: string, selected: boolean) => void;
}

export function DirectoryTree({
  directoryData,
  expandedDirectories,
  selectedFiles,
  onToggleDirectory,
  onToggleFileSelection,
  onToggleDirectorySelection,
}: DirectoryTreeProps) {
  function isDirectorySelected(dirPath: string): boolean | 'indeterminate' {
    const dir = directoryData[dirPath];
    if (!dir) return false;

    // Get only direct file children (no subdirectories)
    const directFilePaths = dir.entries
      .filter(entry => entry.type === 'file')
      .map(entry => entry.path);
    
    if (directFilePaths.length === 0) return false;

    // Count how many direct files in this directory are selected
    let selectedCount = 0;
    for (const filePath of directFilePaths) {
      if (selectedFiles.has(filePath)) {
        selectedCount++;
      }
    }

    if (selectedCount === 0) return false;
    if (selectedCount === directFilePaths.length) return true;
    return 'indeterminate';
  }

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
            const directoryCheckState = isDirectorySelected(node.path);
            
            return (
              <li key={node.path} className="text-sm">
                <div className="flex items-center rounded-md px-1.5 py-1 hover:bg-secondary/60 transition-all duration-200">
                  <div className="flex items-center w-6 justify-center">
                    <span 
                      className="cursor-pointer text-primary/70"
                      onClick={() => onToggleDirectory(node.path)}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                      )}
                    </span>
                  </div>
                  <div className="mr-2">
                    <Checkbox
                      ref={(el) => {
                        if (el) {
                          // @ts-ignore - indeterminate is a valid property but not typed
                          el.indeterminate = directoryCheckState === 'indeterminate';
                        }
                      }}
                      checked={directoryCheckState === true ? true : false}
                      onCheckedChange={(checked) => {
                        onToggleDirectorySelection(node.path, checked === true);
                        // Auto-expand folder when checked
                        if (checked === true && !isOpen) {
                          onToggleDirectory(node.path);
                        }
                      }}
                      className={directoryCheckState === 'indeterminate' ? 'data-[state=indeterminate]:bg-primary/50 data-[state=indeterminate]:border-primary' : ''}
                    />
                  </div>
                  <div 
                   className="flex items-center cursor-pointer flex-1"
                   onClick={() => onToggleDirectory(node.path)}
                 >
                   {isOpen ? (
                     <FolderOpen className="h-5 w-5 text-primary mr-2" />
                   ) : (
                     <FolderClosed className="h-5 w-5 text-primary mr-2" />
                   )}
                   <span className="font-semibold text-foreground/90">{node.name}</span>
                 </div>
                </div>
                {isOpen && <div className="pl-8 border-l border-border/30 ml-3 mt-1">{renderDirectory(node.path, new Set(visitedPaths))}</div>}
              </li>
            );
          }

          return (
            <li
              key={node.path}
              className="flex items-center text-sm rounded-md px-1.5 py-1 hover:bg-secondary/40 transition-all duration-200"
            >
              <div className="w-6"></div>
              <div className="mr-2">
                <Checkbox
                  checked={selectedFiles.has(node.path)}
                  onCheckedChange={() => onToggleFileSelection(node.path)}
                />
              </div>
              <div className="flex items-center flex-1">
                <FileText className="h-4 w-4 text-foreground/60 mr-2" />
                <span className="text-foreground/80 text-sm">{node.name}</span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-12rem)] rounded-md border border-border/40 bg-muted/30">
      <div className="px-2 py-1">
        {renderDirectory('.')}
      </div>
    </ScrollArea>
  );
} 