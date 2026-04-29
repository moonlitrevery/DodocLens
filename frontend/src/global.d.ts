export {};

declare global {
  interface Window {
    dodoclens?: { platform: string };
    electronAPI?: {
      selectFolder: () => Promise<string[] | null>;
    };
  }
}
