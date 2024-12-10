import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';

interface ControlPanelProps {
  ignoreDirsInput: string;
  onIgnoreDirsChange: (value: string) => void;
  onRefresh: () => void;
  onGenerate: () => void;
  hasDirectory: boolean;
  onPickDirectory: () => void;
}

export function ControlPanel({
  ignoreDirsInput,
  onIgnoreDirsChange,
  onRefresh,
  onGenerate,
  hasDirectory,
  onPickDirectory,
}: ControlPanelProps) {
  return (
    <div className="flex flex-col space-y-3 mb-4">
      {!hasDirectory && (
        <Button variant="default" size="sm" onClick={onPickDirectory}>
          Select Workspace Folder
        </Button>
      )}
      {hasDirectory && (
        <>
          <div>
            <label htmlFor="ignore-input" className="block text-sm font-medium mb-1">
              Ignore directories (comma-separated):
            </label>
            <input
              id="ignore-input"
              type="text"
              value={ignoreDirsInput}
              onChange={(e) => onIgnoreDirsChange(e.target.value)}
              className="border border-border rounded px-2 py-1 text-sm w-full"
              placeholder="e.g. node_modules, .git"
            />
          </div>
          <div className="flex space-x-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              className="flex items-center gap-2 self-end"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M4 2a1 1 0 000 2h1.257a8 8 0 0113.235 3.121.999.999 0 10.943-1.332A10 10 0 005.239 2H4zM16 18a1 1 0 000-2H14.74a8 8 0 01-13.36-2.979.999.999 0 10-.933 1.358A10 10 0 0014.761 18H16z"/>
              </svg>
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onGenerate}
              className="flex items-center gap-2 self-end"
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