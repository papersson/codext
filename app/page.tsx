'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DirectoryTree } from '@/components/DirectoryTree';
import { ControlPanel } from '@/components/ControlPanel';
import { useDirectoryState } from '@/hooks/useDirectoryState';
import { generateXmlOutput } from '@/lib/xmlBuilder';

export default function Page() {
  const { toast } = useToast();
  
  // Keep track of what directories to ignore
  const [ignoreDirsInput, setIgnoreDirsInput] = useState<string>('node_modules, .*, _*, dist, build');

  // Store the generated XML
  const [promptOutput, setPromptOutput] = useState<string>('');

  // Also store the token estimate separately
  const [tokenEstimate, setTokenEstimate] = useState<number>(0);

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

  // Trigger the generation of XML and token estimate
  const handleGenerate = async () => {
    if (!rootDirectoryHandle) return;

    const ignoredDirs = new Set(
      ignoreDirsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );

    // Destructure the returned { xml, tokenEstimate }
    const { xml, tokenEstimate } = await generateXmlOutput(
      rootDirectoryHandle,
      selectedFiles,
      directoryHandles,
      ignoredDirs
    );

    // Store the XML in promptOutput, token estimate in state
    setPromptOutput(xml);
    setTokenEstimate(tokenEstimate);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Left panel: Directory selection and configuration */}
      <div className="flex flex-col w-1/3 h-full border-r border-border p-4">
        <h1 className="text-base font-semibold mb-4">Codext</h1>

        <ControlPanel
          ignoreDirsInput={ignoreDirsInput}
          onIgnoreDirsChange={setIgnoreDirsInput}
          onRefresh={refreshDirectory}
          onGenerate={handleGenerate}
          hasDirectory={!!rootDirectoryHandle}
          onPickDirectory={pickDirectory}
        />

        <DirectoryTree
          directoryData={directoryData}
          expandedDirectories={expandedDirectories}
          selectedFiles={selectedFiles}
          onToggleDirectory={toggleDirectory}
          onToggleFileSelection={toggleFileSelection}
        />
      </div>

      {/* Right panel: Output */}
      <div className="flex-1 h-full p-4">
        {promptOutput && (
          <>
            {/* Display token estimate, but keep it out of the copyable text */}
            <div className="mb-2 text-sm text-foreground">
              Estimated tokens: {tokenEstimate}
            </div>

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
          </>
        )}
      </div>
    </div>
  );
}
