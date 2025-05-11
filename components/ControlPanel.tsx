import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Wand2, FolderOpen, RefreshCw } from 'lucide-react';

interface ControlPanelProps {
  ignoreDirsInput: string;
  onIgnoreDirsChange: (value: string) => void;
  useXmlFormat: boolean;
  onUseXmlFormatChange: (value: boolean) => void;
  onRefresh: () => void;
  onGenerate: () => void;
  hasDirectory: boolean;
  onPickDirectory: () => void;
}

export function ControlPanel({
  ignoreDirsInput,
  onIgnoreDirsChange,
  useXmlFormat,
  onUseXmlFormatChange,
  onRefresh,
  onGenerate,
  hasDirectory,
  onPickDirectory,
}: ControlPanelProps) {
  return (
    <div className="flex flex-col space-y-4 mb-5 rounded-md">
      {!hasDirectory && (
        <Button 
          variant="default" 
          size="sm" 
          onClick={onPickDirectory}
          className="flex items-center gap-2 font-medium shadow-sm"
        >
          <FolderOpen className="h-4 w-4" />
          Select Workspace Folder
        </Button>
      )}
      {hasDirectory && (
        <>
          <div>
            <label htmlFor="ignore-input" className="block text-sm font-medium mb-2 text-foreground/90">
              Ignore directories (comma-separated):
            </label>
            <input
              id="ignore-input"
              type="text"
              value={ignoreDirsInput}
              onChange={(e) => onIgnoreDirsChange(e.target.value)}
              className="border border-border bg-background rounded-md px-3 py-1.5 text-sm w-full focus:border-primary/50 focus:ring-1 focus:ring-primary/50 focus:outline-none transition-colors"
              placeholder="e.g. node_modules, .*, _*, .git, dist, build"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="xml-format-checkbox"
              checked={useXmlFormat}
              onCheckedChange={onUseXmlFormatChange}
            />
            <label 
              htmlFor="xml-format-checkbox" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground/90 cursor-pointer"
            >
              Use XML format
            </label>
          </div>
          <div className="flex space-x-3 justify-end mt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="flex items-center gap-2 self-end border-border/70 hover:bg-secondary/80 transition-colors"
            >
              <RefreshCw className="h-4 w-4 text-primary/80" />
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onGenerate}
              className="flex items-center gap-2 self-end shadow-sm"
            >
              <Wand2 className="h-4 w-4" />
              Generate
            </Button>
          </div>
        </>
      )}
    </div>
  );
} 