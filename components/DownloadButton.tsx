

// DownloadButton.tsx
import React, { useEffect } from "react";

type Props = {
  url: string;
  filename?: string;
  className?: string;
  children?: React.ReactNode;
  /**
   * saveOptions controls filename behavior:
   * - appendTimestamp (default true): create unique files by appending timestamp
   * - appendCounter (default false): use per-session counter instead
   * - overwriteIfExists (default false): keep same filename (may overwrite on disk)
   */
  saveOptions?: SaveOptions;
};

type SaveOptions = {
  appendTimestamp?: boolean;
  appendCounter?: boolean;
  overwriteIfExists?: boolean;
};

function isBlobOrDataUrl(u: string) {
  return typeof u === "string" && (u.startsWith("blob:") || u.startsWith("data:"));
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
  }
  return btoa(binary);
}

const defaultSaveOptions: Required<SaveOptions> = {
  appendTimestamp: true,
  appendCounter: false,
  overwriteIfExists: false,
};

// per-session counter map (optional, used if appendCounter=true) 
const saveCounts = new Map<string, number>(); 

const normalizeName = (name: string) => name.replace(/\?.*$/, ""); // strip query
const getNameFromUrl = (url: string) => {
  try {
    return url.split("/").pop() || "file";
  } catch {
    return "file";
  }
};

const makeUniqueName = (base: string, opts: Required<SaveOptions>) => {
  if (opts.overwriteIfExists) return base;

  const dotIndex = base.lastIndexOf(".");
  const namePart = dotIndex >= 0 ? base.slice(0, dotIndex) : base;
  const extPart = dotIndex >= 0 ? base.slice(dotIndex) : "";

  if (opts.appendTimestamp) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-"); // safe filename
    return `${namePart} (${ts})${extPart}`;
  }

  if (opts.appendCounter) {
    const count = (saveCounts.get(base) || 0) + 1;
    saveCounts.set(base, count);
    return `${namePart} (${count})${extPart}`;
  }

  return base;
};

const notifyUser = (title: string, body: string) => {
  const api = (window as any).electronAPI;
  if (api && typeof api.notify === "function") {
    api.notify(title, body);
    return;
  }
  if ("Notification" in window) {
    try {
      new Notification(title, { body });
      return;
    } catch {
      // ignore
    }
  }
  alert(`${title}\n\n${body}`);
};

export default function DownloadButton({
  url,
  filename,
  className,
  children,
  saveOptions,
}: Props) {
  const isElectron =
    typeof window !== "undefined" && !!(window as any).electronAPI;

  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    let unsubP: (() => void) | null = null;
    let unsubD: (() => void) | null = null;

    if (api && typeof api.onDownloadProgress === "function") {
      unsubP = api.onDownloadProgress((data: any) => {
        console.log("download-progress", data);
      });
    }
    if (api && typeof api.onDownloadDone === "function") {
      unsubD = api.onDownloadDone((data: any) => {
        console.log("download-done", data);
      });
    }

    return () => {
      if (unsubP) unsubP();
      if (unsubD) unsubD();
    };
  }, [isElectron]);

  const options = { ...defaultSaveOptions, ...(saveOptions || {}) };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // determine base filename
    const baseName = filename || normalizeName(getNameFromUrl(url));
    const nameToUse = makeUniqueName(baseName, options);

    try {
      // If the URL is a blob/data URL, we can fetch it as usual
      // Use Electron path first if available
      if (isElectron) {
        const api = (window as any).electronAPI;
        try {
          const resp = await fetch(url);
          if (!resp.ok) {
            const msg = `Fetch failed: ${resp.status} ${resp.statusText}`;
            console.error(msg);
            notifyUser("Download failed", msg);
            return;
          }

          const arrayBuffer = await resp.arrayBuffer();
          const base64 = arrayBufferToBase64(arrayBuffer);

          if (api && typeof api.saveBlob === "function") {
            // expected signature: saveBlob({ name, bufferBase64 }) -> { success, filePath? }
            const res = await api.saveBlob({ name: nameToUse, bufferBase64: base64 });
            console.log("saveBlob result", res);
            if (res && res.success) {
              notifyUser("Download saved", `${nameToUse} saved to ${res.filePath || "your chosen location"}`);
            } else {
              const warnMsg = "saveBlob reported failure";
              console.warn(warnMsg, res);
              notifyUser("Save failed", warnMsg);
            }
            return;
          } else {
            console.warn("saveBlob not available; falling back to browser anchor");
            // fallthrough to browser fallback
          }
        } catch (err) {
          console.error("Electron fetch+save failed:", err);
          // fallthrough to browser fallback
        }
      }

      // Browser fallback (or if electron route failed)
      const resp2 = await fetch(url);
      if (!resp2.ok) {
        const msg = `Fetch failed: ${resp2.status} ${resp2.statusText}`;
        console.error(msg);
        notifyUser("Download failed", msg);
        return;
      }

      const blob = await resp2.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = nameToUse;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

      notifyUser("Download started", `${nameToUse} download started.`);
    } catch (err) {
      console.error("Save failed:", err);
      notifyUser("Save failed", String(err));
    }
  };

  return (
    <button onClick={handleClick} className={className}>
      {children || "Download"}
    </button>
  );
}
