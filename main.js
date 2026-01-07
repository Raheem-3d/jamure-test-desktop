
// main.js (defensive, debug-friendly)
const {
  app,
  BrowserWindow,
  Notification,
  ipcMain,
  Tray,
  Menu,
  dialog,
  clipboard,
  nativeImage,
  net,
  screen,
  shell
} = require("electron");

const path = require("path");
const fs = require("fs");
const { session } = require("electron");
const { autoUpdater } = require("electron-updater");

let mainWindow;
let tray = null;
let bounceId = null;
let isQuitting = false;
let splash = null; // ensure splash is declared
let updateInterval = null;

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

app.on("before-quit", async () => {
  try {
    const cookies = await session.defaultSession.cookies.get({});
    console.log("COOKIES BEFORE QUIT:", cookies);
  } catch (e) {
    console.error(e);
  }
});

// Global error handlers
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err && err.stack ? err.stack : err);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

// Ensure a single running instance; focus existing on second launch
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, argv, workingDirectory) => {
    // Someone tried to run a second instance, focus/restore existing window
    showMainWindow();
  });
}

function createSplash() {
  // Small frameless splash with a simple CSS spinner (data URL so no extra file)
  const splashHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Loading…</title>
        <style>
          html,body{height:100%;margin:0;display:flex;align-items:center;justify-content:center;background:#fff;font-family:system-ui;}
          .box{display:flex;flex-direction:column;align-items:center;gap:12px}
          .spinner{
            width:56px;height:56px;border-radius:50%;border:6px solid rgba(0,0,0,0.08);border-top-color:rgba(0,0,0,0.6);
            animation:spin 1s linear infinite;
          }
          @keyframes spin{to{transform:rotate(360deg)}}
          .text{font-size:13px;color:#333}
        </style>
      </head>
      <body>
        <div class="box">
          <div class="spinner" aria-hidden="true"></div>
          <div class="text">Loading application…</div>
        </div>
      </body>
    </html>
  `;
  splash = new BrowserWindow({
    width: 360,
    height: 220,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    center: true,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splash.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(splashHtml)
  );
}

function createWindow() {
  try {
    // first show splash
    createSplash();

    const preloadPath = path.join(__dirname, "preload.js");
    if (!fs.existsSync(preloadPath)) {
      console.warn(
        "preload.js not found at",
        preloadPath,
        "renderer preload will not be available"
      );
    }

    // create main window but keep it hidden (show: false)
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false, // important: hidden until loaded
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        webSecurity: false,
        partition: "persist:jamure",
      },
    });

    // Log cookies and localStorage after load (same as yours)
    mainWindow.webContents.on("did-finish-load", async () => {
      try {
        const cookies = await session
          .fromPartition("persist:jamure")
          .cookies.get({});
        console.log("cookies after load:", cookies);
        const ls = await mainWindow.webContents.executeJavaScript(
          "JSON.stringify(localStorage)"
        );
        console.log("localStorage after load:", ls);
      } catch (e) {
        console.error(e);
      }

      // Close splash and show main window
      try {
        if (splash && !splash.isDestroyed()) {
          splash.close();
          splash = null;
        }
      } catch (err) {
        console.warn("could not close splash:", err);
      }

      // now show the main window
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        mainWindow.show();
      }
    });

    // handle failed loads (network error etc)
    mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        console.error(
          "did-fail-load:",
          errorCode,
          errorDescription,
          validatedURL,
          isMainFrame
        );
        // you can show an error page in mainWindow, or keep splash and show a message
        // simplest: show mainWindow so user can see devtools/errors
        if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
        if (splash && !splash.isDestroyed()) {
          splash.close();
          splash = null;
        }
      }
    );

    // optional: open devtools in dev mode
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }

    const urlToLoad = process.env.APP_URL;
    console.log("loading URL:", urlToLoad);
    mainWindow.loadURL(urlToLoad).catch((err) => {
      console.error("loadURL rejected:", err);
      // show window so you can see errors
      if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
      if (splash && !splash.isDestroyed()) {
        splash.close();
        splash = null;
      }
    });

    // Window focus/blur handlers
    mainWindow.on("focus", () => {
      console.log("mainWindow focused");
      stopAttention();
    });

    mainWindow.on("blur", () => {
      console.log("mainWindow blurred");
    });

    // Prefer normal minimize (keep in taskbar). If you want close-to-tray only, keep close handler below.
    mainWindow.on("minimize", () => {
      try {
        // Ensure it remains in the taskbar
        mainWindow.setSkipTaskbar(false);
      } catch (err) {
        console.warn("minimize handler error:", err);
      }
    });

    // Close-to-tray: comment out to actually quit on close, or keep to hide-to-tray
    mainWindow.on("close", (e) => {
      if (!isQuitting) {
        e.preventDefault();
        try {
          // Keep visible in taskbar instead of hiding completely
          mainWindow.minimize();
          mainWindow.setSkipTaskbar(false);
        } catch (err) {
          console.warn("close handler error:", err);
        }
      }
    });

    mainWindow.on("closed", () => {
      console.log("mainWindow closed");
      mainWindow = null;
    });
  } catch (e) {
    console.error("createWindow failed:", e && e.stack ? e.stack : e);
    if (splash && !splash.isDestroyed()) {
      splash.close();
      splash = null;
    }
  }
}

function createTray() {
  log("createTray called");
  try {
    const iconPath = path.join(__dirname, "public", "Desktopicon.ico");

    if (!fs.existsSync(iconPath)) {
      console.warn(
        "Tray icon not found at",
        iconPath,
        "- skipping tray creation to avoid crashes"
      );
      return;
    }

    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
      { label: "Open App", click: () => showMainWindow() },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setToolTip("Jamure App");
    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => showMainWindow());
    tray.on("click", () => showMainWindow());
  } catch (e) {
    // don't let tray errors kill the app
    console.error(
      "createTray failed (continuing without tray):",
      e && e.stack ? e.stack : e
    );
  }
}

function showMainWindow() {
  log("showMainWindow called");
  try {
    if (!mainWindow) {
      createWindow(true);
    } else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      
      // Enable resizing again when returning to normal mode
      mainWindow.setResizable(true);
      mainWindow.setMaximizable(true);
      
      // Restore to original size (not buzz size)
      mainWindow.setSize(1200, 800, true);
      mainWindow.center(); // Optional: center the window
      
      // Reset minimum size
      mainWindow.setMinimumSize(400, 300);
      
      // Ensure it appears in the taskbar again
      try { mainWindow.setSkipTaskbar(false); } catch { }
      mainWindow.focus();
    }
    stopAttention();
  } catch (e) {
    console.error("showMainWindow error:", e && e.stack ? e.stack : e);
  }
}
// Restore or show and optionally flash if not focused
function restoreOrRevealWindow() {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    try { mainWindow.setSkipTaskbar(false); } catch { }
  } catch (e) {
    console.warn("restoreOrRevealWindow error", e);
  }
}

function startAttention() {
  log("startAttention");
  if (process.platform === "darwin") {
    try {
      bounceId = app.dock && app.dock.bounce && app.dock.bounce();
    } catch (e) {
      console.warn("dock.bounce failed", e);
    }
  } else {
    if (mainWindow) {
      try {
        mainWindow.flashFrame(true);
      } catch (e) {
        console.warn(e);
      }
    } else {
      createWindow(false);
      if (mainWindow) {
        try {
          mainWindow.flashFrame(true);
        } catch (e) {
          console.warn(e);
        }
      }
    }
  }
}

function stopAttention() {
  log("stopAttention");
  if (process.platform === "darwin") {
    try {
      if (bounceId !== null) {
        app.dock.cancelBounce(bounceId);
        bounceId = null;
      }
    } catch (e) {
      console.warn(e);
    }
  } else {
    if (mainWindow) {
      try {
        mainWindow.flashFrame(false);
      } catch (e) {
        console.warn(e);
      }
    }
  }
}

ipcMain.on("show-notification", (event, { title, body, icon, senderName, messagePreview, messageId, channelId, userId }) => {
  log("ipc show-notification", title, "from", senderName);
  
  // Build notification title and body
  const notifTitle = senderName ? `New message from ${senderName}` : (title || "New Message");
  const notifBody = messagePreview || body || "";
  
  const notif = new Notification({
    title: notifTitle,
    body: notifBody,
    icon: icon || path.join(__dirname, "public", "Desktopicon.ico"),
    badge: path.join(__dirname, "public", "Desktopicon.ico"),
    requireInteraction: true, // Keep notification persistent
    tag: messageId || "message", // Group notifications by message ID
  });
  
  notif.on("click", () => {
    showMainWindow();
    // Navigate to the appropriate conversation
    if (mainWindow && mainWindow.webContents) {
      if (channelId) {
        mainWindow.webContents.send("navigate-to", `/dashboard/channels/${channelId}`);
      } else if (userId) {
        mainWindow.webContents.send("navigate-to", `/dashboard/messages/${userId}`);
      }
    }
  });
  
  notif.show();

  const needsAttention = !mainWindow || !mainWindow.isVisible() || !mainWindow.isFocused();
  if (needsAttention) startAttention();
});

// Show a simple notification for buzz
function showBuzzNotification({ title, body, icon, userId, channelId } = {}) {
  try {
    const notif = new Notification({
      title: title || "Buzz!",
      body: body || "You have a new message",
      icon: icon || path.join(__dirname, "public", "Desktopicon.ico"),
    });
    
    notif.on("click", () => {
      showMainWindow();
      // Send IPC to show overlay when notification is clicked
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('buzz:show-overlay', {
          userId: userId || null,
          channelId: channelId || null,
          title: title || 'Chat',
          width: 380,
          height: 600,
          margin: 20
        });
      }
    });
    
    notif.show();
  } catch (e) {
    console.error("showBuzzNotification error:", e);
  }
}



function showBuzzChatOverlay({ userId, channelId, title, messageType, id } = {}) {
  try {
    // Get screen dimensions for positioning
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    const chatWidth = 600;
    const chatHeight = 900;
    const margin = 40;
    
    // Calculate position for bottom-right corner
    const x = screenWidth - chatWidth - margin;
    const y = screenHeight - chatHeight - margin;

    // Store current window state for restoration later
    let wasMaximized = false;
    let previousBounds = null;

    // Build the appropriate URL based on message type
    let buzzUrl = process.env.APP_URL;
    
    // Debug: log all parameters
    console.log("Buzz parameters:", { userId, channelId, title, messageType, id });
    
    // Priority: 1. Explicit channelId, 2. Explicit userId, 3. Generic id with type detection
    if (channelId) {
      // Channel message - use channels endpoint
      buzzUrl += `/dashboard/channels/${channelId}`;
      console.log("Using channelId for URL:", channelId);
    } else if (userId) {
      // Direct message - use messages endpoint
      buzzUrl += `/dashboard/messages/${userId}`;
      console.log("Using userId for URL:", userId);
    } else if (id) {
      // If only id is provided, try to detect type
      // You can add logic here to detect if id is a channel or user ID
      // For example, based on prefix or pattern
      if (id.startsWith('ch_') || id.includes('channel') || messageType === 'channel') {
        buzzUrl += `/dashboard/channels/${id}`;
        console.log("Detected channel from id:", id);
      } else {
        buzzUrl += `/dashboard/messages/${id}`;
        console.log("Detected user from id:", id);
      }
    } else {
      // Default to dashboard if no specific ID
      buzzUrl += "/dashboard";
      console.log("No ID provided, using dashboard");
    }
    
    // Add popup parameter for the renderer to know it's a buzz overlay
    buzzUrl += "?popup=true&buzz=true";
    
    console.log("Loading buzz URL:", buzzUrl);

    // Ensure main window exists
    if (!mainWindow || mainWindow.isDestroyed()) {
      // Create new window with fixed size
      mainWindow = new BrowserWindow({
        width: chatWidth,
        height: chatHeight,
        x: x,
        y: y,
        show: false,
        resizable: true, // Allow resizing
        minimizable: true,
        maximizable: true, // Allow maximizing
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, "preload.js"),
          webSecurity: false,
          partition: "persist:jamure",
        },
      });
      
      // Load the appropriate URL
      mainWindow.loadURL(buzzUrl).catch((err) => {
        console.error("Buzz loadURL rejected:", err);
        // Fallback to dashboard if specific URL fails
        mainWindow.loadURL(`${process.env.APP_URL}/dashboard?popup=true&buzz=true`);
      });
      
      mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        // Send overlay data after window is ready
        setTimeout(() => {
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('buzz:show-overlay', {
              userId: userId || null,
              channelId: channelId || null,
              title: title || 'Chat',
              width: chatWidth,
              height: chatHeight,
              margin: margin,
              position: 'bottom-right',
              url: buzzUrl
            });
            mainWindow.webContents.send('play-buzz-sound');
          }
        }, 500);
      });
    } else {
      // Save current state before modifying
      wasMaximized = mainWindow.isMaximized();
      previousBounds = mainWindow.getBounds();
      
      // Store previous URL for navigation back
      if (!mainWindow.previousBuzzState) {
        mainWindow.previousBuzzState = {
          wasMaximized: wasMaximized,
          bounds: previousBounds,
          currentUrl: mainWindow.webContents.getURL() || `${process.env.APP_URL}`
        };
      }
      
      // If maximized, restore to normal first
      if (wasMaximized) {
        mainWindow.unmaximize();
        // Small delay to ensure window is restored
        setTimeout(() => {
          setBuzzSizeAndPosition(x, y, chatWidth, chatHeight);
          // Load the appropriate URL
          mainWindow.loadURL(buzzUrl).catch((err) => {
            console.error("Buzz loadURL rejected:", err);
            mainWindow.loadURL(`${process.env.APP_URL}/dashboard?popup=true&buzz=true`);
          });
        }, 50);
      } else {
        setBuzzSizeAndPosition(x, y, chatWidth, chatHeight);
        // Load the appropriate URL
        mainWindow.loadURL(buzzUrl).catch((err) => {
          console.error("Buzz loadURL rejected:", err);
          mainWindow.loadURL(`${process.env.APP_URL}/dashboard?popup=true&buzz=true`);
        });
      }
      
      console.log(`Buzz window resized to: ${chatWidth}x${chatHeight} at position: ${x},${y}, wasMaximized: ${wasMaximized}, URL: ${buzzUrl}`);
      
      // Send IPC to renderer to show the overlay
      if (mainWindow && mainWindow.webContents) {
        // Small delay to ensure window is properly resized and page loaded
        setTimeout(() => {
          mainWindow.webContents.send('buzz:show-overlay', {
            userId: userId || null,
            channelId: channelId || null,
            title: title || 'Chat',
            width: chatWidth,
            height: chatHeight,
            margin: margin,
            position: 'bottom-right',
            mode: 'buzz-chat',
            url: buzzUrl
          });
          
          // Also send play sound command
          mainWindow.webContents.send('play-buzz-sound');
        }, wasMaximized ? 300 : 200);
      }
    }
    
    // Request attention
    startAttention();
    
  } catch (err) {
    console.error('showBuzzChatOverlay error:', err);
  }
}


function setBuzzSizeAndPosition(x, y, width, height) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  // Show window if hidden
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  
  // Restore if minimized
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  
  // Step-by-step approach
  // 1. First set position
  mainWindow.setPosition(x, y);
  
  // 2. Then set size with animation
  mainWindow.setSize(width, height, true);
  
  // 3. Enable resizing for buzz mode (user can resize if they want)
  mainWindow.setResizable(true);
  
  // 4. Enable maximize button
  mainWindow.setMaximizable(true);
  
  // 5. Set minimum size to prevent it from being too small
  mainWindow.setMinimumSize(width, height);
  
  // 6. Focus the window
  mainWindow.focus();
}

// Update exitBuzzMode function to handle URL navigation back
function exitBuzzMode(restorePreviousState = true, navigateToPrevious = true) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Reset minimum size
      mainWindow.setMinimumSize(400, 300);
      
      // If we have stored previous state, restore it
      if (restorePreviousState && mainWindow.previousBuzzState) {
        const { wasMaximized, bounds, currentUrl } = mainWindow.previousBuzzState;
        
        // Restore to previous bounds
        mainWindow.setBounds(bounds);
        
        // Navigate back to previous URL if requested
        if (navigateToPrevious && currentUrl) {
          setTimeout(() => {
            mainWindow.loadURL(currentUrl).catch((err) => {
              console.error("Failed to load previous URL:", err);
              mainWindow.loadURL(`${process.env.APP_URL}/dashboard`);
            });
          }, 100);
        }
        
        // Maximize if it was maximized before
        if (wasMaximized) {
          setTimeout(() => {
            mainWindow.maximize();
          }, 150);
        }
        
        // Clear stored state
        delete mainWindow.previousBuzzState;
      } else {
        // Default restore to original size and dashboard
        mainWindow.setSize(1200, 800, true);
        mainWindow.center();
        
        // Navigate to dashboard
        setTimeout(() => {
          mainWindow.loadURL(`${process.env.APP_URL}/dashboard`);
        }, 100);
      }
      
      // Ensure window is visible
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      
      mainWindow.focus();
    }
  } catch (e) {
    console.error('exitBuzzMode error:', e);
  }
}


// Unified buzz handler: show embedded overlay in main window
function handleBuzz({ title = "Buzz", body = "You have an important message.", icon, userId, channelId } = {}) {
  try {
    const focused = mainWindow && mainWindow.isFocused && mainWindow.isFocused();

    // Always include sender's name in the buzz title if available
    let buzzTitle = title && title !== "Buzz" ? title : body;

    // Show notification (optional)
    showBuzzNotification({ title: buzzTitle, body, icon, userId, channelId });

    // Create embedded overlay in main window with fixed size
    showBuzzChatOverlay({ userId, channelId, title: buzzTitle });



    // Request attention if main window not focused
    if (!focused) {
      startAttention();
    }
  } catch (e) {
    console.error("handleBuzz error", e);
  }
}




// Allow buzz from renderer
ipcMain.on("buzz", (event, payload) => handleBuzz(payload || {}));

// Allow buzz from the app (e.g., background timers, sockets in main)
app.on("buzz", (payload) => handleBuzz(payload || {}));

function enableAutoLaunch() {
  log(
    "enableAutoLaunch called, packaged=",
    app.isPackaged,
    "execPath=",
    process.execPath
  );
  try {
    if (!app.isPackaged) {
      console.warn(
        "Skipping auto-launch in dev mode to avoid starting electron.exe at login."
      );
      return;
    }

    if (process.platform === "win32") {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: ["--background-start"],
      });
    } else {
      app.setLoginItemSettings({ openAtLogin: true });
    }
  } catch (e) {
    console.warn("enableAutoLaunch failed", e);
  }
}

ipcMain.handle("copy-text", (event, text) => {
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("copy-image", async (event, imageUrl) => {
  try {
    // Handle file:// URLs
    if (imageUrl.startsWith("file://")) {
      const image = nativeImage.createFromPath(imageUrl.replace("file://", ""));
      if (!image.isEmpty()) {
        clipboard.writeImage(image);
        return { success: true };
      }
    }

    // Handle http/https URLs and base64
    if (imageUrl.startsWith("http") || imageUrl.startsWith("data:")) {
      const response = await net.fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      const image = nativeImage.createFromBuffer(Buffer.from(buffer));

      if (!image.isEmpty()) {
        clipboard.writeImage(image);
        return { success: true };
      }
    }

    return { success: false, error: "Invalid image format" };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  log("app.whenReady start");
  const startedInBackground = process.argv.includes("--background-start");

  // On Windows, set AppUserModelId so notifications display with app identity
  if (process.platform === "win32") {
    try { app.setAppUserModelId("com.jamure.chatapp"); } catch { }
  }

  // create window and tray
  createWindow(startedInBackground ? false : true);
  createTray();
  enableAutoLaunch();

  if (!startedInBackground) {
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
  }

  // --------- AUTO-UPDATER START ---------
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  if (!isDev) {
    // Only run auto-update in production
    try {
      autoUpdater.autoDownload = false; // prompt before download

      // Forward updater events to renderer for optional UI
      const sendToRenderer = (channel, payload) => {
        try {
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send(channel, payload);
          }
        } catch { }
      };

      autoUpdater.on("checking-for-update", () => {
        log("Updater: checking-for-update");
        sendToRenderer("updater:checking", {});
      });
      autoUpdater.on("update-available", (info) => {
        log("Updater: update-available", info && info.version);
        sendToRenderer("updater:available", info);
        // Native prompt for download
        const result = dialog.showMessageBoxSync(mainWindow, {
          type: "info",
          buttons: ["Download", "Later"],
          title: "Update Available",
          message: `Version ${info.version} is available. Download now?`,
        });
        if (result === 0) autoUpdater.downloadUpdate();
      });
      autoUpdater.on("update-not-available", (info) => {
        log("Updater: update-not-available");
        sendToRenderer("updater:not-available", info);
      });
      autoUpdater.on("download-progress", (progress) => {
        sendToRenderer("updater:download-progress", progress);
      });
      autoUpdater.on("update-downloaded", (info) => {
        log("Updater: update-downloaded", info && info.version);
        sendToRenderer("updater:downloaded", info);
        const result = dialog.showMessageBoxSync(mainWindow, {
          type: "info",
          buttons: ["Install & Restart", "Later"],
          title: "Update Ready",
          message: `Version ${info.version} downloaded. Install now?`,
        });
        if (result === 0) autoUpdater.quitAndInstall();
      });
      autoUpdater.on("error", (err) => {
        log("Updater: error", err);
        sendToRenderer("updater:error", { message: String(err) });
      });

      // Initial check on startup
      autoUpdater.checkForUpdates();

      // Periodic checks (every 4 hours)
      updateInterval = setInterval(() => {
        try { autoUpdater.checkForUpdates(); } catch { }
      }, 4 * 60 * 60 * 1000);
    } catch (e) {
      log("Auto-updater setup failed:", e);
    }
  }
  // --------- AUTO-UPDATER END ---------

  // Attach will-download after ready (safer)
  try {
    session.defaultSession.on("will-download", (event, item, webContents) => {
      try {
        const url = item.getURL();
        const filename = item.getFilename();
        log("will-download", { url, filename });

        const savePath = path.join(app.getPath("downloads"), filename);
        item.setSavePath(savePath);

        try {
          webContents.send("download-started", { filename, url, savePath });
        } catch (e) { }

        item.on("updated", (e, state) => {
          if (state === "interrupted") {
            log("Download interrupted for", filename);
            try {
              webContents.send("download-progress", {
                filename,
                state: "interrupted",
              });
            } catch (e) { }
          } else if (state === "progressing") {
            if (item.isPaused()) {
              log("Download paused:", filename);
              try {
                webContents.send("download-progress", {
                  filename,
                  state: "paused",
                });
              } catch (e) { }
            } else {
              const received = item.getReceivedBytes();
              const total = item.getTotalBytes();
              try {
                webContents.send("download-progress", {
                  filename,
                  received,
                  total,
                });
              } catch (e) { }
            }
          }
        });

        item.once("done", (e, state) => {
          if (state === "completed") {
            log("Download completed:", savePath);
            try {
              webContents.send("download-done", {
                filename,
                savePath,
                success: true,
              });
            } catch (e) { }
          } else {
            log("Download failed:", state);
            try {
              webContents.send("download-done", {
                filename,
                savePath,
                success: false,
                state,
              });
            } catch (e) { }
          }
        });
      } catch (err) {
        console.error("Error in will-download handler", err);
      }
    });
  } catch (e) {
    console.error(
      "Failed to attach will-download:",
      e && e.stack ? e.stack : e
    );
  }

  log("app.whenReady done");
});

// simple ipc to trigger download
ipcMain.on("download-file", (event, { url, filename }) => {
  log("IPC download-file received", { url, filename });
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.downloadURL(url);
  } else {
    log("No mainWindow available to start download");
    try {
      event.sender.send("download-done", {
        filename,
        savePath: null,
        success: false,
        state: "no-main-window",
      });
    } catch (e) { }
  }
});

ipcMain.handle("save-blob", async (event, { name, bufferBase64 }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Save file",
      defaultPath: path.join(app.getPath("downloads"), name || "file"),
    });
    if (canceled || !filePath) return { success: false, reason: "canceled" };

    const buffer = Buffer.from(bufferBase64, "base64");
    fs.writeFileSync(filePath, buffer);
    console.log("save-blob: wrote file to", filePath);
    return { success: true, filePath };
  } catch (err) {
    console.error("save-blob failed", err);
    return { success: false, error: String(err) };
  }
});

ipcMain.on("renderer-ready", () => {
  if (splash && !splash.isDestroyed()) splash.close();
  if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
});

app.on("activate", () => {
  log("app activate");
  if (!mainWindow) createWindow(true);
  else showMainWindow();
});

// Consolidate before-quit handler
app.on("before-quit", () => {
  log("before-quit");
  isQuitting = true;
});

app.on("window-all-closed", () => {
  log("window-all-closed, isQuitting=", isQuitting);
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
  }
});

// -------- IPC: Updater controls from renderer --------
ipcMain.handle("updater:check", async () => {
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle("updater:download", async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle("updater:install", async () => {
  try {
    // quitAndInstall will not return
    autoUpdater.quitAndInstall();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});


// Add this to your IPC handlers section
ipcMain.on('buzz:close-overlay', () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Enable resizing again
      mainWindow.setResizable(true);
      mainWindow.setMaximizable(true);
      
      // Restore to original size
      mainWindow.setSize(1200, 800, true);
      mainWindow.center();
      
      // Reset minimum size
      mainWindow.setMinimumSize(400, 300);
    }
  } catch (e) {
    console.error('buzz:close-overlay error:', e);
  }
});
ipcMain.handle('open-external-link', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});