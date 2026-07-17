// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ThresholdRandomBeacon} from "../src/randomness/ThresholdRandomBeacon.sol";
import {HoodPackzCore} from "../src/v2/HoodPackzCore.sol";

/// @notice Deploys the pre-funded V2 pack core against an existing production beacon.
/// @dev Reward amounts are token base units. Value and jackpot caps are USDG base units.
///      The core deploys paused and requires a separate admin activation after funding.
contract DeployHoodPackzV2 is Script {
    address internal constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    address internal constant CASHCAT = 0x020bfC650A365f8BB26819deAAbF3E21291018b4;
    address internal constant INDEX = 0x56910D4409F3a0C78C64DD8D0545FF0705389870;
    address internal constant JUGGERNAUT = 0xD7321801CAae694090694Ff55A9323139F043B88;
    address internal constant RWA = 0x4a380618777eED8D513bcd6e983DF3c5D2ba7777;
    address internal constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    address internal constant TENDIES = 0x45242320DBB855EeA8Fd36804C6487E10E97FCF9;
    address internal constant WALLET = 0x0339f5459FC690aC85F1782e15782A151b4A9E1b;

    function run() external returns (HoodPackzCore core) {
        require(block.chainid == 4663, "Robinhood Chain only");
        uint256 deployerKey = vm.envUint("DEPLOYER_PK");
        address admin = vm.envAddress("ADMIN");
        address inventoryTreasury = vm.envAddress("INVENTORY_TREASURY");
        address protocolTreasury = vm.envAddress("PROTOCOL_TREASURY");
        ThresholdRandomBeacon beacon = ThresholdRandomBeacon(vm.envAddress("THRESHOLD_BEACON"));
        require(address(beacon).code.length != 0, "beacon has no code");

        address[8] memory dependencies = [USDG, CASHCAT, INDEX, JUGGERNAUT, RWA, PONS, TENDIES, WALLET];
        for (uint256 i = 0; i < dependencies.length; i++) {
            require(dependencies[i].code.length != 0, "dependency has no code");
        }

        HoodPackzCore.AssetConfig[] memory assets = new HoodPackzCore.AssetConfig[](7);
        assets[0] = _asset(CASHCAT, "CASHCAT", 1);
        assets[1] = _asset(INDEX, "INDEX", 1);
        assets[2] = _asset(JUGGERNAUT, "JUGGERNAUT", 1);
        assets[3] = _asset(RWA, "RWA", 1);
        assets[4] = _asset(PONS, "PONS", 1);
        assets[5] = _asset(TENDIES, "TENDIES", 1);
        assets[6] = _asset(WALLET, "WALLET", 1);

        uint256[3] memory prizeValueCaps = [
            vm.envUint("PRIZE_VALUE_CAP_CORNER"),
            vm.envUint("PRIZE_VALUE_CAP_BLOCK"),
            vm.envUint("PRIZE_VALUE_CAP_CITY")
        ];
        uint256[3] memory jackpotStakeCaps = [
            vm.envUint("JACKPOT_STAKE_CAP_CORNER"),
            vm.envUint("JACKPOT_STAKE_CAP_BLOCK"),
            vm.envUint("JACKPOT_STAKE_CAP_CITY")
        ];

        vm.startBroadcast(deployerKey);
        core = new HoodPackzCore(
            IERC20(USDG),
            address(beacon),
            inventoryTreasury,
            protocolTreasury,
            assets,
            prizeValueCaps,
            jackpotStakeCaps,
            admin
        );
        beacon.grantRole(beacon.CONSUMER_ROLE(), address(core));
        vm.stopBroadcast();

        console.log("HoodPackzCore:", address(core));
        console.logBytes32(core.deploymentConfigHash());
        console.log("Fund reserves, attest runtime bytecode, then unpause with the admin.");
    }

    function _asset(address token, string memory symbol, uint32 defaultWeight)
        internal
        view
        returns (HoodPackzCore.AssetConfig memory)
    {
        string memory prefix = string.concat("REWARD_", symbol, "_");
        uint256 configuredWeight = vm.envOr(string.concat("WEIGHT_", symbol), uint256(defaultWeight));
        require(configuredWeight <= type(uint32).max, "weight exceeds uint32");
        return HoodPackzCore.AssetConfig({
            token: IERC20(token),
            // forge-lint: disable-next-line(unsafe-typecast)
            weight: uint32(configuredWeight),
            rewards: [
                vm.envUint(string.concat(prefix, "CORNER")),
                vm.envUint(string.concat(prefix, "BLOCK")),
                vm.envUint(string.concat(prefix, "CITY"))
            ]
        });
    }
}
