export default function (instanceClass) {
  return class extends instanceClass {
    constructor(sdkType, inst) {
      super(sdkType, inst);
    }

    Release() {}

    OnCreate() {
      alert("You should not be adding this plugin to a project");
    }

    OnPlacedInLayout() {}

    OnPropertyChanged(id, value) {}
  };
}
