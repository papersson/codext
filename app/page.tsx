'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DirectoryTree } from '@/components/DirectoryTree';
import { ControlPanel } from '@/components/ControlPanel';
import { useDirectoryState } from '@/hooks/useDirectoryState';
import { generateOutput } from '@/lib/xmlBuilder';

export default function Page() {
  const { toast } = useToast();
  
  // Keep track of what directories to ignore
  const [ignoreDirsInput, setIgnoreDirsInput] = useState<string>('node_modules, .*, _*, dist, build');

  // Store the generated output (XML or plain text)
  const [promptOutput, setPromptOutput] = useState<string>('');

  // Also store the token estimate separately
  const [tokenEstimate, setTokenEstimate] = useState<number>(0);
  
  // Toggle for XML format
  const [useXmlFormat, setUseXmlFormat] = useState<boolean>(false);

  // Get token recommendation based on count
  const getTokenRecommendation = (tokenCount: number): string => {
    if (tokenCount < 5000) return "Low";
    if (tokenCount < 15000) return "Medium";
    return "High";
  };

  // State/logic for directory management
  const {
    rootDirectoryHandle,
    directoryHandles,
    directoryData,
    expandedDirectories,
    selectedFiles,
    pickDirectory,
    toggleDirectory,
    toggleFileSelection,
    refreshDirectory,
    toggleDirectorySelection,
    isBatchUpdating,
  } = useDirectoryState();

  // Utility to copy text to clipboard (fallback for older browsers)
  const copyToClipboard = async (text: string) => {
    if (!navigator.clipboard) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        textArea.remove();
        toast({
          title: 'Copied!',
          description: 'Prompt copied to clipboard',
          duration: 2000
        });
      } catch (err) {
        textArea.remove();
        toast({
          title: 'Error',
          description: 'Failed to copy to clipboard. Please try selecting and copying manually.',
          variant: 'destructive',
          duration: 2000
        });
      }
      return;
    }

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
        description: 'Failed to copy to clipboard. Please try selecting and copying manually.',
        variant: 'destructive',
        duration: 2000
      });
    }
  };

  // Trigger the generation of output and token estimate
  const handleGenerate = async () => {
    if (!rootDirectoryHandle) return;

    const ignoredDirs = new Set(
      ignoreDirsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );

    // Use the new generateOutput function with useXmlFormat parameter
    const { output, tokenEstimate } = await generateOutput(
      rootDirectoryHandle,
      selectedFiles,
      directoryHandles,
      ignoredDirs,
      useXmlFormat
    );

    // Store the output in promptOutput, token estimate in state
    setPromptOutput(output);
    setTokenEstimate(tokenEstimate);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Left panel: Directory selection and configuration */}
      <div className="flex flex-col w-1/3 h-full border-r border-border/60 p-5">
        <h1 className="text-xl font-bold mb-5 text-primary/90">Codext</h1>

        <ControlPanel
          ignoreDirsInput={ignoreDirsInput}
          onIgnoreDirsChange={setIgnoreDirsInput}
          useXmlFormat={useXmlFormat}
          onUseXmlFormatChange={setUseXmlFormat}
          onRefresh={refreshDirectory}
          onGenerate={handleGenerate}
          hasDirectory={!!rootDirectoryHandle}
          onPickDirectory={pickDirectory}
          isProcessing={isBatchUpdating}
        />

        <DirectoryTree
          directoryData={directoryData}
          expandedDirectories={expandedDirectories}
          selectedFiles={selectedFiles}
          onToggleDirectory={toggleDirectory}
          onToggleFileSelection={toggleFileSelection}
          onToggleDirectorySelection={(dirPath, selected) => {
            const ignoredDirs = new Set(
              ignoreDirsInput
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            );
            toggleDirectorySelection(dirPath, selected, ignoredDirs);
          }}
          isDisabled={isBatchUpdating}
        />
      </div>

      {/* Right panel: Output */}
      <div className="flex-1 h-full p-5">
        {promptOutput && (
          <>
            {/* Display token estimate, but keep it out of the copyable text */}
            <div className="mb-3 flex items-center gap-2">
              <div className="text-sm font-medium text-foreground/90">
                Estimated tokens: <span className="font-semibold">{tokenEstimate.toLocaleString()}</span>
              </div>
              <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                tokenEstimate >= 15000 
                ? 'bg-destructive/15 text-destructive' 
                : tokenEstimate >= 5000
                ? 'bg-yellow-500/15 text-yellow-600'
                : 'bg-green-500/15 text-green-600'
              }`}>
                {getTokenRecommendation(tokenEstimate)}
              </div>
            </div>

            <div className="h-full relative bg-muted/50 rounded-lg border border-border/60 shadow-md overflow-hidden">
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-muted/30 to-background/30 opacity-60" />
              <div className="relative h-full flex flex-col">
                <div className="flex justify-between items-center p-3 border-b border-border/40 bg-muted/70">
                  <div className="text-sm font-medium text-foreground/70">{useXmlFormat ? "XML Output" : "Output"}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(promptOutput)}
                    className="flex items-center gap-2 hover:bg-secondary/80 border-border/60"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </Button>
                </div>

                <div className="flex-1 min-h-0 p-4">
                  <ScrollArea className="h-full">
                    <pre className="text-sm text-foreground/90 font-mono leading-relaxed whitespace-pre-wrap break-all px-2">
                      {promptOutput}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
