// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract DrugTracker {
    // 5 Stakeholder Roles: Admin, Manufacturer, Distributor, Retailer, and Consumer (public)
    enum Role { None, Admin, Manufacturer, Distributor, Retailer }

    // Lifecycle stages of a pharmaceutical batch
    enum Stage { Manufactured, Shipped, Delivered, Sold }

    struct Batch {
        string drugName;
        address manufacturer;
        address distributor;
        address retailer;
        Stage stage;
        uint256 lastUpdated;
        string details;
    }

    struct Stakeholder {
        string name;
        Role role;
        bool isActive;
        uint256 registeredAt;
    }

    address public admin;
    uint256 public batchCount;
    mapping(uint256 => Batch) public batches;
    mapping(address => Stakeholder) public stakeholders;

    event StakeholderRegistered(address indexed account, string name, Role role);
    event StakeholderRevoked(address indexed account);
    event BatchCreated(uint256 batchId, string drugName, address indexed manufacturer);
    event StageUpdated(uint256 batchId, Stage newStage);
    event CustodyLogged(uint256 batchId, Stage stage, address indexed handler, string notes);

    modifier onlyAdmin() {
        require(
            msg.sender == admin || stakeholders[msg.sender].role == Role.Admin,
            "Only Blockchain Admin permitted"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        stakeholders[msg.sender] = Stakeholder({
            name: "Genesis Admin",
            role: Role.Admin,
            isActive: true,
            registeredAt: block.timestamp
        });
        emit StakeholderRegistered(msg.sender, "Genesis Admin", Role.Admin);
    }

    // ==========================================
    // 1. BLOCKCHAIN ADMINISTRATOR FUNCTIONS
    // ==========================================

    function registerStakeholder(
        address _account,
        string memory _name,
        Role _role
    ) public onlyAdmin {
        require(_account != address(0), "Invalid address");
        require(_role != Role.None, "Invalid role");
        stakeholders[_account] = Stakeholder({
            name: _name,
            role: _role,
            isActive: true,
            registeredAt: block.timestamp
        });
        emit StakeholderRegistered(_account, _name, _role);
    }

    function revokeStakeholder(address _account) public onlyAdmin {
        require(_account != admin, "Cannot revoke primary administrator");
        stakeholders[_account].isActive = false;
        stakeholders[_account].role = Role.None;
        emit StakeholderRevoked(_account);
    }

    function getStakeholder(address _account)
        public
        view
        returns (
            string memory name,
            Role role,
            bool isActive,
            uint256 registeredAt
        )
    {
        Stakeholder memory s = stakeholders[_account];
        return (s.name, s.role, s.isActive, s.registeredAt);
    }

    // ==========================================
    // 2. MANUFACTURER FUNCTIONS
    // ==========================================

    function createBatch(string memory _drugName) public returns (uint256) {
        return createBatchWithDetails(_drugName, "");
    }

    function createBatchWithDetails(string memory _drugName, string memory _details)
        public
        returns (uint256)
    {
        // Enforce manufacturer authorization if registered, or allow deployer/admin
        if (stakeholders[msg.sender].isActive) {
            require(
                stakeholders[msg.sender].role == Role.Manufacturer || msg.sender == admin,
                "Only authorized Manufacturer can mint batches"
            );
        }

        batchCount++;
        batches[batchCount] = Batch({
            drugName: _drugName,
            manufacturer: msg.sender,
            distributor: address(0),
            retailer: address(0),
            stage: Stage.Manufactured,
            lastUpdated: block.timestamp,
            details: _details
        });

        emit BatchCreated(batchCount, _drugName, msg.sender);
        emit StageUpdated(batchCount, Stage.Manufactured);
        return batchCount;
    }

    // ==========================================
    // 3. SUPPLY CHAIN CUSTODY (Distributor & Retailer)
    // ==========================================

    function advanceStage(uint256 _batchId) public {
        advanceStageWithNotes(_batchId, "");
    }

    function advanceStageWithNotes(uint256 _batchId, string memory _notes) public {
        require(_batchId > 0 && _batchId <= batchCount, "Batch does not exist");
        Batch storage b = batches[_batchId];
        require(b.stage != Stage.Sold, "Batch already at final stage (Sold)");

        Stage nextStage = Stage(uint8(b.stage) + 1);

        // Role verification for stage progression
        if (stakeholders[msg.sender].isActive && msg.sender != admin) {
            if (nextStage == Stage.Shipped) {
                require(
                    stakeholders[msg.sender].role == Role.Distributor ||
                        stakeholders[msg.sender].role == Role.Manufacturer,
                    "Only authorized Distributor or Manufacturer can dispatch shipment"
                );
            } else if (nextStage == Stage.Delivered) {
                require(
                    stakeholders[msg.sender].role == Role.Retailer ||
                        stakeholders[msg.sender].role == Role.Distributor,
                    "Only authorized Retailer can accept pharmacy delivery"
                );
            } else if (nextStage == Stage.Sold) {
                require(
                    stakeholders[msg.sender].role == Role.Retailer,
                    "Only authorized Retailer can dispense medicine to customer"
                );
            }
        }

        if (nextStage == Stage.Shipped) {
            b.distributor = msg.sender;
        } else if (nextStage == Stage.Delivered || nextStage == Stage.Sold) {
            b.retailer = msg.sender;
        }

        b.stage = nextStage;
        b.lastUpdated = block.timestamp;

        emit StageUpdated(_batchId, b.stage);
        emit CustodyLogged(_batchId, b.stage, msg.sender, _notes);
    }

    // ==========================================
    // 4. VERIFICATION QUERIES (Consumer & Regulators)
    // ==========================================

    // Backward-compatible query
    function getBatch(uint256 _batchId)
        public
        view
        returns (
            string memory drugName,
            address manufacturer,
            Stage stage,
            uint256 lastUpdated
        )
    {
        Batch memory b = batches[_batchId];
        return (b.drugName, b.manufacturer, b.stage, b.lastUpdated);
    }

    // Extended query with all supply chain handlers
    function getBatchExtended(uint256 _batchId)
        public
        view
        returns (
            string memory drugName,
            address manufacturer,
            address distributor,
            address retailer,
            Stage stage,
            uint256 lastUpdated,
            string memory details
        )
    {
        Batch memory b = batches[_batchId];
        return (
            b.drugName,
            b.manufacturer,
            b.distributor,
            b.retailer,
            b.stage,
            b.lastUpdated,
            b.details
        );
    }

    // Owner alias for backward compatibility with older scripts
    function owner() public view returns (address) {
        return admin;
    }
}
