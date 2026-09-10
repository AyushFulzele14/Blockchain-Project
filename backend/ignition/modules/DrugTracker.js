import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DrugTrackerModule", (m) => {
  const drugTracker = m.contract("DrugTracker");
  return { drugTracker };
});
