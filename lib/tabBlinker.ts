

"use client";

class TabNotifier {
  private static instance: TabNotifier;
  private titleBlinkInterval: NodeJS.Timeout | null = null;
  private faviconBlinkInterval: NodeJS.Timeout | null = null;
  private originalTitle: string = "Chat App";
  private readonly originalFavicon: string = "/favicon.ico";
  private readonly emojiList = ["🔴", "💬", "📨", "🔔", "👥"];
  private readonly colorList = [
    "#FF5252",
    "#4CAF50",
    "#2196F3",
    "#FFC107",
    "#9C27B0",
  ];
  private isAnotherTabOpen = false;
  private readonly storageKey = "chatAppActiveTab";
  private readonly focusRequestKey = "chatAppFocusRequest";

  private constructor() {
    if (typeof document !== "undefined") {
      this.originalTitle = document.title || "Chat App";
    }
    this.setupTabTracking();
  }

  public static getInstance(): TabNotifier {
    if (!TabNotifier.instance) {
      TabNotifier.instance = new TabNotifier();
    }
    return TabNotifier.instance;
  }

  private setupTabTracking() {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }

    // Mark this tab as active
    localStorage.setItem(this.storageKey, "true");

    // Clean up when tab closes
    window.addEventListener("beforeunload", () => {
      localStorage.removeItem(this.storageKey);
    });

    // Listen for focus requests from other tabs
    window.addEventListener("storage", (event) => {
      if (event.key === this.focusRequestKey) {
        this.stopNotification();
      }
    });

    // Stop blinking when user comes back to tab
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.stopNotification();
      }
    });
  }

  public checkOtherTabs(): boolean {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return false;
    }
    this.isAnotherTabOpen = localStorage.getItem(this.storageKey) === "true";
    return this.isAnotherTabOpen;
  }

  public startNotification(message: string = "New Message!") {
    if (typeof document === "undefined" || document.visibilityState === "visible") {
      return;
    }

    this.stopNotification();

    // Title blinking
    let titleToggle = false;
    this.titleBlinkInterval = setInterval(() => {
      document.title = titleToggle
        ? `${this.emojiList[0]} ${message}`
        : this.originalTitle;
      titleToggle = !titleToggle;
    }, 1000);

    // Favicon and color blinking
    let index = 0;
    this.faviconBlinkInterval = setInterval(() => {
      this.setFavicon(this.emojiList[index % this.emojiList.length]);
      this.setThemeColor(this.colorList[index % this.colorList.length]);
      index++;
    }, 800);
  }

  public stopNotification() {
    if (this.titleBlinkInterval) {
      clearInterval(this.titleBlinkInterval);
      this.titleBlinkInterval = null;
      if (typeof document !== "undefined") {
        document.title = this.originalTitle;
      }
    }

    if (this.faviconBlinkInterval) {
      clearInterval(this.faviconBlinkInterval);
      this.faviconBlinkInterval = null;
      this.setFavicon(this.originalFavicon);
      this.setThemeColor("#ffffff");
    }
  }

  public focusOrOpenApp(url: string = "/") {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }

    if (this.checkOtherTabs()) {
      // Request focus in other tab
      localStorage.setItem(this.focusRequestKey, Date.now().toString());
      localStorage.removeItem(this.focusRequestKey);
    } else {
      // Open new tab if no instances exist
      window.open(url, "_blank");
    }
  }

  private setFavicon(emojiOrUrl: string) {
    if (typeof document === "undefined") return;

    const link =
      (document.querySelector("link[rel~='icon']") as HTMLLinkElement) ||
      (document.createElement("link") as HTMLLinkElement);
    link.rel = "icon";

    if (emojiOrUrl.startsWith("http") || emojiOrUrl.startsWith("/")) {
      link.href = emojiOrUrl;
    } else {
      const favicon = this.createEmojiFavicon(emojiOrUrl);
      if (favicon) link.href = favicon;
    }

    document.head.appendChild(link);
  }

  private setThemeColor(color: string) {
    if (typeof document === "undefined") return;

    let meta = document.querySelector(
      "meta[name='theme-color']"
    ) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }

  private createEmojiFavicon(emoji: string): string {
    if (typeof document === "undefined") return "";

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.font = "48px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText(emoji, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL("image/png");
  }
}

export const tabNotifier = TabNotifier.getInstance();