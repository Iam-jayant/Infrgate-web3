// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title InfrgateSubscription
 * @notice Subscription gateway for AI agents on BOT Chain.
 *
 * Agents pay with native BOT or USDT to subscribe to inference tiers.
 * Each subscription lasts 30 days and grants a metered token quota.
 * An off-chain listener detects `Subscribed` events and provisions
 * API keys in the Infrgate backend.
 *
 * @dev Tier.FREE (0) is handled off-chain via wallet-signature gating;
 *      on-chain subscriptions are only for STANDARD and ENTERPRISE.
 */
contract InfrgateSubscription is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ─── Enums ────────────────────────────────────────────────────────────

    enum Tier {
        FREE,       // 0 — off-chain only, no on-chain tx required
        STANDARD,   // 1 — 10 USDT / 100 BOT per month
        ENTERPRISE  // 2 — 50 USDT / 500 BOT per month
    }

    enum PayToken {
        BOT,    // 0 — native token
        USDT    // 1 — ERC-20
    }

    // ─── Structs ──────────────────────────────────────────────────────────

    struct Subscription {
        Tier tier;
        uint256 expiresAt;
        uint256 tokenQuota;
        uint256 subscribedAt;
    }

    // ─── State ────────────────────────────────────────────────────────────

    IERC20 public immutable usdt;

    /// @notice USDT price per tier (6 decimals, e.g. 10e6 = 10 USDT)
    mapping(Tier => uint256) public tierPriceUsdt;

    /// @notice Native BOT price per tier (18 decimals, e.g. 100e18 = 100 BOT)
    mapping(Tier => uint256) public tierPriceBOT;

    /// @notice Inference token quota granted per tier per billing period
    mapping(Tier => uint256) public tierTokenQuota;

    /// @notice Active subscription for each wallet address
    mapping(address => Subscription) public subscriptions;

    /// @notice Duration of each subscription period
    uint256 public constant SUBSCRIPTION_DURATION = 30 days;

    // ─── Events ───────────────────────────────────────────────────────────

    /**
     * @notice Emitted when a user subscribes or renews.
     * @dev The off-chain listener uses this event to provision API keys.
     *      All necessary data is in the event — no follow-up RPC calls needed.
     */
    event Subscribed(
        address indexed subscriber,
        Tier    tier,
        PayToken payToken,
        uint256 amount,
        uint256 expiresAt,
        uint256 tokenQuota
    );

    /// @notice Emitted when the contract owner updates tier pricing.
    event TierPriceUpdated(
        Tier    tier,
        PayToken payToken,
        uint256 newPrice
    );

    /// @notice Emitted when the contract owner updates tier token quotas.
    event TierQuotaUpdated(
        Tier    tier,
        uint256 newQuota
    );

    /// @notice Emitted when funds are withdrawn by the owner.
    event Withdrawn(
        address indexed to,
        PayToken payToken,
        uint256 amount
    );

    // ─── Constructor ──────────────────────────────────────────────────────

    /**
     * @param _usdt Address of the USDT ERC-20 contract on BOT Chain.
     *              Mainnet: 0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C
     */
    constructor(address _usdt) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT address");
        usdt = IERC20(_usdt);

        // ── Default USDT prices (6 decimals) ─────────────────────────────
        tierPriceUsdt[Tier.FREE]       = 0;
        tierPriceUsdt[Tier.STANDARD]   = 10 * 1e6;   // 10 USDT
        tierPriceUsdt[Tier.ENTERPRISE] = 50 * 1e6;   // 50 USDT

        // ── Default BOT prices (18 decimals) ─────────────────────────────
        tierPriceBOT[Tier.FREE]       = 0;
        tierPriceBOT[Tier.STANDARD]   = 100 ether;   // 100 BOT
        tierPriceBOT[Tier.ENTERPRISE] = 500 ether;   // 500 BOT

        // ── Default token quotas ─────────────────────────────────────────
        tierTokenQuota[Tier.FREE]       = 10_000;
        tierTokenQuota[Tier.STANDARD]   = 100_000;
        tierTokenQuota[Tier.ENTERPRISE] = 1_000_000;
    }

    // ─── Public: Subscribe ────────────────────────────────────────────────

    /**
     * @notice Subscribe with USDT (ERC-20).
     * @dev Caller must first `approve()` this contract for the tier price.
     * @param _tier The subscription tier (STANDARD or ENTERPRISE).
     */
    function subscribeWithUSDT(Tier _tier) external nonReentrant whenNotPaused {
        require(_tier != Tier.FREE, "Free tier is off-chain");
        uint256 price = tierPriceUsdt[_tier];
        require(price > 0, "Tier price not set");

        usdt.safeTransferFrom(msg.sender, address(this), price);
        _subscribe(msg.sender, _tier, PayToken.USDT, price);
    }

    /**
     * @notice Subscribe with native BOT token.
     * @param _tier The subscription tier (STANDARD or ENTERPRISE).
     */
    function subscribeWithBOT(Tier _tier) external payable nonReentrant whenNotPaused {
        require(_tier != Tier.FREE, "Free tier is off-chain");
        uint256 price = tierPriceBOT[_tier];
        require(price > 0, "Tier price not set");
        require(msg.value == price, "Incorrect BOT amount");

        _subscribe(msg.sender, _tier, PayToken.BOT, price);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    /**
     * @notice Check if a wallet has an active (non-expired) subscription.
     * @param _subscriber The wallet address to check.
     * @return active True if the subscription is active.
     * @return tier The subscription tier.
     * @return expiresAt The expiry timestamp.
     * @return tokenQuota The token quota for the period.
     */
    function isSubscriptionActive(address _subscriber)
        external
        view
        returns (bool active, Tier tier, uint256 expiresAt, uint256 tokenQuota)
    {
        Subscription memory sub = subscriptions[_subscriber];
        active = sub.expiresAt > block.timestamp && sub.subscribedAt > 0;
        tier = sub.tier;
        expiresAt = sub.expiresAt;
        tokenQuota = sub.tokenQuota;
    }

    // ─── Admin: Price Management ──────────────────────────────────────────

    /**
     * @notice Update the USDT price for a tier.
     * @param _tier The tier to update.
     * @param _price New price in USDT (6 decimals).
     */
    function setTierPriceUsdt(Tier _tier, uint256 _price) external onlyOwner {
        require(_tier != Tier.FREE, "Cannot price free tier");
        tierPriceUsdt[_tier] = _price;
        emit TierPriceUpdated(_tier, PayToken.USDT, _price);
    }

    /**
     * @notice Update the native BOT price for a tier.
     * @param _tier The tier to update.
     * @param _price New price in BOT (18 decimals).
     */
    function setTierPriceBOT(Tier _tier, uint256 _price) external onlyOwner {
        require(_tier != Tier.FREE, "Cannot price free tier");
        tierPriceBOT[_tier] = _price;
        emit TierPriceUpdated(_tier, PayToken.BOT, _price);
    }

    /**
     * @notice Update the token quota for a tier.
     * @param _tier The tier to update.
     * @param _quota New token quota.
     */
    function setTierTokenQuota(Tier _tier, uint256 _quota) external onlyOwner {
        tierTokenQuota[_tier] = _quota;
        emit TierQuotaUpdated(_tier, _quota);
    }

    // ─── Admin: Withdraw ──────────────────────────────────────────────────

    /**
     * @notice Withdraw collected USDT to the owner's address.
     */
    function withdrawUSDT() external onlyOwner {
        uint256 balance = usdt.balanceOf(address(this));
        require(balance > 0, "No USDT to withdraw");
        usdt.safeTransfer(owner(), balance);
        emit Withdrawn(owner(), PayToken.USDT, balance);
    }

    /**
     * @notice Withdraw collected native BOT to the owner's address.
     */
    function withdrawBOT() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No BOT to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "BOT transfer failed");
        emit Withdrawn(owner(), PayToken.BOT, balance);
    }

    // ─── Admin: Pause ─────────────────────────────────────────────────────

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _subscribe(
        address _subscriber,
        Tier _tier,
        PayToken _payToken,
        uint256 _amount
    ) internal {
        uint256 expiresAt = block.timestamp + SUBSCRIPTION_DURATION;
        uint256 quota = tierTokenQuota[_tier];

        subscriptions[_subscriber] = Subscription({
            tier: _tier,
            expiresAt: expiresAt,
            tokenQuota: quota,
            subscribedAt: block.timestamp
        });

        emit Subscribed(
            _subscriber,
            _tier,
            _payToken,
            _amount,
            expiresAt,
            quota
        );
    }

    /// @notice Allow the contract to receive native BOT.
    receive() external payable {}
}
