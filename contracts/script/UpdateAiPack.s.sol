// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {StockPackz} from "../src/StockPackz.sol";

/// @notice Removes INTC from the live AI Pack: its only USDG pool is so thin
///         that a $9 buy has ~26% price impact, guaranteeing settlement
///         failure at the 5% slippage cap. Weight redistributed: MU absorbs
///         the common slot (deepest remaining pool, ~1% impact).
contract UpdateAiPack is Script {
    StockPackz constant core = StockPackz(0xEee1458Ad6DeB8Fa35f39FDdbB1aaa12D4A422f3);

    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant AMD = 0x86923f96303D656E4aa86D9d42D1e57ad2023fdC;
    address constant MU = 0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD;

    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_PK"));

        StockPackz.StockOption[] memory options = new StockPackz.StockOption[](3);
        options[0] = _opt(NVDA, 588); //  legendary
        options[1] = _opt(AMD, 1765); //  epic
        options[2] = _opt(MU, 7647); //   common (absorbs INTC's weight)

        StockPackz.PackConfig memory cfg;
        cfg.name = "AI Pack";
        cfg.description = "The companies building the future of intelligence";
        cfg.price = 9.99e6;
        cfg.stockAmount = 9e6;
        cfg.protocolFee = 0.59e6;
        cfg.jackpotContribution = 0.40e6;
        cfg.active = true;
        core.updatePack(1, cfg, options);

        vm.stopBroadcast();
        console.log("AI Pack updated: NVDA/AMD/MU, INTC removed");
    }

    function _opt(address token, uint32 weight) internal pure returns (StockPackz.StockOption memory) {
        return StockPackz.StockOption({
            token: token,
            weight: weight,
            maxSlippageBps: 500,
            minimumQuote: 0,
            active: true
        });
    }
}
