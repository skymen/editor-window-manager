// Dialog Manager - handles multiple windows, tabs, minimizing, and popups
export const DialogManager = {
  windows: new Map(),
  containers: new Map(), // Track multiple containers
  minimizedDock: null,
  containerIdCounter: 0,
  dragState: null, // Track tab dragging state

  init() {
    addDialogStyles();
    this.createMinimizedDock();
    this.setupWindowResizeListener();
    this.setupGlobalDragListeners();
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
      this.containers.forEach((containerData) => {
        if (containerData.element && containerData.element.style.display !== "none") {
          this.constrainToViewport(containerData.element);
        }
      });
    });
  },

  setupGlobalDragListeners() {
    if (this.globalDragListenersAdded) return;
    this.globalDragListenersAdded = true;

    document.addEventListener("mousemove", (e) => this.handleTabDragMove(e));
    document.addEventListener("mouseup", (e) => this.handleTabDragEnd(e));
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
      containerId: null,
    };

    this.windows.set(id, windowData);
    
    // Each window opens in its own separate container by default
    const container = this.createNewContainer();
    this.renderWindowInContainer(windowData, container);
    this.focusWindowInContainer(id, container.dataset.containerId);

    return windowData;
  },

  createNewContainer(position = null) {
    const containerId = `container-${++this.containerIdCounter}`;
    
    const container = document.createElement("div");
    container.className = "theme-dialog-container";
    container.dataset.containerId = containerId;
    container.innerHTML = `
      <div class="theme-dialog-header">
        <div class="theme-dialog-tabs"></div>
        <div class="theme-dialog-controls">
          <button class="theme-dialog-btn minimize-btn" title="Minimize">_</button>
          <button class="theme-dialog-btn close-btn" title="Close">×</button>
        </div>
      </div>
      <div class="theme-dialog-tabs-content"></div>
    `;

    document.body.appendChild(container);

    // Position the container
    if (position) {
      container.style.left = position.left + "px";
      container.style.top = position.top + "px";
    } else {
      // Offset new windows slightly from previous ones
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const offset = (this.containers.size * 30) % 150;
      container.style.left = Math.max(0, (viewportWidth - 600) / 2 + offset) + "px";
      container.style.top = Math.max(0, (viewportHeight - 400) / 2 + offset) + "px";
    }

    // Setup controls
    container.querySelector(".close-btn").addEventListener("click", () => {
      this.closeActiveWindowInContainer(containerId);
    });

    container.querySelector(".minimize-btn").addEventListener("click", () => {
      this.minimizeContainer(containerId);
    });

    // Setup drop zone for merging windows
    this.setupContainerDropZone(container);

    this.makeDraggable(container);
    this.makeResizable(container);

    // Store container data
    const containerData = {
      id: containerId,
      element: container,
      activeWindowId: null,
      isMinimized: false,
    };
    this.containers.set(containerId, containerData);

    return container;
  },

  setupContainerDropZone(container) {
    container.addEventListener("dragover", (e) => {
      if (!this.dragState) return;
      e.preventDefault();
      container.classList.add("drop-target");
    });

    container.addEventListener("dragleave", (e) => {
      // Only remove if we're actually leaving the container
      if (!container.contains(e.relatedTarget)) {
        container.classList.remove("drop-target");
      }
    });

    container.addEventListener("drop", (e) => {
      e.preventDefault();
      container.classList.remove("drop-target");
      
      if (!this.dragState) return;
      
      const { windowId, sourceContainerId } = this.dragState;
      const targetContainerId = container.dataset.containerId;
      
      // Don't merge into the same container (reordering is handled separately)
      if (sourceContainerId === targetContainerId) return;
      
      this.moveWindowToContainer(windowId, targetContainerId);
      this.dragState = null;
    });
  },

  renderWindowInContainer(windowData, container) {
    const containerId = container.dataset.containerId;
    windowData.containerId = containerId;

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
    } else {
      // Move existing element to new container
      container.querySelector(".theme-dialog-tabs-content").appendChild(windowData.element);
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

  createTab(windowData, container) {
    // Remove existing tab if present
    if (windowData.tabElement) {
      windowData.tabElement.remove();
    }

    const tab = document.createElement("div");
    tab.className = "theme-dialog-tab";
    tab.dataset.windowId = windowData.id;
    tab.draggable = true;
    tab.innerHTML = `
      <span class="tab-title">${windowData.title}</span>
      <button class="tab-popout" title="Pop out to separate window">⧉</button>
      <button class="tab-close" title="Close">×</button>
    `;

    // Pop-out button handler
    tab.querySelector(".tab-popout").addEventListener("click", (e) => {
      e.stopPropagation();
      this.popOutWindow(windowData.id);
    });

    // Close button handler
    tab.querySelector(".tab-close").addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeWindow(windowData.id);
    });

    // Tab click to focus
    tab.addEventListener("click", () => {
      this.focusWindowInContainer(windowData.id, windowData.containerId);
    });

    // Tab drag start
    tab.addEventListener("dragstart", (e) => {
      this.handleTabDragStart(e, windowData, container);
    });

    tab.addEventListener("dragend", () => {
      this.handleTabDragEnd();
    });

    // Tab drop for reordering within same container
    tab.addEventListener("dragover", (e) => {
      if (!this.dragState) return;
      e.preventDefault();
      e.stopPropagation();
      
      const draggedWindowId = this.dragState.windowId;
      const targetWindowId = windowData.id;
      
      if (draggedWindowId === targetWindowId) return;
      if (this.dragState.sourceContainerId !== windowData.containerId) return;
      
      // Visual indicator for drop position
      const rect = tab.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      
      tab.classList.remove("drop-left", "drop-right");
      if (e.clientX < midX) {
        tab.classList.add("drop-left");
      } else {
        tab.classList.add("drop-right");
      }
    });

    tab.addEventListener("dragleave", () => {
      tab.classList.remove("drop-left", "drop-right");
    });

    tab.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!this.dragState) return;
      
      const draggedWindowId = this.dragState.windowId;
      const targetWindowId = windowData.id;
      
      if (draggedWindowId === targetWindowId) return;
      
      tab.classList.remove("drop-left", "drop-right");
      
      // Reorder tabs
      const rect = tab.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const insertBefore = e.clientX < midX;
      
      this.reorderTab(draggedWindowId, targetWindowId, insertBefore, container);
      this.dragState = null;
    });

    windowData.tabElement = tab;
    container.querySelector(".theme-dialog-tabs").appendChild(tab);
  },

  handleTabDragStart(e, windowData, container) {
    this.dragState = {
      windowId: windowData.id,
      sourceContainerId: container.dataset.containerId,
      startX: e.clientX,
      startY: e.clientY,
    };
    
    // Set drag image
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", windowData.id);
    
    // Highlight potential drop targets
    setTimeout(() => {
      this.containers.forEach((containerData) => {
        if (containerData.id !== this.dragState?.sourceContainerId) {
          containerData.element.classList.add("potential-drop-target");
        }
      });
    }, 0);
  },

  handleTabDragMove(e) {
    if (!this.dragState) return;
    
    // Track mouse position for creating new window when dropped outside
    this.dragState.currentX = e.clientX;
    this.dragState.currentY = e.clientY;
  },

  handleTabDragEnd(e) {
    if (!this.dragState) return;
    
    // Remove all highlight classes
    this.containers.forEach((containerData) => {
      containerData.element.classList.remove("potential-drop-target", "drop-target");
    });
    
    document.querySelectorAll(".theme-dialog-tab").forEach((tab) => {
      tab.classList.remove("drop-left", "drop-right");
    });
    
    // Check if dropped outside any container - create new window
    if (e && this.dragState.currentX !== undefined) {
      const droppedOnContainer = Array.from(this.containers.values()).some((containerData) => {
        const rect = containerData.element.getBoundingClientRect();
        return (
          this.dragState.currentX >= rect.left &&
          this.dragState.currentX <= rect.right &&
          this.dragState.currentY >= rect.top &&
          this.dragState.currentY <= rect.bottom
        );
      });
      
      if (!droppedOnContainer) {
        // Create new container at drop position
        this.popOutWindowToPosition(this.dragState.windowId, {
          left: this.dragState.currentX - 300,
          top: this.dragState.currentY - 20,
        });
      }
    }
    
    this.dragState = null;
  },

  reorderTab(draggedWindowId, targetWindowId, insertBefore, container) {
    const draggedWindow = this.windows.get(draggedWindowId);
    const targetWindow = this.windows.get(targetWindowId);
    
    if (!draggedWindow || !targetWindow) return;
    if (draggedWindow.containerId !== targetWindow.containerId) return;
    
    const tabsContainer = container.querySelector(".theme-dialog-tabs");
    const draggedTab = draggedWindow.tabElement;
    const targetTab = targetWindow.tabElement;
    
    if (insertBefore) {
      tabsContainer.insertBefore(draggedTab, targetTab);
    } else {
      tabsContainer.insertBefore(draggedTab, targetTab.nextSibling);
    }
  },

  moveWindowToContainer(windowId, targetContainerId) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;
    
    const sourceContainerId = windowData.containerId;
    const sourceContainer = this.containers.get(sourceContainerId);
    const targetContainer = this.containers.get(targetContainerId);
    
    if (!sourceContainer || !targetContainer) return;
    
    // Move tab and content to new container
    const targetElement = targetContainer.element;
    this.renderWindowInContainer(windowData, targetElement);
    
    // Update active window in target container
    this.focusWindowInContainer(windowId, targetContainerId);
    
    // Clean up source container if empty
    this.cleanupContainerIfEmpty(sourceContainerId);
  },

  popOutWindow(windowId) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;
    
    const sourceContainerId = windowData.containerId;
    const sourceContainer = this.containers.get(sourceContainerId);
    if (!sourceContainer) return;
    
    // Count visible windows in source container
    const visibleWindowsInContainer = Array.from(this.windows.values()).filter(
      (w) => w.containerId === sourceContainerId && !w.isInPopup
    );
    
    // If this is the only window, don't pop out (already separate)
    if (visibleWindowsInContainer.length <= 1) return;
    
    // Create new container for this window
    const sourceRect = sourceContainer.element.getBoundingClientRect();
    const newContainer = this.createNewContainer({
      left: sourceRect.left + 50,
      top: sourceRect.top + 50,
    });
    
    this.renderWindowInContainer(windowData, newContainer);
    this.focusWindowInContainer(windowId, newContainer.dataset.containerId);
    
    // Update source container
    this.cleanupContainerIfEmpty(sourceContainerId);
    this.updateTabVisibility(sourceContainer.element);
    
    // Focus another window in source container
    const remainingWindow = Array.from(this.windows.values()).find(
      (w) => w.containerId === sourceContainerId && !w.isInPopup
    );
    if (remainingWindow) {
      this.focusWindowInContainer(remainingWindow.id, sourceContainerId);
    }
  },

  popOutWindowToPosition(windowId, position) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;
    
    const sourceContainerId = windowData.containerId;
    const sourceContainer = this.containers.get(sourceContainerId);
    if (!sourceContainer) return;
    
    // Count visible windows in source container
    const visibleWindowsInContainer = Array.from(this.windows.values()).filter(
      (w) => w.containerId === sourceContainerId && !w.isInPopup
    );
    
    // If this is the only window, just move the container
    if (visibleWindowsInContainer.length <= 1) {
      sourceContainer.element.style.left = position.left + "px";
      sourceContainer.element.style.top = position.top + "px";
      this.constrainToViewport(sourceContainer.element);
      return;
    }
    
    // Create new container at position
    const newContainer = this.createNewContainer(position);
    this.constrainToViewport(newContainer);
    
    this.renderWindowInContainer(windowData, newContainer);
    this.focusWindowInContainer(windowId, newContainer.dataset.containerId);
    
    // Update source container
    this.updateTabVisibility(sourceContainer.element);
    
    // Focus another window in source container
    const remainingWindow = Array.from(this.windows.values()).find(
      (w) => w.containerId === sourceContainerId && !w.isInPopup
    );
    if (remainingWindow) {
      this.focusWindowInContainer(remainingWindow.id, sourceContainerId);
    }
  },

  cleanupContainerIfEmpty(containerId) {
    const containerData = this.containers.get(containerId);
    if (!containerData) return;
    
    const windowsInContainer = Array.from(this.windows.values()).filter(
      (w) => w.containerId === containerId
    );
    
    if (windowsInContainer.length === 0) {
      containerData.element.remove();
      this.containers.delete(containerId);
    } else {
      this.updateTabVisibility(containerData.element);
    }
  },

  updateTabVisibility(container) {
    const containerId = container.dataset.containerId;
    const containerData = this.containers.get(containerId);
    if (!containerData) return;

    // Get all visible tabs (not in popup)
    const allTabs = container.querySelectorAll(".theme-dialog-tab");
    const visibleTabs = Array.from(allTabs).filter((tab) => {
      const windowId = tab.dataset.windowId;
      const windowData = this.windows.get(windowId);
      return windowData && !windowData.isInPopup;
    });

    const contents = container.querySelectorAll(".theme-window-content");

    // Update tab active states and visibility
    allTabs.forEach((tab) => {
      const windowId = tab.dataset.windowId;
      const windowData = this.windows.get(windowId);
      const isActive = windowId === containerData.activeWindowId;
      
      tab.classList.toggle("active", isActive);
      
      // Hide tabs that are in popup
      if (windowData && windowData.isInPopup) {
        tab.style.display = "none";
      } else {
        tab.style.display = "";
      }
    });

    contents.forEach((content) => {
      const windowId = content.dataset.windowId;
      const windowData = this.windows.get(windowId);
      const isActive = windowId === containerData.activeWindowId;
      
      // Hide content that is in popup or not active
      if (windowData && windowData.isInPopup) {
        content.style.display = "none";
      } else {
        content.style.display = isActive ? "block" : "none";
      }
    });

    // Show/hide tabs bar if only one visible tab
    const tabsBar = container.querySelector(".theme-dialog-tabs");
    tabsBar.style.display = visibleTabs.length > 1 ? "flex" : "none";
  },

  focusWindowInContainer(windowId, containerId) {
    const containerData = this.containers.get(containerId);
    if (!containerData) return;
    
    containerData.activeWindowId = windowId;
    
    // Bring container to front
    this.bringContainerToFront(containerId);
    
    if (containerData.element) {
      this.updateTabVisibility(containerData.element);
    }
  },

  bringContainerToFront(containerId) {
    // Get max z-index among all containers
    let maxZ = 10000;
    this.containers.forEach((containerData) => {
      const z = parseInt(containerData.element.style.zIndex) || 10000;
      if (z > maxZ) maxZ = z;
    });
    
    const containerData = this.containers.get(containerId);
    if (containerData) {
      containerData.element.style.zIndex = maxZ + 1;
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

    const containerId = windowData.containerId;
    const containerData = this.containers.get(containerId);

    if (windowData.tabElement) {
      windowData.tabElement.remove();
    }

    if (windowData.element) {
      windowData.element.remove();
    }

    this.windows.delete(id);

    // Update active window in container
    if (containerData && containerData.activeWindowId === id) {
      const remainingWindows = Array.from(this.windows.values()).filter(
        (w) => w.containerId === containerId && !w.isInPopup
      );
      containerData.activeWindowId = remainingWindows.length > 0 ? remainingWindows[0].id : null;
    }

    // Clean up container if empty
    this.cleanupContainerIfEmpty(containerId);

    this.updateMinimizedDock();
  },

  closeActiveWindowInContainer(containerId) {
    const containerData = this.containers.get(containerId);
    if (containerData && containerData.activeWindowId) {
      this.closeWindow(containerData.activeWindowId);
    }
  },

  minimizeContainer(containerId) {
    const containerData = this.containers.get(containerId);
    if (!containerData) return;

    containerData.element.style.display = "none";
    containerData.isMinimized = true;

    // Mark all windows in this container as minimized
    this.windows.forEach((windowData) => {
      if (windowData.containerId === containerId) {
        windowData.isMinimized = true;
      }
    });

    this.updateMinimizedDock();
  },

  restoreContainer(containerId) {
    const containerData = this.containers.get(containerId);
    if (!containerData) return;

    containerData.element.style.display = "flex";
    containerData.isMinimized = false;

    // Mark all windows in this container as not minimized
    this.windows.forEach((windowData) => {
      if (windowData.containerId === containerId) {
        windowData.isMinimized = false;
      }
    });

    this.bringContainerToFront(containerId);
    this.updateMinimizedDock();
  },

  updateMinimizedDock() {
    if (!this.minimizedDock) return;

    this.minimizedDock.innerHTML = "";

    // Group minimized windows by container
    const minimizedContainers = Array.from(this.containers.values()).filter(
      (c) => c.isMinimized
    );

    if (minimizedContainers.length === 0) {
      this.minimizedDock.style.display = "none";
      return;
    }

    this.minimizedDock.style.display = "flex";

    minimizedContainers.forEach((containerData) => {
      // Get windows in this container
      const windowsInContainer = Array.from(this.windows.values()).filter(
        (w) => w.containerId === containerData.id && !w.isInPopup
      );

      if (windowsInContainer.length === 0) return;

      const dockItem = document.createElement("div");
      dockItem.className = "theme-dock-item";
      
      // Show all tab names if multiple, otherwise just the one
      if (windowsInContainer.length > 1) {
        dockItem.textContent = windowsInContainer.map((w) => w.title).join(", ");
      } else {
        dockItem.textContent = windowsInContainer[0].title;
      }
      
      dockItem.addEventListener("click", () => {
        this.restoreContainer(containerData.id);
      });

      this.minimizedDock.appendChild(dockItem);
    });
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
      this.bringContainerToFront(container.dataset.containerId);
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

    .theme-dialog-tab .tab-title {
      flex: 1;
    }

    .theme-dialog-tab .tab-popout,
    .theme-dialog-tab .tab-close {
      background: transparent;
      border: none;
      color: #aaa;
      font-size: 14px;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 3px;
      padding: 0;
      line-height: 1;
      flex-shrink: 0;
    }

    .theme-dialog-tab .tab-popout:hover,
    .theme-dialog-tab .tab-close:hover {
      background: #555;
      color: #fff;
    }

    .theme-dialog-tab.drop-left {
      border-left: 3px solid #4a9eff;
    }

    .theme-dialog-tab.drop-right {
      border-right: 3px solid #4a9eff;
    }

    .theme-dialog-tab[draggable="true"] {
      cursor: grab;
    }

    .theme-dialog-tab[draggable="true"]:active {
      cursor: grabbing;
    }

    .theme-dialog-container.potential-drop-target {
      outline: 2px dashed #4a9eff;
      outline-offset: -2px;
    }

    .theme-dialog-container.drop-target {
      outline: 3px solid #4a9eff;
      outline-offset: -3px;
      background: rgba(74, 158, 255, 0.1);
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
