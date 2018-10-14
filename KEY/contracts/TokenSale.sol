/*
 * KEY Token Sale Smart Contract
 */

pragma solidity ^0.4.23;

import "./KEYisToken.sol";

contract TokenSale is KEYisToken {
	using SafeMath for uint256;

	address public owner;

	address public withdrawWallet;
	address public teamsWallet;
	address public costsWallet;

	uint256 birth;
	uint256 end;
	uint256[2] stageSwitchTimeStamps;
	uint256[3] stages;

	mapping(address => bool) whitelist;

	bool public manualTiers = false; // Whether tiers are manually set (i.e. not time based)
	uint8 public currentTier = 0; // Current Pricing Tier. Only used when tiers are manually set

	bool public enableSale = true;

	// Allocation in number of tokens, mutable as supply is dependant on Token contract
	uint256 public investorAlloc;
	uint256 public teamsAlloc;
	uint256 public costsAlloc;

	uint256[3] public tokensSold = [0,0,0];

	// TODO: change to uint8 via mapping?
	uint256[3] public tierToRates;
	uint256[3] public tierToLimits;
	uint256 public standardRate;

	constructor() public {
		owner = msg.sender;
		balances[this] = totalSupply;
		birth = now;

		// Initially set team alloc / costs alloc wallet to owner address
		withdrawWallet = owner;
		teamsWallet = owner;
		costsWallet = owner;

		/* Token allocation numbers:
		* 150000000 - Investors
		* 30000000	- Team
		* 20000000	- Costs
		*/

		investorAlloc = ((totalSupply * 75) / 100) / 1 ether;
		teamsAlloc = ((totalSupply * 15) / 100) / 1 ether;
		costsAlloc = ((totalSupply * 10) / 100) / 1 ether;

		standardRate = 2500;

		tierToLimits = [(investorAlloc * 10) / 100, (investorAlloc * 30) / 100, (investorAlloc * 60) / 100];
	}

	modifier onlyOwner {
		require(owner == msg.sender);
		_;
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
		return tokensSold[0] + tokensSold[1] + tokensSold[2];
	}

	function getTierLimit(uint8 tier) public view returns(uint256 limit) {
		return tierToLimits[tier];
	}

	// Set a new owner
	function setOwner(address _newOwnerAddress) public onlyOwner returns (bool success) {
		require (_newOwnerAddress != address(0));
		owner = _newOwnerAddress;
		return true;
	}

	// Set a new address for withdrawal
	function setWithdrawWallet(address _newWithdrawWallet) public onlyOwner returns (bool success) {
		require (_newWithdrawWallet != address(0));
		withdrawWallet = _newWithdrawWallet;
		return true;
	}

	// Set a new address for costs allocation
	function setCostsWallet(address _newCostsWallet) public onlyOwner returns (bool success) {
		require (_newCostsWallet != address(0));
		costsWallet = _newCostsWallet;
		return true;
	}

	// Set a new address for teams allocation
	function setTeamsWallet(address _newTeamsWallet) public onlyOwner returns (bool success) {
		require (_newTeamsWallet != address(0));
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
	function () public payable {
		revert();
	}

	// Token purchase function. Tokens can ONLY be purchase using this method
	function buyTokens() public saleOngoing payable {
		// Buyer must be on whitelist
		require(whitelist[msg.sender] == true);

		uint256 quantity = 0;
		uint8 stage = 0;
		uint256 remaining = 0;
		uint256 leftoverQuantity = 0;

		// If tier is manually set (enabled on discretion, if all tokens in a stage are sold), then calculate rate accordingly
		if (manualTiers) {
			quantity = (msg.value.mul(standardRate)).div(1 ether);
			stage = currentTier;
		}

		// Otherwise, we need to check if there are enough tokens remaining in the stage.
		else if (tierToLimits[0].sub(tokensSold[0]) > 0) {
			quantity = (msg.value.mul(standardRate)).div(1 ether);

			// Logic for case where purchase amount is greater than remaining amount (tiers must switch)
			if (quantity > tierToLimits[0].sub(tokensSold[0])) {
				// TODO: Requirements for safety?

				remaining = tierToLimits[0].sub(tokensSold[0]);
				leftoverQuantity = quantity.sub(remaining);

				// Add remaining tokens to account
				balances[msg.sender] = balances[msg.sender].add(remaining);
				balances[address(this)] = balances[address(this)].sub(remaining);

				tokensSold[0] = tokensSold[0].add(remaining);

				// Mark timestamp
				stageSwitchTimeStamps[0] = now;

				// Purchase from next tier
				balances[msg.sender] = balances[msg.sender].add(leftoverQuantity);
				balances[address(this)] = balances[address(this)].sub(leftoverQuantity);

				tokensSold[1] = tokensSold[1].add(leftoverQuantity);

				emit Transfer(this, msg.sender, quantity);
				return;
			}
		}
		// Stage 2;
		else if (tierToLimits[1].sub(tokensSold[1]) > 0) {
			quantity = (msg.value.mul(standardRate)).div(1 ether);

			if (quantity > tierToLimits[1].sub(tokensSold[1])) {
				remaining = tierToLimits[1].sub(tokensSold[1]);
				leftoverQuantity = quantity.sub(remaining);

				// Add remaining tokens to account
				balances[msg.sender] = balances[msg.sender].add(remaining);
				balances[address(this)] = balances[address(this)].sub(remaining);

				tokensSold[1] = tokensSold[1].add(remaining);

				// Mark timestamp
				stageSwitchTimeStamps[1] = now;

				// Purchase from next tier
				balances[msg.sender] = balances[msg.sender].add(leftoverQuantity);
				balances[address(this)] = balances[address(this)].sub(leftoverQuantity);

				tokensSold[2] = tokensSold[2].add(leftoverQuantity);

				emit Transfer(this, msg.sender, quantity);
				return;
			}
			stage = 1;
		}
		// Stage 3;
		else {
			quantity = (msg.value.mul(standardRate)).div(1 ether);
			stage = 2;
		}

		// Amount must be greater than 0.5
		require(msg.value >= 0.5 ether);

		// Check if there are enough tokens in current stage to sell
		require(tierToLimits[stage].sub(tokensSold[stage]) >= quantity);

		// If the amount to purchase equals the amount remaining, we switch to next tier
		// if (tierToLimits[stage].sub(tokensSold[stage]) == quantity) {
		// 	stageSwitchTimeStamps[stage] = now;
		// }

		balances[msg.sender] = balances[msg.sender].add(quantity);
		balances[address(this)] = balances[address(this)].sub(quantity);

		tokensSold[stage] = tokensSold[stage].add(quantity);

		emit Transfer(this, msg.sender, quantity);
	}

	// Disable sale (CANNOT BE REVERTED)
	function disableSale() public onlyOwner returns (bool success) {
		// Transfer investor allocation and costs allocation to wallets
		enableSale = false;

		balances[teamsWallet] = balances[teamsWallet].add(teamsAlloc);
		emit Transfer(this, teamsWallet, teamsAlloc);

		balances[costsWallet] = balances[costsWallet].add(costsAlloc);
		emit Transfer(this, costsWallet, costsAlloc);

		// Return any unsold tokens to contract owner

		uint256 remaining = investorAlloc.sub(tokensSold[0].add(tokensSold[1]).add(tokensSold[2]));
		balances[owner] = balances[owner].add(remaining);
		emit Transfer(this, owner, remaining);

		end = now;

		return true;
	}

	// Withdraw eth in contract
	function withdrawFunds(uint256 _amount) public onlyOwner returns (bool success) {
		withdrawWallet.transfer(_amount);
		return true;
	}
}
