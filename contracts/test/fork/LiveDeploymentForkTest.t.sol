// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {StockPackz} from "../../src/StockPackz.sol";
import {KeeperRandomnessCoordinator} from "../../src/randomness/KeeperRandomnessCoordinator.sol";

/// @notice End-to-end test against the LIVE deployed production contracts.
///         Verifies the exact path a real user takes on stockpackz.xyz.
///         forge test --match-contract LiveDeploymentForkTest \
///           --fork-url https://rpc.mainnet.chain.robinhood.com -vv
contract LiveDeploymentForkTest is Test {
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    StockPackz constant core = StockPackz(0xEee1458Ad6DeB8Fa35f39FDdbB1aaa12D4A422f3);
    KeeperRandomnessCoordinator constant coordinator =
        KeeperRandomnessCoordinator(0x28A6a8eEa385FEbB9F0D88F6C6064cbE972f9cD7);
    address constant DEPLOYER = 0x59154C6638b39038e648933d1f9a5f03e3677941;

    address user = makeAddr("realUser");

    function setUp() public {
        vm.skip(block.chainid != 4663);
        deal(USDG, user, 100e6);
    }

    function test_live_openPack1_exactFrontendPath() public {
        uint256 requestBefore = coordinator.nextRequestId();

        // Exactly what the frontend does: approve price, openPack(1, 500, 0).
        vm.startPrank(user);
        IERC20(USDG).approve(address(core), 9.99e6);
        uint256 openingId = core.openPack(1, 500, 0);
        vm.stopPrank();
        console.log("openingId:", openingId);

        // Keeper (deployer holds KEEPER_ROLE in prod) fulfills.
        vm.roll(block.number + 1);
        vm.prank(DEPLOYER);
        coordinator.fulfill(requestBefore, keccak256("live-entropy"));

        (uint256 received, uint256 status) = _openingResult(openingId);
        console.log("status (4=Settled):", status);
        console.log("stock received:", received);
        assertEq(status, 4, "opening did not settle");
        assertGt(received, 0, "no stock delivered");
    }

    function test_live_openPack2_exactFrontendPath() public {
        uint256 requestBefore = coordinator.nextRequestId();
        vm.startPrank(user);
        IERC20(USDG).approve(address(core), 11.99e6);
        uint256 openingId = core.openPack(2, 500, 0);
        vm.stopPrank();

        vm.roll(block.number + 1);
        vm.prank(DEPLOYER);
        coordinator.fulfill(requestBefore, keccak256("live-entropy-2"));

        (uint256 received, uint256 status) = _openingResult(openingId);
        console.log("pack2 status (4=Settled):", status);
        assertEq(status, 4, "opening did not settle");
        assertGt(received, 0, "no stock delivered");
    }

    /// @notice Mirrors the frontend's WETH payment path: user holds only WETH,
    ///         swaps it to USDG through the live adapter, then opens a pack.
    function test_live_payWithWeth_endToEnd() public {
        address weth = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
        address adapter = 0x0B17df805a8C0921cB1B141F4515612028d8E4a7;
        address wethUser = makeAddr("wethUser");
        deal(weth, wethUser, 1e18);

        uint256 probe = adapterQuote(adapter, weth, 1e15);
        uint256 wethNeeded = (uint256(9.99e6) * 1e15 * 103) / (probe * 100);

        vm.startPrank(wethUser);
        IERC20(weth).approve(adapter, wethNeeded);
        (bool ok, bytes memory ret) = adapter.call(
            abi.encodeWithSignature(
                "swapExactInput(address,address,uint256,uint256,address,uint256)",
                weth, USDG, wethNeeded, uint256(9.99e6), wethUser, block.timestamp + 300
            )
        );
        require(ok, "weth->usdg swap failed");
        console.log("USDG received for WETH:", abi.decode(ret, (uint256)));

        IERC20(USDG).approve(address(core), 9.99e6);
        uint256 openingId = core.openPack(1, 500, 0);
        vm.stopPrank();

        vm.roll(block.number + 1);
        uint256 reqId = coordinator.nextRequestId() - 1;
        vm.prank(DEPLOYER);
        coordinator.fulfill(reqId, keccak256("weth-entropy"));

        (uint256 received, uint256 status) = _openingResult(openingId);
        console.log("weth-path status (4=Settled):", status);
        assertEq(status, 4, "opening did not settle");
        assertGt(received, 0, "no stock delivered");
    }

    function adapterQuote(address adapter, address weth, uint256 amountIn) internal view returns (uint256) {
        (bool ok, bytes memory ret) = adapter.staticcall(
            abi.encodeWithSignature("quote(address,address,uint256)", weth, USDG, amountIn)
        );
        require(ok, "quote failed");
        return abi.decode(ret, (uint256));
    }

    /// @dev The openings getter returns a fully static tuple, so each field
    ///      occupies a fixed 32-byte slot: stockAmountReceived is field 14,
    ///      status is field 25 (matches the frontend ABI in src/lib/onchain.ts).
    function _openingResult(uint256 id) internal view returns (uint256 received, uint256 status) {
        (bool ok, bytes memory data) =
            address(core).staticcall(abi.encodeWithSignature("openings(uint256)", id));
        require(ok, "openings() failed");
        assembly {
            received := mload(add(data, add(32, mul(14, 32))))
            status := mload(add(data, add(32, mul(25, 32))))
        }
    }
}
