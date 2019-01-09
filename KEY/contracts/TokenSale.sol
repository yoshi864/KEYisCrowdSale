/*
 * KEY Token Sale Smart Contract
 */

pragma solidity 0.5.0;

import "./KEYisToken.sol";

contract TokenSale is KEYisToken {
	using SafeMath for uint256;

	address payable public owner;

	address payable public withdrawWallet;
	address public teamsWallet;
	address public costsWallet;

	uint256 birth;
	uint256 end;
	uint256[2] stageSwitchTimeStamps;

	mapping(address => bool) whitelist;

	bool public manualTiers = false; // Whether tiers are manually set (i.e. not time based)
	uint256 public currentTier; // Current Pricing Tier

	bool public enableSale = true;

	// Allocation in number of tokens, mutable as supply is dependant on Token contract
	uint256 public investorAlloc;
	uint256 public teamsAlloc;
	uint256 public costsAlloc;

	uint256[3] public tokensSold = [0,0,0];

	uint256[3] public tierToLimits;
	uint256 public standardRate;

	constructor() public {
		owner = msg.sender;
		balances[address(this)] = totalSupply;
		birth = now;
		end = 0;

		currentTier = 0;

		// Initially set team alloc / costs alloc wallet to owner address
		withdrawWallet = owner;
		teamsWallet = owner;
		costsWallet = owner;

		/* Token allocation numbers / percentages (assuming 200 mil supply):
		*  Allocated in this contract only. Bonuses are awarded via invoked function by investor
		*
		* 150000000 / 75% - Investors
		* 30000000 / 15%	- Team
		* 20000000 / 10%	- Costs
		*/

		investorAlloc = ((totalSupply * 75) / 100);
		teamsAlloc = ((totalSupply * 15) / 100);
		costsAlloc = ((totalSupply * 10) / 100);


		// 1 Eth equals...
		standardRate = 2000 * 1 ether;

		tierToLimits = [(investorAlloc * 10) / 100, (investorAlloc * 30) / 100, (investorAlloc * 60) / 100];
	}

	modifier saleOngoing {
		require(enableSale == true);
		_;
	}

	modifier manualTiersSet {
		require(manualTiers == true);
		_;
	}

	// Get whitelist status
	function getWhitelistStatus(address _whitelistAddress) public view returns(bool whitelisted) {
		return whitelist[_whitelistAddress];
	}

	// Get total amount tokens  purchased
	function getTokensSold() public view returns (uint256 total) {
		return (tokensSold[0] + tokensSold[1] + tokensSold[2]) / 1 ether;
	}

	// Get current tier of sale
	function getCurrentTier() public view returns (uint256 tier) {
		return currentTier;
	}

	// Get limits for each tier
	function getTierLimit(uint8 _tier) public view returns(uint256 limit) {
		return tierToLimits[_tier];
	}

	// Get timestamp of tier switch
	function getStageSwitchTimestamp(uint8 _stage) public view returns(uint256 timestamp) {
		return stageSwitchTimeStamps[_stage];
	}

	// Set a new owner
	function setOwner(address payable _newOwnerAddress) public onlyOwner returns (bool success) {
		require (_newOwnerAddress != address(0x0));
		owner = _newOwnerAddress;
		return true;
	}

	// Set a new address for withdrawal
	function setWithdrawWallet(address payable _newWithdrawWallet) public onlyOwner returns (bool success) {
		require (_newWithdrawWallet != address(0x0));
		withdrawWallet = _newWithdrawWallet;
		return true;
	}

	// Set a new address for costs allocation
	function setCostsWallet(address _newCostsWallet) public onlyOwner returns (bool success) {
		require (_newCostsWallet != address(0x0));
		costsWallet = _newCostsWallet;
		return true;
	}

	// Set a new address for teams allocation
	function setTeamsWallet(address _newTeamsWallet) public onlyOwner returns (bool success) {
		require (_newTeamsWallet != address(0x0));
		teamsWallet = _newTeamsWallet;
		return true;
	}

	// Switch to manually changing tiers. CANNOT BE REVERTED
	function enableManualTiers() public onlyOwner returns (bool success) {
		require (manualTiers == false);
		manualTiers = true;
		return true;
	}

	// Switch to the next tier. Only possible if manualTiersSet is true
	function switchTiers(uint8 _tier) public onlyOwner manualTiersSet returns (bool success) {
		require(_tier == 1 || _tier == 2);
		require(_tier > currentTier);

		stageSwitchTimeStamps[_tier - 1] = block.timestamp;
		currentTier = _tier;
		return true;
	}

	// Add an address to the whitelist
	function addToWhitelist(address _whitelistAddress) public onlyOwner returns (bool success) {
		whitelist[_whitelistAddress] = true;
		return true;
	}

	// Remove an address from the whitelist
	function removeFromWhitelist(address _whitelistAddress) public onlyOwner returns (bool success) {
		whitelist[_whitelistAddress] = false;
		return true;
	}

	// Default function - Revert any direct ETH payments
	function () external payable {
		buyTokens();
	}

	// Token purchase function. Tokens can ONLY be purchase using this method
	function buyTokens() public saleOngoing payable {
		// Buyer must be on whitelist
		require(whitelist[msg.sender] == true);

		// Amount must be greater than 0.5
		require(msg.value >= 0.5 ether);

		uint256 quantity = (msg.value.mul(standardRate)).div(1 ether);

		uint256 remaining = 0;
		uint256 leftoverQuantity = 0;


		// Logic for case where purchase amount is greater than remaining amount in a tier (tiers must switch)
		if (quantity > tierToLimits[currentTier].sub(tokensSold[currentTier]) && currentTier != 2) {
			remaining = tierToLimits[currentTier].sub(tokensSold[currentTier]);
			leftoverQuantity = quantity.sub(remaining);

			// Require next tier to have enough tokens for the sale
			require(tierToLimits[currentTier].sub(tokensSold[currentTier]) >= leftoverQuantity, "Not enough tokens in next tier to sell");

			tokensSold[currentTier] = tokensSold[currentTier].add(remaining);

			// Mark timestamp
			stageSwitchTimeStamps[currentTier] = block.timestamp;

			currentTier = currentTier.add(1);

			// Purchase from next tier
			balances[msg.sender] = balances[msg.sender].add(leftoverQuantity);
			balances[address(this)] = balances[address(this)].sub(leftoverQuantity);

			tokensSold[currentTier] = tokensSold[currentTier].add(leftoverQuantity);

			require(tierToLimits[currentTier] >= tokensSold[currentTier]);

			withdrawWallet.transfer(msg.value);
			this.transfer(msg.sender, leftoverQuantity + remaining);

			return;
		}

		// Check if there are enough tokens in current stage to sell
		require(tierToLimits[currentTier].sub(tokensSold[currentTier]) >= quantity, "Not enough tokens in current tier to sell");

		// If the amount to purchase equals the amount remaining, we switch to next tier
		if (tierToLimits[currentTier].sub(tokensSold[currentTier]) == quantity && currentTier != 2) {
			stageSwitchTimeStamps[currentTier] = block.timestamp;
			tokensSold[currentTier] = tokensSold[currentTier].add(quantity);

			require(tierToLimits[currentTier] >= tokensSold[currentTier]);

			currentTier = currentTier.add(1);

			withdrawWallet.transfer(msg.value);
			this.transfer(msg.sender, quantity);

			return;
		}

		tokensSold[currentTier] = tokensSold[currentTier].add(quantity);

		withdrawWallet.transfer(msg.value);
		this.transfer(msg.sender, quantity);
	}

	// Pause sale (prevent purchase of tokens)
	function pauseSale() public onlyOwner saleOngoing returns (bool success) {
		enableSale = false;
		return true;
	}

	// Unpause sale (resume purchase of tokens)
	function unPauseSale() public onlyOwner returns (bool success) {
		// Safety so that this function can't reenable the sale once it has been ended
		require(end == 0);

		enableSale = true;
		return true;
	}

	// Disable sale (CANNOT BE REVERTED)
	function endSale() public onlyOwner saleOngoing returns (bool success) {
		// Transfer investor allocation and costs allocation to wallets
		enableSale = false;

		balances[teamsWallet] = balances[teamsWallet].add(teamsAlloc);
		emit Transfer(address(this), teamsWallet, teamsAlloc);

		balances[costsWallet] = balances[costsWallet].add(costsAlloc);
		emit Transfer(address(this), costsWallet, costsAlloc);

		// Return any unsold tokens to withdrawal Wallet

		uint256 remaining = investorAlloc.sub(tokensSold[0].add(tokensSold[1]).add(tokensSold[2]));
		balances[withdrawWallet] = balances[withdrawWallet].add(remaining);
		emit Transfer(address(this), withdrawWallet, remaining);

		end = block.timestamp;

		return true;
	}
}
