// Dialog Manager - handles multiple windows, tabs, minimizing, and popups
export const DialogManager = {
  windows: new Map(),
  activeWindowId: null,
  minimizedDock: null,

  init() {
    addDialogStyles();
    this.createMinimizedDock();
    this.setupWindowResizeListener();
  },

  createMinimizedDock() {
    if (this.minimizedDock) return;

    this.minimizedDock = document.createElement("div");
    this.minimizedDock.className = "theme-minimized-dock";
    this.minimizedDock.style.display = "none";
    document.body.appendChild(this.minimizedDock);
  },

  setupWindowResizeListener() {
    if (this.resizeListenerAdded) return;
    this.resizeListenerAdded = true;

    window.addEventListener("resize", () => {
      const container = document.querySelector(".theme-dialog-container");
      if (container && container.style.display !== "none") {
        this.constrainToViewport(container);
      }
    });
  },

  createWindow({ id, title, content, onInit }) {
    if (!this.minimizedDock) this.init();

    const windowData = {
      id,
      title,
      content,
      onInit,
      element: null,
      popupWindow: null,
      isMinimized: false,
      isInPopup: false,
      tabElement: null,
    };

    this.windows.set(id, windowData);
    this.renderWindow(windowData);
    this.focusWindow(id);

    return windowData;
  },

  renderWindow(windowData) {
    const container = this.getOrCreateContainer();

    // Create or update tab
    this.createTab(windowData, container);

    // Create window content if it doesn't exist
    if (!windowData.element) {
      windowData.element = this.createWindowElement(windowData);
      container
        .querySelector(".theme-dialog-tabs-content")
        .appendChild(windowData.element);

      if (windowData.onInit) {
        setTimeout(() => windowData.onInit(windowData.element), 0);
      }
    }

    this.updateTabVisibility(container);
  },

  createWindowElement(windowData) {
    const windowEl = document.createElement("div");
    windowEl.className = "theme-window-content";
    windowEl.dataset.windowId = windowData.id;
    windowEl.innerHTML = windowData.content;
    return windowEl;
  },

  getOrCreateContainer() {
    let container = document.querySelector(".theme-dialog-container");

    if (!container) {
      container = document.createElement("div");
      container.className = "theme-dialog-container";
      container.innerHTML = `
        <div class="theme-dialog-header">
          <div class="theme-dialog-tabs"></div>
          <div class="theme-dialog-controls">
            <button class="theme-dialog-btn popup-btn" title="Open in popup">⧉</button>
            <button class="theme-dialog-btn minimize-btn" title="Minimize">_</button>
            <button class="theme-dialog-btn close-btn" title="Close">×</button>
          </div>
        </div>
        <div class="theme-dialog-tabs-content"></div>
      `;

      document.body.appendChild(container);

      // Center the container initially
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      container.style.left = Math.max(0, (viewportWidth - 600) / 2) + "px";
      container.style.top = Math.max(0, (viewportHeight - 400) / 2) + "px";

      // Setup controls
      container.querySelector(".close-btn").addEventListener("click", () => {
        this.closeActiveWindow();
      });

      container.querySelector(".minimize-btn").addEventListener("click", () => {
        this.minimizeContainer();
      });

      container.querySelector(".popup-btn").addEventListener("click", () => {
        this.openActiveInPopup();
      });

      this.makeDraggable(container);
      this.makeResizable(container);
    }

    return container;
  },

  createTab(windowData, container) {
    if (windowData.tabElement) return;

    const tab = document.createElement("div");
    tab.className = "theme-dialog-tab";
    tab.dataset.windowId = windowData.id;
    tab.innerHTML = `<span>${windowData.title}</span><button class="tab-close">×</button>`;

    tab.querySelector(".tab-close").addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeWindow(windowData.id);
    });

    tab.addEventListener("click", () => {
      this.focusWindow(windowData.id);
    });

    windowData.tabElement = tab;
    container.querySelector(".theme-dialog-tabs").appendChild(tab);
  },

  updateTabVisibility(container) {
    const tabs = container.querySelectorAll(".theme-dialog-tab");
    const contents = container.querySelectorAll(".theme-window-content");

    tabs.forEach((tab) => {
      const windowId = tab.dataset.windowId;
      const isActive = windowId === this.activeWindowId;
      tab.classList.toggle("active", isActive);
    });

    contents.forEach((content) => {
      const windowId = content.dataset.windowId;
      const isActive = windowId === this.activeWindowId;
      content.style.display = isActive ? "block" : "none";
    });

    // Show/hide tabs bar if only one tab
    const tabsBar = container.querySelector(".theme-dialog-tabs");
    tabsBar.style.display = tabs.length > 1 ? "flex" : "none";
  },

  focusWindow(id) {
    this.activeWindowId = id;
    const container = document.querySelector(".theme-dialog-container");
    if (container) {
      this.updateTabVisibility(container);
    }
  },

  getWindow(id) {
    return this.windows.get(id);
  },

  closeWindow(id) {
    const windowData = this.windows.get(id);
    if (!windowData) return;

    if (windowData.popupWindow && !windowData.popupWindow.closed) {
      windowData.popupWindow.close();
    }

    if (windowData.tabElement) {
      windowData.tabElement.remove();
    }

    if (windowData.element) {
      windowData.element.remove();
    }

    this.windows.delete(id);

    // Update active window
    if (this.activeWindowId === id) {
      const remainingIds = Array.from(this.windows.keys());
      this.activeWindowId = remainingIds.length > 0 ? remainingIds[0] : null;
    }

    // Remove container if no windows left
    const container = document.querySelector(".theme-dialog-container");
    if (container && this.windows.size === 0) {
      container.remove();
    } else if (container) {
      this.updateTabVisibility(container);
    }

    this.updateMinimizedDock();
  },

  closeActiveWindow() {
    if (this.activeWindowId) {
      this.closeWindow(this.activeWindowId);
    }
  },

  minimizeContainer() {
    const container = document.querySelector(".theme-dialog-container");
    if (!container) return;

    container.style.display = "none";

    // Mark all windows as minimized and create dock items
    this.windows.forEach((windowData) => {
      windowData.isMinimized = true;
    });

    this.updateMinimizedDock();
  },

  restoreWindow(id) {
    const container = document.querySelector(".theme-dialog-container");
    if (container) {
      container.style.display = "flex";
    }

    this.windows.forEach((windowData) => {
      windowData.isMinimized = false;
    });

    this.focusWindow(id);
    this.updateMinimizedDock();
  },

  updateMinimizedDock() {
    if (!this.minimizedDock) return;

    this.minimizedDock.innerHTML = "";

    const minimizedWindows = Array.from(this.windows.values()).filter(
      (w) => w.isMinimized
    );

    if (minimizedWindows.length === 0) {
      this.minimizedDock.style.display = "none";
      return;
    }

    this.minimizedDock.style.display = "flex";

    minimizedWindows.forEach((windowData) => {
      const dockItem = document.createElement("div");
      dockItem.className = "theme-dock-item";
      dockItem.textContent = windowData.title;
      dockItem.addEventListener("click", () => {
        this.restoreWindow(windowData.id);
      });

      this.minimizedDock.appendChild(dockItem);
    });
  },

  openActiveInPopup() {
    if (!this.activeWindowId) return;

    const windowData = this.windows.get(this.activeWindowId);
    if (!windowData || windowData.isInPopup) return;

    const popup = window.open(
      "",
      `theme-window-${windowData.id}`,
      "width=800,height=600,menubar=no,toolbar=no,location=no,status=no"
    );

    if (!popup) {
      alert("Popup blocked! Please allow popups for this site.");
      return;
    }

    // Setup popup document
    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${windowData.title}</title>
        <style>
          body { margin: 0; padding: 20px; font-family: system-ui; background: #2a2a2a; color: #fff; }
        </style>
      </head>
      <body></body>
      </html>
    `);

    // Move content to popup
    popup.document.body.appendChild(windowData.element.cloneNode(true));

    windowData.popupWindow = popup;
    windowData.isInPopup = true;

    // Hide the tab completely
    if (windowData.tabElement) {
      windowData.tabElement.style.display = "none";
    }
    if (windowData.element) {
      windowData.element.style.display = "none";
    }

    // Check if there are any remaining visible windows
    const container = document.querySelector(".theme-dialog-container");
    if (container) {
      const hasVisibleWindows = Array.from(this.windows.values()).some(
        (w) => !w.isInPopup && !w.isMinimized
      );

      if (!hasVisibleWindows) {
        // Hide the container if all windows are popped out or minimized
        container.style.display = "none";
      } else {
        // Switch to another visible window
        const visibleWindow = Array.from(this.windows.values()).find(
          (w) => !w.isInPopup && !w.isMinimized
        );
        if (visibleWindow) {
          this.focusWindow(visibleWindow.id);
        }
      }
    }

    // Watch for popup close
    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed);
        this.returnFromPopup(windowData.id);
      }
    }, 500);
  },

  returnFromPopup(id) {
    const windowData = this.windows.get(id);
    if (!windowData) return;

    windowData.isInPopup = false;
    windowData.popupWindow = null;

    // Show the tab again
    if (windowData.tabElement) {
      windowData.tabElement.style.display = "";
    }

    if (windowData.element) {
      windowData.element.style.display =
        this.activeWindowId === id ? "block" : "none";
    }

    // Show the container again
    const container = document.querySelector(".theme-dialog-container");
    if (container) {
      container.style.display = "flex";
    }

    this.focusWindow(id);
  },

  makeDraggable(container) {
    const header = container.querySelector(".theme-dialog-header");
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    const onMouseDown = (e) => {
      if (
        e.target.closest(".theme-dialog-controls") ||
        e.target.closest(".theme-dialog-tab")
      )
        return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = container.offsetLeft;
      startTop = container.offsetTop;

      header.style.cursor = "grabbing";
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;

      // Constrain to viewport
      const minVisible = 50; // Minimum pixels that must remain visible
      const maxLeft = window.innerWidth - minVisible;
      const maxTop = window.innerHeight - minVisible;
      const minLeft = -container.offsetWidth + minVisible;
      const minTop = 0;

      newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
      newTop = Math.max(minTop, Math.min(newTop, maxTop));

      container.style.left = newLeft + "px";
      container.style.top = newTop + "px";
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = "grab";
        this.constrainToViewport(container);
      }
    };

    header.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    header.style.cursor = "grab";
  },

  makeResizable(container) {
    let isResizing = false;
    let resizeDirection = null;
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    const minWidth = 300;
    const minHeight = 200;

    // Create resize handles for all edges and corners
    const resizeHandles = {
      top: this.createResizeHandle("top"),
      right: this.createResizeHandle("right"),
      bottom: this.createResizeHandle("bottom"),
      left: this.createResizeHandle("left"),
      "top-left": this.createResizeHandle("top-left"),
      "top-right": this.createResizeHandle("top-right"),
      "bottom-left": this.createResizeHandle("bottom-left"),
      "bottom-right": this.createResizeHandle("bottom-right"),
    };

    // Append all handles to container
    Object.values(resizeHandles).forEach((handle) =>
      container.appendChild(handle)
    );

    const onMouseDown = (e, direction) => {
      isResizing = true;
      resizeDirection = direction;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = container.offsetWidth;
      startHeight = container.offsetHeight;
      startLeft = container.offsetLeft;
      startTop = container.offsetTop;
      e.preventDefault();
      e.stopPropagation();
    };

    const onMouseMove = (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const edgeMargin = 50; // Keep this much space visible for dragging

      // Handle horizontal resizing
      if (resizeDirection.includes("right")) {
        let newWidth = Math.max(minWidth, startWidth + deltaX);

        // Constrain so right edge of window doesn't go past left edge of viewport
        // Right edge position = startLeft + newWidth
        // Keep at least edgeMargin visible
        const minRightEdge = edgeMargin;
        if (startLeft + newWidth < minRightEdge) {
          newWidth = minRightEdge - startLeft;
        }

        container.style.width = newWidth + "px";
      } else if (resizeDirection.includes("left")) {
        let newWidth = Math.max(minWidth, startWidth - deltaX);
        const widthDiff = startWidth - newWidth;
        let newLeft = startLeft + widthDiff;

        // Constrain so left edge of window doesn't go past right edge of viewport
        // Left edge position = newLeft
        // Keep at least edgeMargin visible
        const maxLeftEdge = window.innerWidth - edgeMargin;
        if (newLeft > maxLeftEdge) {
          newLeft = maxLeftEdge;
          newWidth = startLeft + startWidth - maxLeftEdge;
        }

        container.style.width = newWidth + "px";
        container.style.left = newLeft + "px";
      }

      // Handle vertical resizing
      if (resizeDirection.includes("bottom")) {
        let newHeight = Math.max(minHeight, startHeight + deltaY);

        // Constrain so bottom edge of window doesn't go past top edge of viewport
        // Bottom edge position = startTop + newHeight
        // Keep at least edgeMargin visible
        const minBottomEdge = edgeMargin;
        if (startTop + newHeight < minBottomEdge) {
          newHeight = minBottomEdge - startTop;
        }

        container.style.height = newHeight + "px";
      } else if (resizeDirection.includes("top")) {
        let newHeight = Math.max(minHeight, startHeight - deltaY);
        const heightDiff = startHeight - newHeight;
        let newTop = startTop + heightDiff;

        // Constrain so top edge of window doesn't go past bottom edge of viewport
        // Top edge position = newTop
        // Keep at least edgeMargin visible
        const maxTopEdge = window.innerHeight - edgeMargin;
        if (newTop > maxTopEdge) {
          newTop = maxTopEdge;
          newHeight = startTop + startHeight - maxTopEdge;
        }

        container.style.height = newHeight + "px";
        container.style.top = newTop + "px";
      }
    };

    const onMouseUp = () => {
      if (isResizing) {
        this.constrainToViewport(container);
      }
      isResizing = false;
      resizeDirection = null;
    };

    // Attach event listeners to all handles
    Object.entries(resizeHandles).forEach(([direction, handle]) => {
      handle.addEventListener("mousedown", (e) => onMouseDown(e, direction));
    });

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  },

  createResizeHandle(direction) {
    const handle = document.createElement("div");
    handle.className = `theme-dialog-resize-handle resize-${direction}`;
    return handle;
  },

  constrainToViewport(container) {
    const minVisible = 50; // Minimum pixels that must remain visible
    const rect = container.getBoundingClientRect();

    let newLeft = container.offsetLeft;
    let newTop = container.offsetTop;
    let needsUpdate = false;

    // Check right edge
    if (rect.left > window.innerWidth - minVisible) {
      newLeft = window.innerWidth - minVisible;
      needsUpdate = true;
    }

    // Check left edge
    if (rect.right < minVisible) {
      newLeft = minVisible - container.offsetWidth;
      needsUpdate = true;
    }

    // Check bottom edge
    if (rect.top > window.innerHeight - minVisible) {
      newTop = window.innerHeight - minVisible;
      needsUpdate = true;
    }

    // Check top edge (never go above 0)
    if (rect.top < 0) {
      newTop = 0;
      needsUpdate = true;
    }

    if (needsUpdate) {
      container.style.left = newLeft + "px";
      container.style.top = newTop + "px";
    }
  },
};

function addDialogStyles() {
  // Check if styles already added
  if (document.querySelector("#theme-editor-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "theme-editor-styles";
  style.textContent = `
    .theme-dialog-container {
      position: fixed;
      width: 600px;
      height: 400px;
      background: #2a2a2a;
      border: 1px solid #555;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      overflow: visible;
    }

    .theme-dialog-container > .theme-dialog-header,
    .theme-dialog-container > .theme-dialog-tabs-content {
      overflow: hidden;
    }

    .theme-dialog-header {
      background: #1a1a1a;
      padding: 8px 15px;
      border-bottom: 1px solid #555;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      flex-shrink: 0;
    }

    .theme-dialog-tabs {
      display: flex;
      gap: 2px;
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
    }

    .theme-dialog-tabs::-webkit-scrollbar {
      height: 4px;
    }

    .theme-dialog-tabs::-webkit-scrollbar-thumb {
      background: #555;
      border-radius: 2px;
    }

    .theme-dialog-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px 4px 0 0;
      cursor: pointer;
      white-space: nowrap;
      color: #aaa;
      font-size: 13px;
      transition: all 0.2s;
    }

    .theme-dialog-tab:hover {
      background: #333;
      color: #fff;
    }

    .theme-dialog-tab.active {
      background: #2a2a2a;
      border-bottom-color: #2a2a2a;
      color: #fff;
      font-weight: 500;
    }

    .theme-dialog-tab .tab-close {
      background: transparent;
      border: none;
      color: #aaa;
      font-size: 16px;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 3px;
      padding: 0;
      line-height: 1;
    }

    .theme-dialog-tab .tab-close:hover {
      background: #555;
      color: #fff;
    }

    .theme-dialog-controls {
      display: flex;
      gap: 5px;
      margin-left: 10px;
    }

    .theme-dialog-btn {
      background: transparent;
      border: none;
      color: #aaa;
      font-size: 18px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
      padding: 0;
      line-height: 1;
    }

    .theme-dialog-btn:hover {
      background: #444;
      color: #fff;
    }

    .theme-dialog-tabs-content {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .theme-window-content {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: auto;
      color: #fff;
    }

    .theme-dialog-resize-handle {
      position: absolute;
      z-index: 10;
    }

    /* Edge handles */
    .resize-top {
      top: -5px;
      left: 0;
      right: 0;
      height: 10px;
      cursor: ns-resize;
    }

    .resize-bottom {
      bottom: -5px;
      left: 0;
      right: 0;
      height: 10px;
      cursor: ns-resize;
    }

    .resize-left {
      top: 0;
      bottom: 0;
      left: -5px;
      width: 10px;
      cursor: ew-resize;
    }

    .resize-right {
      top: 0;
      bottom: 0;
      right: -5px;
      width: 10px;
      cursor: ew-resize;
    }

    /* Corner handles */
    .resize-top-left {
      top: -10px;
      left: -10px;
      width: 20px;
      height: 20px;
      cursor: nwse-resize;
    }

    .resize-top-right {
      top: -10px;
      right: -10px;
      width: 20px;
      height: 20px;
      cursor: nesw-resize;
    }

    .resize-bottom-left {
      bottom: -10px;
      left: -10px;
      width: 20px;
      height: 20px;
      cursor: nesw-resize;
    }

    .resize-bottom-right {
      bottom: -10px;
      right: -10px;
      width: 20px;
      height: 20px;
      cursor: nwse-resize;
      background: linear-gradient(135deg, transparent 50%, #555 50%);
    }

    .resize-bottom-right:hover {
      background: linear-gradient(135deg, transparent 50%, #777 50%);
    }

    .theme-minimized-dock {
      position: fixed;
      bottom: 20px;
      left: 20px;
      display: flex;
      gap: 8px;
      z-index: 9999;
      flex-wrap: wrap;
      max-width: 600px;
    }

    .theme-dock-item {
      background: #1a1a1a;
      border: 1px solid #555;
      border-radius: 6px;
      padding: 10px 16px;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      transition: all 0.2s;
      user-select: none;
    }

    .theme-dock-item:hover {
      background: #2a2a2a;
      border-color: #777;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
    }
  `;

  document.head.appendChild(style);
}
