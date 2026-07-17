// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IRandomnessConsumer} from "../../src/interfaces/IRandomnessCoordinator.sol";
import {HoodPackzCore} from "../../src/v2/HoodPackzCore.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";

contract MockPackBeacon {
    uint256 public nextRequestId = 1;
    uint256 public nextRoundId = 1;
    uint256 public lastExposure;
    uint32 public lastNumWords;
    mapping(uint256 => uint256) public requestRound;
    mapping(uint256 => uint8) public roundStatus;

    function requestRandomness(uint32 numWords, uint256 exposure) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        requestRound[requestId] = nextRoundId++;
        lastNumWords = numWords;
        lastExposure = exposure;
    }

    function fulfill(address consumer, uint256 requestId, uint256[4] memory sourceWords) external {
        roundStatus[requestRound[requestId]] = 2;
        uint256[] memory words = new uint256[](4);
        for (uint256 i = 0; i < 4; i++) {
            words[i] = sourceWords[i];
        }
        IRandomnessConsumer(consumer).rawFulfillRandomness(requestId, words);
    }

    function cancelRequest(uint256 requestId) external {
        roundStatus[requestRound[requestId]] = 3;
    }

    function setNextRequestId(uint256 requestId) external {
        nextRequestId = requestId;
    }

    function fulfillCancelled(address consumer, uint256 requestId, uint256[4] memory sourceWords) external {
        uint256[] memory words = new uint256[](4);
        for (uint256 i = 0; i < 4; i++) {
            words[i] = sourceWords[i];
        }
        IRandomnessConsumer(consumer).rawFulfillRandomness(requestId, words);
    }
}

contract HoodPackzCoreTest is Test {
    uint256 internal constant INVENTORY = 100 ether;
    uint256 internal constant CORNER_PRICE = 5e6;
    uint256 internal constant CORNER_PRIZE_CAP = 4e6;
    uint256 internal constant CORNER_JACKPOT_CAP = 5e6;

    address internal admin = makeAddr("admin");
    address internal inventoryTreasury = makeAddr("inventoryTreasury");
    address internal protocolTreasury = makeAddr("protocolTreasury");
    address internal user = makeAddr("user");
    address internal alternateReceiver = makeAddr("alternateReceiver");

    MockERC20 internal usdg;
    MockPackBeacon internal beacon;
    HoodPackzCore internal core;
    MockERC20[7] internal tokens;

    function setUp() public {
        usdg = new MockERC20("USDG", "USDG", 6);
        beacon = new MockPackBeacon();

        HoodPackzCore.AssetConfig[] memory configs = new HoodPackzCore.AssetConfig[](7);
        for (uint256 i = 0; i < 7; i++) {
            tokens[i] = new MockERC20(string.concat("Token ", vm.toString(i)), "TOK", 18);
            configs[i] = HoodPackzCore.AssetConfig({
                token: IERC20(address(tokens[i])),
                // forge-lint: disable-next-line(unsafe-typecast)
                weight: uint32(i + 1),
                rewards: [uint256(1 ether), uint256(2 ether), uint256(3 ether)]
            });
        }

        uint256[3] memory prizeValueCaps = [CORNER_PRIZE_CAP, uint256(12e6), uint256(40e6)];
        uint256[3] memory jackpotStakeCaps = [CORNER_JACKPOT_CAP, uint256(15e6), uint256(50e6)];
        core = new HoodPackzCore(
            IERC20(address(usdg)),
            address(beacon),
            inventoryTreasury,
            protocolTreasury,
            configs,
            prizeValueCaps,
            jackpotStakeCaps,
            admin
        );

        for (uint8 i = 0; i < 7; i++) {
            tokens[i].mint(address(this), INVENTORY);
            tokens[i].approve(address(core), INVENTORY);
            core.fundInventory(i, INVENTORY);
        }

        usdg.mint(user, 1_000e6);
        vm.prank(user);
        usdg.approve(address(core), type(uint256).max);
    }

    function test_deploymentIsPausedByDefault() public {
        assertTrue(core.openingsPaused());
        vm.prank(user);
        vm.expectRevert(HoodPackzCore.OpeningsArePaused.selector);
        core.openPack(HoodPackzCore.PackTier.Corner);
    }

    function test_deploymentConfigHashCommitsConstructorConfiguration() public view {
        assertTrue(core.deploymentConfigHash() != bytes32(0));
    }

    function test_openPackCollectsPaymentAndReservesEveryPossiblePrize() public {
        uint256 openingId = _open(HoodPackzCore.PackTier.Corner);
        HoodPackzCore.Opening memory opening = core.getOpening(openingId);

        assertEq(usdg.balanceOf(user), 1_000e6 - CORNER_PRICE);
        assertEq(core.pendingPaymentLiability(), CORNER_PRICE);
        assertEq(beacon.lastNumWords(), 4);
        assertEq(beacon.lastExposure(), CORNER_PRICE + CORNER_PRIZE_CAP);
        assertEq(opening.user, user);
        assertEq(opening.roundId, beacon.requestRound(opening.requestId));
        assertEq(uint8(opening.status), uint8(HoodPackzCore.OpeningStatus.Pending));
        for (uint8 i = 0; i < 7; i++) {
            (,,, uint256 available, uint256 reserved) = core.asset(i);
            assertEq(available, INVENTORY - 1 ether);
            assertEq(reserved, 1 ether);
        }
    }

    function test_exposureIncludesPrizeCapAndOnlyBoundedJackpotStake() public {
        usdg.mint(address(this), 100e6);
        usdg.approve(address(core), 100e6);
        core.fundJackpot(100e6);

        uint256 openingId = _open(HoodPackzCore.PackTier.Corner);
        HoodPackzCore.Opening memory opening = core.getOpening(openingId);

        assertEq(opening.jackpotStake, CORNER_JACKPOT_CAP);
        assertEq(core.jackpotBalance(), 100e6 - CORNER_JACKPOT_CAP);
        assertEq(beacon.lastExposure(), CORNER_PRICE + CORNER_PRIZE_CAP + CORNER_JACKPOT_CAP);
    }

    function test_callbackRecordsDrawWithoutExternalTokenTransfers() public {
        uint256 openingId = _open(HoodPackzCore.PackTier.Corner);
        uint256 requestId = core.getOpening(openingId).requestId;
        tokens[0].setFeeOnTransferBps(100);

        beacon.fulfill(address(core), requestId, [uint256(0), uint256(0), uint256(0), uint256(1)]);

        HoodPackzCore.Opening memory opening = core.getOpening(openingId);
        assertEq(uint8(opening.status), uint8(HoodPackzCore.OpeningStatus.Drawn));
        assertEq(core.pendingPaymentLiability(), 0);
        assertEq(core.inventoryProceedsBalance(), 4e6);
        assertEq(core.protocolFeeBalance(), 0.5e6);
        assertEq(core.jackpotBalance(), 0.5e6);
        assertEq(tokens[0].balanceOf(user), 0);
    }

    function test_failedPrizeClaimDoesNotBlockOtherClaimsOrPaymentAccounting() public {
        uint256 openingId = _open(HoodPackzCore.PackTier.Corner);
        uint256 requestId = core.getOpening(openingId).requestId;
        tokens[0].setFeeOnTransferBps(100);
        beacon.fulfill(address(core), requestId, [uint256(0), uint256(0), uint256(0), uint256(1)]);

        vm.prank(user);
        vm.expectRevert(HoodPackzCore.InexactTokenTransfer.selector);
        core.claimPrize(openingId, 0, user);

        vm.prank(user);
        core.claimPrize(openingId, 1, alternateReceiver);
        assertEq(tokens[1].balanceOf(alternateReceiver), 1 ether);
        assertEq(uint8(core.getOpening(openingId).status), uint8(HoodPackzCore.OpeningStatus.Drawn));
        assertEq(core.pendingPaymentLiability(), 0);
    }

    function test_claimsThreeUniqueTokensAndAccountsForEightyTenTen() public {
        uint256 openingId = _open(HoodPackzCore.PackTier.Corner);
        _fulfill(openingId, 1);

        HoodPackzCore.Opening memory opening = core.getOpening(openingId);
        assertTrue(opening.prizes[0] != opening.prizes[1]);
        assertTrue(opening.prizes[0] != opening.prizes[2]);
        assertTrue(opening.prizes[1] != opening.prizes[2]);

        for (uint8 i = 0; i < 3; i++) {
            vm.prank(user);
            core.claimPrize(openingId, i, user);
        }
        opening = core.getOpening(openingId);
        assertEq(uint8(opening.status), uint8(HoodPackzCore.OpeningStatus.Settled));
        for (uint256 i = 0; i < 3; i++) {
            assertEq(IERC20(opening.prizes[i]).balanceOf(user), 1 ether);
            assertEq(opening.amounts[i], 1 ether);
        }

        vm.prank(inventoryTreasury);
        core.withdrawInventoryProceeds(inventoryTreasury, 4e6);
        vm.prank(protocolTreasury);
        core.withdrawProtocolFees(protocolTreasury, 0.5e6);
        assertEq(usdg.balanceOf(inventoryTreasury), 4e6);
        assertEq(usdg.balanceOf(protocolTreasury), 0.5e6);
        assertEq(core.jackpotBalance(), 0.5e6);
        assertEq(usdg.balanceOf(address(core)), core.jackpotBalance());
    }

    function test_jackpotWinnerClaimsNinetyPercentAndSeedsTenPercent() public {
        usdg.mint(address(this), 100e6);
        usdg.approve(address(core), 100e6);
        core.fundJackpot(100e6);

        uint256 openingId = _open(HoodPackzCore.PackTier.Corner);
        _fulfill(openingId, 0);

        HoodPackzCore.Opening memory opening = core.getOpening(openingId);
        assertTrue(opening.jackpotWinner);
        assertEq(opening.jackpotPayout, 4.95e6);
        assertEq(core.pendingJackpotLiability(), 4.95e6);
        assertEq(core.jackpotBalance(), 95.55e6);

        for (uint8 i = 0; i < 3; i++) {
            vm.prank(user);
            core.claimPrize(openingId, i, user);
        }
        assertEq(uint8(core.getOpening(openingId).status), uint8(HoodPackzCore.OpeningStatus.Drawn));

        vm.prank(user);
        core.claimJackpot(openingId, alternateReceiver);
        assertEq(usdg.balanceOf(alternateReceiver), 4.95e6);
        assertEq(core.pendingJackpotLiability(), 0);
        assertEq(uint8(core.getOpening(openingId).status), uint8(HoodPackzCore.OpeningStatus.Settled));
    }

    function test_cancelledBeaconRoundAllowsExactRefundAndReleasesInventory() public {
        uint256 openingId = _open(HoodPackzCore.PackTier.City);
        HoodPackzCore.Opening memory beforeRefund = core.getOpening(openingId);
        beacon.cancelRequest(beforeRefund.requestId);

        core.refundCancelledOpening(openingId);

        HoodPackzCore.Opening memory afterRefund = core.getOpening(openingId);
        assertEq(uint8(afterRefund.status), uint8(HoodPackzCore.OpeningStatus.Refunded));
        assertEq(usdg.balanceOf(user), 1_000e6);
        assertEq(core.pendingPaymentLiability(), 0);
        for (uint8 i = 0; i < 7; i++) {
            (,,, uint256 available, uint256 reserved) = core.asset(i);
            assertEq(available, INVENTORY);
            assertEq(reserved, 0);
        }
    }

    function test_cancelledRoundCannotDeliverRandomness() public {
        uint256 openingId = _open(HoodPackzCore.PackTier.Corner);
        uint256 requestId = core.getOpening(openingId).requestId;
        beacon.cancelRequest(requestId);

        vm.expectRevert(HoodPackzCore.RoundNotFinalized.selector);
        beacon.fulfillCancelled(address(core), requestId, [uint256(0), uint256(0), uint256(0), uint256(1)]);
    }

    function test_duplicateBeaconRequestIdCannotOverwriteOpening() public {
        uint256 firstOpeningId = _open(HoodPackzCore.PackTier.Corner);
        uint256 requestId = core.getOpening(firstOpeningId).requestId;
        beacon.setNextRequestId(requestId);

        vm.prank(user);
        vm.expectRevert(HoodPackzCore.DuplicateRequest.selector);
        core.openPack(HoodPackzCore.PackTier.Corner);

        assertEq(core.requestOpening(requestId), firstOpeningId);
        assertEq(usdg.balanceOf(user), 1_000e6 - CORNER_PRICE);
    }

    function test_inexactOutgoingRefundRevertsWithoutChangingState() public {
        uint256 openingId = _open(HoodPackzCore.PackTier.Corner);
        HoodPackzCore.Opening memory opening = core.getOpening(openingId);
        beacon.cancelRequest(opening.requestId);
        usdg.setFeeOnTransferBps(100);

        vm.expectRevert(HoodPackzCore.InexactTokenTransfer.selector);
        core.refundCancelledOpening(openingId);

        assertEq(uint8(core.getOpening(openingId).status), uint8(HoodPackzCore.OpeningStatus.Pending));
        assertEq(core.pendingPaymentLiability(), CORNER_PRICE);
    }

    function test_inventoryWithdrawalCannotConsumeReservedBackingAfterBalanceDeficit() public {
        _open(HoodPackzCore.PackTier.Corner);
        vm.prank(address(core));
        assertTrue(tokens[0].transfer(address(0xdead), 1 ether));

        vm.prank(admin);
        vm.expectRevert(HoodPackzCore.InsolventBalance.selector);
        core.withdrawInventory(0, admin, 1 ether);
    }

    function test_treasuryWithdrawalCannotConsumeUsdGLiabilitiesAfterBalanceDeficit() public {
        uint256 openingId = _open(HoodPackzCore.PackTier.Corner);
        _fulfill(openingId, 1);
        vm.prank(address(core));
        assertTrue(usdg.transfer(address(0xdead), 1));

        vm.prank(inventoryTreasury);
        vm.expectRevert(HoodPackzCore.InsolventBalance.selector);
        core.withdrawInventoryProceeds(inventoryTreasury, 1);
    }

    function test_openPackFailsClosedWhenAnyPossiblePrizeIsUnderfunded() public {
        vm.prank(admin);
        core.withdrawInventory(0, admin, INVENTORY);

        vm.startPrank(admin);
        core.setOpeningsPaused(false);
        vm.stopPrank();
        vm.prank(user);
        vm.expectRevert(HoodPackzCore.InsufficientInventory.selector);
        core.openPack(HoodPackzCore.PackTier.Corner);
        assertEq(usdg.balanceOf(user), 1_000e6);
    }

    function test_feeOnTransferInventoryAndPaymentAreRejected() public {
        tokens[0].setFeeOnTransferBps(100);
        tokens[0].mint(address(this), 1 ether);
        tokens[0].approve(address(core), 1 ether);
        vm.expectRevert(HoodPackzCore.FeeOnTransferNotSupported.selector);
        core.fundInventory(0, 1 ether);

        usdg.setFeeOnTransferBps(100);
        vm.prank(admin);
        core.setOpeningsPaused(false);
        vm.prank(user);
        vm.expectRevert(HoodPackzCore.FeeOnTransferNotSupported.selector);
        core.openPack(HoodPackzCore.PackTier.Corner);
    }

    function testFuzz_samplingNeverReturnsDuplicateAssets(uint256 a, uint256 b, uint256 c) public {
        uint256 openingId = _open(HoodPackzCore.PackTier.Block);
        uint256 requestId = core.getOpening(openingId).requestId;
        beacon.fulfill(address(core), requestId, [a, b, c, uint256(1)]);

        HoodPackzCore.Opening memory opening = core.getOpening(openingId);
        assertTrue(opening.prizes[0] != opening.prizes[1]);
        assertTrue(opening.prizes[0] != opening.prizes[2]);
        assertTrue(opening.prizes[1] != opening.prizes[2]);
    }

    function _open(HoodPackzCore.PackTier tier) internal returns (uint256 openingId) {
        vm.prank(admin);
        core.setOpeningsPaused(false);
        vm.prank(user);
        return core.openPack(tier);
    }

    function _fulfill(uint256 openingId, uint256 jackpotWord) internal {
        uint256 requestId = core.getOpening(openingId).requestId;
        beacon.fulfill(address(core), requestId, [uint256(0), uint256(0), uint256(0), jackpotWord]);
    }
}
