import { DialogManager } from "./DialogManager.js";

const SDK = globalThis.SDK;
globalThis.SDKExtensions = globalThis.SDKExtensions || {};
globalThis.SDKExtensions.EditorDialogManager = DialogManager;
export default function (parentClass) {
  return class extends parentClass {
    constructor(sdkPlugin, iObjectType) {
      super(sdkPlugin, iObjectType);
    }
  };
}
