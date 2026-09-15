// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../DrugTracker.sol";

contract DrugTrackerTest {
    DrugTracker tracker;

    function setUp() public {
        tracker = new DrugTracker();
    }

    function testGenesisAdmin() public view {
        assert(tracker.admin() == address(this));
        assert(tracker.owner() == address(this));

        (string memory name, DrugTracker.Role role, bool isActive, uint256 registeredAt) =
            tracker.getStakeholder(address(this));

        assert(keccak256(bytes(name)) == keccak256(bytes("Genesis Admin")));
        assert(role == DrugTracker.Role.Admin);
        assert(isActive == true);
        assert(registeredAt > 0);
    }

    function testRegisterStakeholder() public {
        address mfg = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        tracker.registerStakeholder(mfg, "Nordis Pharma Labs", DrugTracker.Role.Manufacturer);

        (string memory name, DrugTracker.Role role, bool isActive, ) =
            tracker.getStakeholder(mfg);

        assert(keccak256(bytes(name)) == keccak256(bytes("Nordis Pharma Labs")));
        assert(role == DrugTracker.Role.Manufacturer);
        assert(isActive == true);
    }

    function testCreateAndTrackBatch() public {
        uint256 batchId = tracker.createBatchWithDetails(
            "Amoxicillin 500mg",
            "Lot #AMX-901, Exp: 2028-12-31"
        );
        assert(batchId == 1);
        assert(tracker.batchCount() == 1);

        (
            string memory drugName,
            address manufacturer,
            address distributor,
            address retailer,
            DrugTracker.Stage stage,
            uint256 lastUpdated,
            string memory details
        ) = tracker.getBatchExtended(1);

        assert(keccak256(bytes(drugName)) == keccak256(bytes("Amoxicillin 500mg")));
        assert(manufacturer == address(this));
        assert(distributor == address(0));
        assert(retailer == address(0));
        assert(stage == DrugTracker.Stage.Manufactured);
        assert(lastUpdated > 0);
        assert(keccak256(bytes(details)) == keccak256(bytes("Lot #AMX-901, Exp: 2028-12-31")));

        // Advance to Shipped
        tracker.advanceStageWithNotes(1, "Dispatched to Central Logistics");
        (, , , , DrugTracker.Stage stage1, , ) = tracker.getBatchExtended(1);
        assert(stage1 == DrugTracker.Stage.Shipped);

        // Advance to Delivered
        tracker.advanceStageWithNotes(1, "Delivered to MedPlus Pharmacy");
        (, , , , DrugTracker.Stage stage2, , ) = tracker.getBatchExtended(1);
        assert(stage2 == DrugTracker.Stage.Delivered);

        // Advance to Sold
        tracker.advanceStageWithNotes(1, "Dispensed to Patient");
        (, , , , DrugTracker.Stage stage3, , ) = tracker.getBatchExtended(1);
        assert(stage3 == DrugTracker.Stage.Sold);
    }

    function testRevokeStakeholder() public {
        address dist = address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
        tracker.registerStakeholder(dist, "Apex Logistics", DrugTracker.Role.Distributor);

        tracker.revokeStakeholder(dist);
        (, DrugTracker.Role role, bool isActive, ) = tracker.getStakeholder(dist);
        assert(role == DrugTracker.Role.None);
        assert(isActive == false);
    }
}
