// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IRandomnessConsumer} from "../interfaces/IRandomnessCoordinator.sol";

interface IHoodPackzBeacon {
    function requestRandomness(uint32 numWords, uint256 exposure) external returns (uint256 requestId);
    function requestRound(uint256 requestId) external view returns (uint256 roundId);
    function roundStatus(uint256 roundId) external view returns (uint8 status);
}

/// @notice Pre-funded three-token packs settled by the bonded threshold beacon.
contract HoodPackzCore is IRandomnessConsumer, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant ASSET_COUNT = 7;
    uint8 public constant PRIZE_COUNT = 3;
    uint16 public constant PRIZE_BPS = 8_000;
    uint16 public constant JACKPOT_BPS = 1_000;
    uint16 public constant PROTOCOL_BPS = 1_000;
    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant JACKPOT_ODDS = 25_000;
    uint16 public constant JACKPOT_PAYOUT_BPS = 9_000;
    uint8 private constant ALL_PRIZES_CLAIMED = 7;
    uint8 private constant FINALIZED_ROUND_STATUS = 2;
    uint8 private constant CANCELLED_ROUND_STATUS = 3;

    enum PackTier {
        Corner,
        Block,
        City
    }

    enum OpeningStatus {
        Pending,
        Drawn,
        Settled,
        Refunded
    }

    struct AssetConfig {
        IERC20 token;
        uint32 weight;
        uint256[3] rewards;
    }

    struct Asset {
        IERC20 token;
        uint32 weight;
        uint256[3] rewards;
        uint256 available;
        uint256 reserved;
    }

    struct Opening {
        address user;
        uint256 requestId;
        uint256 roundId;
        uint256 price;
        uint256 jackpotStake;
        uint256 jackpotPayout;
        address[3] prizes;
        uint256[3] amounts;
        PackTier tier;
        OpeningStatus status;
        uint8 claimedPrizes;
        bool jackpotWinner;
        bool jackpotClaimed;
    }

    IERC20 public immutable usdg;
    IHoodPackzBeacon public immutable beacon;
    address public immutable inventoryTreasury;
    address public immutable protocolTreasury;
    bytes32 public immutable deploymentConfigHash;

    bool public openingsPaused = true;
    uint256 public nextOpeningId = 1;
    uint256 public jackpotBalance;
    uint256 public pendingPaymentLiability;
    uint256 public pendingJackpotStakeLiability;
    uint256 public pendingJackpotLiability;
    uint256 public inventoryProceedsBalance;
    uint256 public protocolFeeBalance;

    uint256[3] public prizeValueCaps;
    uint256[3] public jackpotStakeCaps;

    Asset[ASSET_COUNT] private _assets;
    mapping(uint256 => Opening) private _openings;
    mapping(uint256 => uint256) public requestOpening;

    event InventoryFunded(uint8 indexed assetIndex, address indexed funder, uint256 amount);
    event InventoryWithdrawn(uint8 indexed assetIndex, address indexed receiver, uint256 amount);
    event JackpotFunded(address indexed funder, uint256 amount);
    event OpeningRequested(
        uint256 indexed openingId, uint256 indexed requestId, address indexed user, PackTier tier, uint256 price
    );
    event OpeningDrawn(
        uint256 indexed openingId, address indexed user, address[3] prizes, uint256[3] amounts, uint256 jackpotPayout
    );
    event PrizeClaimed(
        uint256 indexed openingId, uint8 indexed prizeIndex, address indexed receiver, address token, uint256 amount
    );
    event JackpotClaimed(uint256 indexed openingId, address indexed receiver, uint256 amount);
    event OpeningSettled(uint256 indexed openingId, address indexed user);
    event OpeningRefunded(uint256 indexed openingId, address indexed user, uint256 amount);
    event InventoryProceedsWithdrawn(address indexed receiver, uint256 amount);
    event ProtocolFeesWithdrawn(address indexed receiver, uint256 amount);
    event OpeningsPaused(bool paused);

    error InvalidConfiguration();
    error InvalidAmount();
    error InvalidAsset();
    error InvalidPrize();
    error InvalidReceiver();
    error DuplicateAsset();
    error FeeOnTransferNotSupported();
    error InexactTokenTransfer();
    error InsufficientInventory();
    error InsufficientBalance();
    error InsolventBalance();
    error OpeningsArePaused();
    error UnknownRequest();
    error DuplicateRequest();
    error InvalidRandomWords();
    error OpeningNotPending();
    error OpeningNotDrawn();
    error PrizeAlreadyClaimed();
    error JackpotNotClaimable();
    error RoundNotCancelled();
    error RoundNotFinalized();
    error Unauthorized();

    constructor(
        IERC20 paymentToken,
        address randomnessBeacon,
        address inventoryRecipient,
        address protocolRecipient,
        AssetConfig[] memory configs,
        uint256[3] memory configuredPrizeValueCaps,
        uint256[3] memory configuredJackpotStakeCaps,
        address admin
    ) {
        if (
            address(paymentToken) == address(0) || randomnessBeacon == address(0) || inventoryRecipient == address(0)
                || protocolRecipient == address(0) || admin == address(0) || configs.length != ASSET_COUNT
        ) revert InvalidConfiguration();

        for (uint8 tier = 0; tier < 3; tier++) {
            if (configuredPrizeValueCaps[tier] == 0 || configuredJackpotStakeCaps[tier] == 0) {
                revert InvalidConfiguration();
            }
        }

        usdg = paymentToken;
        beacon = IHoodPackzBeacon(randomnessBeacon);
        inventoryTreasury = inventoryRecipient;
        protocolTreasury = protocolRecipient;
        prizeValueCaps = configuredPrizeValueCaps;
        jackpotStakeCaps = configuredJackpotStakeCaps;
        deploymentConfigHash = keccak256(
            abi.encode(
                paymentToken,
                randomnessBeacon,
                inventoryRecipient,
                protocolRecipient,
                configs,
                configuredPrizeValueCaps,
                configuredJackpotStakeCaps,
                admin
            )
        );
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        for (uint8 i = 0; i < ASSET_COUNT; i++) {
            AssetConfig memory config = configs[i];
            if (
                address(config.token) == address(0) || config.weight == 0 || config.rewards[0] == 0
                    || config.rewards[1] == 0 || config.rewards[2] == 0
            ) revert InvalidAsset();
            for (uint8 j = 0; j < i; j++) {
                if (address(_assets[j].token) == address(config.token)) revert DuplicateAsset();
            }
            _assets[i] =
                Asset({token: config.token, weight: config.weight, rewards: config.rewards, available: 0, reserved: 0});
        }
    }

    function packPrice(PackTier tier) public pure returns (uint256) {
        if (tier == PackTier.Corner) return 5e6;
        if (tier == PackTier.Block) return 15e6;
        return 50e6;
    }

    function asset(uint8 index)
        external
        view
        returns (IERC20 token, uint32 weight, uint256[3] memory rewards, uint256 available, uint256 reserved)
    {
        if (index >= ASSET_COUNT) revert InvalidAsset();
        Asset storage stored = _assets[index];
        return (stored.token, stored.weight, stored.rewards, stored.available, stored.reserved);
    }

    function getOpening(uint256 openingId) external view returns (Opening memory) {
        return _openings[openingId];
    }

    function setOpeningsPaused(bool paused) external onlyRole(DEFAULT_ADMIN_ROLE) {
        openingsPaused = paused;
        emit OpeningsPaused(paused);
    }

    function fundInventory(uint8 assetIndex, uint256 amount) external nonReentrant {
        if (assetIndex >= ASSET_COUNT) revert InvalidAsset();
        if (amount == 0) revert InvalidAmount();
        Asset storage stored = _assets[assetIndex];
        _pullExact(stored.token, msg.sender, amount);
        stored.available += amount;
        emit InventoryFunded(assetIndex, msg.sender, amount);
    }

    function withdrawInventory(uint8 assetIndex, address receiver, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        if (assetIndex >= ASSET_COUNT) revert InvalidAsset();
        _validateReceiver(receiver);
        Asset storage stored = _assets[assetIndex];
        if (amount == 0 || amount > stored.available) revert InsufficientInventory();
        if (stored.token.balanceOf(address(this)) < stored.available + stored.reserved) revert InsolventBalance();
        stored.available -= amount;
        _pushExact(stored.token, receiver, amount);
        emit InventoryWithdrawn(assetIndex, receiver, amount);
    }

    function fundJackpot(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        _pullExact(usdg, msg.sender, amount);
        jackpotBalance += amount;
        emit JackpotFunded(msg.sender, amount);
    }

    function openPack(PackTier tier) external nonReentrant returns (uint256 openingId) {
        if (openingsPaused) revert OpeningsArePaused();
        uint8 tierIndex = uint8(tier);
        uint256 price = packPrice(tier);
        _reserveAll(tierIndex);
        _pullExact(usdg, msg.sender, price);

        uint256 jackpotCap = jackpotStakeCaps[tierIndex];
        uint256 jackpotStake = jackpotBalance < jackpotCap ? jackpotBalance : jackpotCap;
        jackpotBalance -= jackpotStake;
        pendingJackpotStakeLiability += jackpotStake;
        uint256 exposure = price + prizeValueCaps[tierIndex] + jackpotStake;
        uint256 requestId = beacon.requestRandomness(4, exposure);
        if (requestOpening[requestId] != 0) revert DuplicateRequest();
        uint256 roundId = beacon.requestRound(requestId);
        openingId = nextOpeningId++;
        _openings[openingId] = Opening({
            user: msg.sender,
            requestId: requestId,
            roundId: roundId,
            price: price,
            jackpotStake: jackpotStake,
            jackpotPayout: 0,
            prizes: [address(0), address(0), address(0)],
            amounts: [uint256(0), uint256(0), uint256(0)],
            tier: tier,
            status: OpeningStatus.Pending,
            claimedPrizes: 0,
            jackpotWinner: false,
            jackpotClaimed: false
        });
        requestOpening[requestId] = openingId;
        pendingPaymentLiability += price;
        emit OpeningRequested(openingId, requestId, msg.sender, tier, price);
    }

    /// @notice Records immutable draw results. ERC-20 delivery remains independently retryable.
    function rawFulfillRandomness(uint256 requestId, uint256[] calldata randomWords) external nonReentrant {
        if (msg.sender != address(beacon)) revert UnknownRequest();
        if (randomWords.length < 4) revert InvalidRandomWords();
        uint256 openingId = requestOpening[requestId];
        Opening storage opening = _openings[openingId];
        if (openingId == 0 || opening.requestId != requestId) revert UnknownRequest();
        if (opening.status != OpeningStatus.Pending) revert OpeningNotPending();
        if (beacon.roundStatus(opening.roundId) != FINALIZED_ROUND_STATUS) revert RoundNotFinalized();

        uint8[PRIZE_COUNT] memory selected = _sampleWithoutReplacement(randomWords);
        _recordPrizes(opening, selected);
        _recordPayment(opening, randomWords[3]);
        opening.status = OpeningStatus.Drawn;
        pendingPaymentLiability -= opening.price;
        pendingJackpotStakeLiability -= opening.jackpotStake;

        emit OpeningDrawn(openingId, opening.user, opening.prizes, opening.amounts, opening.jackpotPayout);
    }

    function claimPrize(uint256 openingId, uint8 prizeIndex, address receiver) external nonReentrant {
        Opening storage opening = _openings[openingId];
        if (msg.sender != opening.user) revert Unauthorized();
        if (opening.status != OpeningStatus.Drawn) revert OpeningNotDrawn();
        if (prizeIndex >= PRIZE_COUNT) revert InvalidPrize();
        uint8 claimBit = uint8(1) << prizeIndex;
        if (opening.claimedPrizes & claimBit != 0) revert PrizeAlreadyClaimed();
        _validateReceiver(receiver);

        address tokenAddress = opening.prizes[prizeIndex];
        uint256 amount = opening.amounts[prizeIndex];
        uint8 assetIndex = _assetIndex(tokenAddress);
        opening.claimedPrizes |= claimBit;
        _assets[assetIndex].reserved -= amount;
        _pushExact(IERC20(tokenAddress), receiver, amount);
        emit PrizeClaimed(openingId, prizeIndex, receiver, tokenAddress, amount);

        _markSettledIfComplete(openingId, opening);
    }

    function claimJackpot(uint256 openingId, address receiver) external nonReentrant {
        Opening storage opening = _openings[openingId];
        if (msg.sender != opening.user) revert Unauthorized();
        if (
            (opening.status != OpeningStatus.Drawn && opening.status != OpeningStatus.Settled) || !opening.jackpotWinner
                || opening.jackpotClaimed
        ) revert JackpotNotClaimable();
        _validateReceiver(receiver);

        uint256 payout = opening.jackpotPayout;
        opening.jackpotClaimed = true;
        pendingJackpotLiability -= payout;
        _pushExact(usdg, receiver, payout);
        emit JackpotClaimed(openingId, receiver, payout);
        _markSettledIfComplete(openingId, opening);
    }

    function refundCancelledOpening(uint256 openingId) external nonReentrant {
        Opening storage opening = _openings[openingId];
        if (opening.status != OpeningStatus.Pending) revert OpeningNotPending();
        if (beacon.roundStatus(opening.roundId) != CANCELLED_ROUND_STATUS) revert RoundNotCancelled();

        _releaseAll(uint8(opening.tier));
        jackpotBalance += opening.jackpotStake;
        pendingJackpotStakeLiability -= opening.jackpotStake;
        opening.status = OpeningStatus.Refunded;
        pendingPaymentLiability -= opening.price;
        _pushExact(usdg, opening.user, opening.price);
        emit OpeningRefunded(openingId, opening.user, opening.price);
    }

    function withdrawInventoryProceeds(address receiver, uint256 amount) external nonReentrant {
        if (msg.sender != inventoryTreasury) revert Unauthorized();
        _validateReceiver(receiver);
        if (amount == 0 || amount > inventoryProceedsBalance) revert InsufficientBalance();
        _requireUsdgSolvent();
        inventoryProceedsBalance -= amount;
        _pushExact(usdg, receiver, amount);
        emit InventoryProceedsWithdrawn(receiver, amount);
    }

    function withdrawProtocolFees(address receiver, uint256 amount) external nonReentrant {
        if (msg.sender != protocolTreasury) revert Unauthorized();
        _validateReceiver(receiver);
        if (amount == 0 || amount > protocolFeeBalance) revert InsufficientBalance();
        _requireUsdgSolvent();
        protocolFeeBalance -= amount;
        _pushExact(usdg, receiver, amount);
        emit ProtocolFeesWithdrawn(receiver, amount);
    }

    function _reserveAll(uint8 tierIndex) internal {
        for (uint8 i = 0; i < ASSET_COUNT; i++) {
            Asset storage stored = _assets[i];
            uint256 reward = stored.rewards[tierIndex];
            if (stored.available < reward) revert InsufficientInventory();
            stored.available -= reward;
            stored.reserved += reward;
        }
    }

    function _releaseAll(uint8 tierIndex) internal {
        for (uint8 i = 0; i < ASSET_COUNT; i++) {
            Asset storage stored = _assets[i];
            uint256 reward = stored.rewards[tierIndex];
            stored.reserved -= reward;
            stored.available += reward;
        }
    }

    function _sampleWithoutReplacement(uint256[] calldata randomWords)
        internal
        view
        returns (uint8[PRIZE_COUNT] memory selected)
    {
        bool[ASSET_COUNT] memory used;
        for (uint8 draw = 0; draw < PRIZE_COUNT; draw++) {
            uint256 totalWeight;
            for (uint8 i = 0; i < ASSET_COUNT; i++) {
                if (!used[i]) totalWeight += _assets[i].weight;
            }

            uint256 cursor = randomWords[draw] % totalWeight;
            for (uint8 i = 0; i < ASSET_COUNT; i++) {
                if (used[i]) continue;
                uint256 weight = _assets[i].weight;
                if (cursor < weight) {
                    selected[draw] = i;
                    used[i] = true;
                    break;
                }
                cursor -= weight;
            }
        }
    }

    function _recordPrizes(Opening storage opening, uint8[PRIZE_COUNT] memory selected) internal {
        uint8 tierIndex = uint8(opening.tier);
        bool[ASSET_COUNT] memory won;
        for (uint8 draw = 0; draw < PRIZE_COUNT; draw++) {
            uint8 selectedIndex = selected[draw];
            Asset storage selectedAsset = _assets[selectedIndex];
            won[selectedIndex] = true;
            opening.prizes[draw] = address(selectedAsset.token);
            opening.amounts[draw] = selectedAsset.rewards[tierIndex];
        }

        for (uint8 i = 0; i < ASSET_COUNT; i++) {
            if (won[i]) continue;
            Asset storage stored = _assets[i];
            uint256 reward = stored.rewards[tierIndex];
            stored.reserved -= reward;
            stored.available += reward;
        }
    }

    function _recordPayment(Opening storage opening, uint256 jackpotWord) internal {
        uint256 prizeFunding = (opening.price * PRIZE_BPS) / BPS_DENOMINATOR;
        uint256 jackpotContribution = (opening.price * JACKPOT_BPS) / BPS_DENOMINATOR;
        uint256 protocolFee = opening.price - prizeFunding - jackpotContribution;
        inventoryProceedsBalance += prizeFunding;
        protocolFeeBalance += protocolFee;

        uint256 openingJackpot = opening.jackpotStake + jackpotContribution;
        if (jackpotWord % JACKPOT_ODDS != 0) {
            jackpotBalance += openingJackpot;
            return;
        }
        uint256 payout = (openingJackpot * JACKPOT_PAYOUT_BPS) / BPS_DENOMINATOR;
        jackpotBalance += openingJackpot - payout;
        pendingJackpotLiability += payout;
        opening.jackpotWinner = true;
        opening.jackpotPayout = payout;
    }

    function _assetIndex(address token) internal view returns (uint8 index) {
        for (uint8 i = 0; i < ASSET_COUNT; i++) {
            if (address(_assets[i].token) == token) return i;
        }
        revert InvalidAsset();
    }

    function _markSettledIfComplete(uint256 openingId, Opening storage opening) internal {
        if (opening.claimedPrizes == ALL_PRIZES_CLAIMED && (!opening.jackpotWinner || opening.jackpotClaimed)) {
            opening.status = OpeningStatus.Settled;
            emit OpeningSettled(openingId, opening.user);
        }
    }

    function _validateReceiver(address receiver) internal view {
        if (receiver == address(0) || receiver == address(this)) revert InvalidReceiver();
    }

    function _requireUsdgSolvent() internal view {
        uint256 accounted = pendingPaymentLiability + pendingJackpotStakeLiability + pendingJackpotLiability
            + jackpotBalance + inventoryProceedsBalance + protocolFeeBalance;
        if (usdg.balanceOf(address(this)) < accounted) revert InsolventBalance();
    }

    function _pullExact(IERC20 token, address from, uint256 amount) internal {
        uint256 beforeBalance = token.balanceOf(address(this));
        token.safeTransferFrom(from, address(this), amount);
        if (token.balanceOf(address(this)) - beforeBalance != amount) revert FeeOnTransferNotSupported();
    }

    function _pushExact(IERC20 token, address receiver, uint256 amount) internal {
        uint256 contractBalanceBefore = token.balanceOf(address(this));
        uint256 receiverBalanceBefore = token.balanceOf(receiver);
        token.safeTransfer(receiver, amount);
        if (
            contractBalanceBefore - token.balanceOf(address(this)) != amount
                || token.balanceOf(receiver) - receiverBalanceBefore != amount
        ) revert InexactTokenTransfer();
    }
}
