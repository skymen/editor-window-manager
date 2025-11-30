# Editor Window Manager

A Construct 3 editor extension that provides a comprehensive window management system for creating custom dialogs and interfaces in the editor.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
  - [DialogManager](#dialogmanager)
  - [Window Management](#window-management)
  - [Container Management](#container-management)
  - [Tab Management](#tab-management)
- [Features](#features)
- [Examples](#examples)

## Overview

The Editor Window Manager provides a powerful system for creating and managing custom windows in the Construct 3 editor. It supports multiple windows, tabbed interfaces, drag-and-drop organization, minimization, and popup windows.

## Getting Started

Access the DialogManager through the global SDK extensions:

```javascript
const DialogManager = globalThis.SDKExtensions.EditorDialogManager;
```

Initialize the dialog system (only needed once):

```javascript
DialogManager.init();
```

Create your first window:

```javascript
const window = DialogManager.createWindow({
  id: "my-window",
  title: "My Custom Window",
  content: "<div>Hello World</div>",
  onInit: (element) => {
    // Initialize your window content
    console.log("Window initialized", element);
  },
});
```

## Core Concepts

### Windows

A window is an individual content area with its own ID, title, and content. Each window can exist in a container, be minimized, or be popped out to a browser window.

### Containers

Containers are the visual shells that hold one or more windows as tabs. Each container has:

- A header with tabs and controls
- A content area for displaying the active window
- Drag handles for repositioning
- Resize handles for adjusting size

### Tabs

When multiple windows are in the same container, they appear as tabs. Users can click tabs to switch between windows, drag tabs to reorder them, or drag tabs between containers to organize their workspace.

## API Reference

### DialogManager

The main object that manages all windows and containers.

#### Methods

##### `init()`

Initialize the dialog system. This should be called once before creating any windows.

```javascript
DialogManager.init();
```

##### `createWindow(options)`

Create a new window and display it in a new container.

**Parameters:**

- `id` (string): Unique identifier for the window
- `title` (string): Display title for the window
- `content` (string): HTML content for the window
- `onInit` (function): Callback function called after window is initialized

**Returns:** Window data object

```javascript
const window = DialogManager.createWindow({
  id: "settings-window",
  title: "Settings",
  content: '<div class="settings">Settings content here</div>',
  onInit: (element) => {
    // Setup event listeners, initialize components, etc.
    element.querySelector(".save-btn").addEventListener("click", () => {
      // Handle save
    });
  },
});
```

##### `getWindow(id)`

Retrieve a window by its ID.

**Parameters:**

- `id` (string): Window identifier

**Returns:** Window data object or `undefined`

```javascript
const window = DialogManager.getWindow("settings-window");
if (window) {
  console.log("Found window:", window.title);
}
```

##### `closeWindow(id)`

Close a window and remove it from the system.

**Parameters:**

- `id` (string): Window identifier

```javascript
DialogManager.closeWindow("settings-window");
```

##### `focusWindow(windowId)`

Bring a window to focus. If minimized, it will be restored. If in a popup, the popup will be focused.

**Parameters:**

- `windowId` (string): Window identifier

```javascript
DialogManager.focusWindow("settings-window");
```

##### `updateWindowTitle(windowId, newTitle)`

Change the title of a window.

**Parameters:**

- `windowId` (string): Window identifier
- `newTitle` (string): New title text

```javascript
DialogManager.updateWindowTitle("settings-window", "Settings - Modified");
```

##### `restoreWindow(windowId)`

Restore a minimized window or focus a popup window.

**Parameters:**

- `windowId` (string): Window identifier

```javascript
DialogManager.restoreWindow("settings-window");
```

### Window Management

##### `popOutWindow(windowId)`

Pop a window out to a separate browser window.

**Parameters:**

- `windowId` (string): Window identifier

```javascript
DialogManager.popOutWindow("settings-window");
```

##### `popOutWindowToSeparateContainer(windowId)`

Move a window to a new container within the editor (not a popup).

**Parameters:**

- `windowId` (string): Window identifier

```javascript
DialogManager.popOutWindowToSeparateContainer("settings-window");
```

##### `popOutWindowToPosition(windowId, position)`

Move a window to a new container at a specific position.

**Parameters:**

- `windowId` (string): Window identifier
- `position` (object): Position with `left` and `top` properties in pixels

```javascript
DialogManager.popOutWindowToPosition("settings-window", {
  left: 100,
  top: 100,
});
```

### Container Management

##### `createNewContainer(position)`

Create a new empty container at a specific position or automatically positioned.

**Parameters:**

- `position` (object, optional): Position with `left` and `top` properties

**Returns:** Container DOM element

```javascript
const container = DialogManager.createNewContainer({
  left: 200,
  top: 150,
});
```

##### `closeAllWindowsInContainer(containerId)`

Close all windows in a specific container.

**Parameters:**

- `containerId` (string): Container identifier

```javascript
DialogManager.closeAllWindowsInContainer("container-1");
```

##### `minimizeContainer(containerId)`

Minimize a container, hiding it and adding all its windows to the minimized dock.

**Parameters:**

- `containerId` (string): Container identifier

```javascript
DialogManager.minimizeContainer("container-1");
```

##### `restoreContainer(containerId)`

Restore a minimized container.

**Parameters:**

- `containerId` (string): Container identifier

```javascript
DialogManager.restoreContainer("container-1");
```

##### `bringContainerToFront(containerId)`

Bring a container to the front (highest z-index).

**Parameters:**

- `containerId` (string): Container identifier

```javascript
DialogManager.bringContainerToFront("container-1");
```

##### `mergeContainers(sourceContainerId, targetContainerId)`

Move all windows from one container to another.

**Parameters:**

- `sourceContainerId` (string): Source container identifier
- `targetContainerId` (string): Target container identifier

```javascript
DialogManager.mergeContainers("container-1", "container-2");
```

### Tab Management

##### `moveWindowToContainer(windowId, targetContainerId)`

Move a window from its current container to a different container.

**Parameters:**

- `windowId` (string): Window identifier
- `targetContainerId` (string): Target container identifier

```javascript
DialogManager.moveWindowToContainer("settings-window", "container-2");
```

##### `focusWindowInContainer(windowId, containerId)`

Focus a specific window within its container.

**Parameters:**

- `windowId` (string): Window identifier
- `containerId` (string): Container identifier

```javascript
DialogManager.focusWindowInContainer("settings-window", "container-1");
```

## Features

### Multiple Windows

Create as many windows as needed. Each window starts in its own container by default.

```javascript
DialogManager.createWindow({
  id: "window-1",
  title: "Window 1",
  content: "<div>First window</div>",
});

DialogManager.createWindow({
  id: "window-2",
  title: "Window 2",
  content: "<div>Second window</div>",
});
```

### Tabbed Interface

Drag windows between containers to create tabs. When multiple windows are in the same container, they appear as tabs that can be clicked to switch between them.

### Drag and Drop

Users can:

- Drag tabs within a container to reorder them
- Drag tabs between containers to merge windows
- Drag tabs outside containers to create new windows
- Drag container headers to reposition windows
- Drag minimized dock items to reorder them

### Minimization

Containers can be minimized to a dock at the bottom of the screen. Click minimized items to restore them.

```javascript
// Minimize programmatically
const window = DialogManager.getWindow("settings-window");
if (window && window.containerId) {
  DialogManager.minimizeContainer(window.containerId);
}
```

### Popup Windows

Windows can be popped out to separate browser windows. When the popup is closed, the window returns to its original container.

```javascript
DialogManager.popOutWindow("settings-window");
```

### Resizable and Draggable

All containers are:

- Draggable by their header
- Resizable from all edges and corners
- Constrained to stay within the viewport

### Auto-positioning

New containers are automatically positioned with a slight offset from previous containers to create a cascading effect.

## Examples

### Simple Configuration Window

```javascript
DialogManager.init();

const configWindow = DialogManager.createWindow({
  id: "config-window",
  title: "Configuration",
  content: `
    <div style="padding: 20px;">
      <h2>Settings</h2>
      <label>
        <input type="checkbox" id="enable-feature">
        Enable Feature
      </label>
      <button id="save-config">Save</button>
    </div>
  `,
  onInit: (element) => {
    const saveBtn = element.querySelector("#save-config");
    const checkbox = element.querySelector("#enable-feature");

    saveBtn.addEventListener("click", () => {
      const enabled = checkbox.checked;
      console.log("Feature enabled:", enabled);
      // Save configuration
    });
  },
});
```

### Multi-panel Tool

```javascript
DialogManager.init();

// Create main panel
DialogManager.createWindow({
  id: "tool-main",
  title: "Main Panel",
  content: '<div style="padding: 20px;">Main tool interface</div>',
});

// Create properties panel
DialogManager.createWindow({
  id: "tool-properties",
  title: "Properties",
  content: '<div style="padding: 20px;">Properties panel</div>',
});

// Create output panel
DialogManager.createWindow({
  id: "tool-output",
  title: "Output",
  content: '<div style="padding: 20px;">Output console</div>',
});
```

### Dynamic Content Window

```javascript
DialogManager.init();

const dataWindow = DialogManager.createWindow({
  id: "data-viewer",
  title: "Data Viewer",
  content: '<div id="data-content"></div>',
  onInit: (element) => {
    const contentDiv = element.querySelector("#data-content");

    // Function to update content
    window.updateDataViewer = (data) => {
      contentDiv.innerHTML = `
        <table>
          <thead>
            <tr><th>Key</th><th>Value</th></tr>
          </thead>
          <tbody>
            ${Object.entries(data)
              .map(
                ([key, value]) => `
              <tr><td>${key}</td><td>${value}</td></tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    };

    // Initial data
    window.updateDataViewer({ status: "Ready", items: 0 });
  },
});

// Update from elsewhere
window.updateDataViewer({ status: "Processing", items: 42 });
```

### Programmatic Window Control

```javascript
DialogManager.init();

// Create window
const helpWindow = DialogManager.createWindow({
  id: "help-window",
  title: "Help",
  content: '<div style="padding: 20px;">Help content</div>',
});

// Later: Update title
DialogManager.updateWindowTitle("help-window", "Help - Getting Started");

// Later: Focus window
DialogManager.focusWindow("help-window");

// Later: Pop out to browser window
DialogManager.popOutWindow("help-window");

// Later: Close window
DialogManager.closeWindow("help-window");
```

### Working with Containers

```javascript
DialogManager.init();

// Create multiple windows
const win1 = DialogManager.createWindow({
  id: "win1",
  title: "Window 1",
  content: "<div>Content 1</div>",
});

const win2 = DialogManager.createWindow({
  id: "win2",
  title: "Window 2",
  content: "<div>Content 2</div>",
});

// Get their container IDs
const container1Id = win1.containerId;
const container2Id = win2.containerId;

// Merge windows into one container
setTimeout(() => {
  DialogManager.mergeContainers(container2Id, container1Id);
  // Now both windows are in the same container as tabs
}, 2000);
```

### Custom Styled Window

```javascript
DialogManager.init();

DialogManager.createWindow({
  id: "styled-window",
  title: "Custom Styled Window",
  content: `
    <style>
      .custom-window {
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        height: 100%;
      }
      .custom-window h1 {
        margin: 0 0 20px 0;
        font-size: 24px;
      }
      .custom-window button {
        background: white;
        color: #667eea;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
      }
    </style>
    <div class="custom-window">
      <h1>Beautiful Window</h1>
      <p>This window has custom styling.</p>
      <button id="action-btn">Take Action</button>
    </div>
  `,
  onInit: (element) => {
    element.querySelector("#action-btn").addEventListener("click", () => {
      alert("Action taken!");
    });
  },
});
```

### Checking Window State

```javascript
// Check if window exists
const window = DialogManager.getWindow("my-window");
if (window) {
  console.log("Window exists");
  console.log("Title:", window.title);
  console.log("Is minimized:", window.isMinimized);
  console.log("Is in popup:", window.isInPopup);
  console.log("Container ID:", window.containerId);

  // Access the DOM element
  if (window.element) {
    window.element.style.background = "#333";
  }
}
```
