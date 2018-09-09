/* KEY Token Sale Smart Contract
 *
 * Supply = 226 Million
 * Pricing Stages = 4 (+30, +20, +10, +0 % Bonus) - set manually
 * Distribution: 75 Sale
 * Sale duration = 4 months, different tier each month. Or manual
 */

pragma solidity ^0.4.23;

import "./KEYToken.sol";

contract TokenSale is KEYToken {
	using SafeMath for uint256;

	address public owner;

	address public withdrawWallet;
	address public teamsWallet;
	address public costsWallet;

	uint256 birth;
	uint256[3] stages;

	mapping(address => bool) whitelist;

	bool public manualTiers = false; // Whether tiers are manually set (i.e. not time based)
	uint8 public currentTier = 0; // Current Pricing Tier. Only used when tiers are manually set

	bool public enableSale = true;

	// Allocation in number of tokens, mutable as supply is dependant on Token contract
	uint256 public investorAlloc;
	uint256 public teamsAlloc;
	uint256 public costsAlloc;

	uint256[4] public tokensSold = [0,0,0,0];

	// TODO: change to uint8 via mapping?
	uint256[4] public tierToRates;
	uint256[4] public tierToLimits;

	constructor() public {
		owner = msg.sender;
		balances[this] = totalSupply;
		birth = now;

		/* Token Sale Stages
		* Stage 1 -> Birth to 1 Month
		* Stage 2 -> Birth + 1 Month to 2 Months
		* Stage 3 -> Birth + 2 Months to 3 Months
		* Stage 4 -> Birth + 3 Months to 4 Months
		*/
		stages[0] = birth + (4 weeks);
		stages[1] = birth + (2 * (4 weeks));
		stages[2] = birth + (3 * (4 weeks));

		// Initially set team alloc / costs alloc wallet to owner address
		withdrawWallet = owner;
		teamsWallet = owner;
		costsWallet = owner;

		/* Token allocation percentages:
		* 75% - Investors
		* 15% - Team
		* 10% - Costs
		*/
		investorAlloc = ((totalSupply * 75) / 100) / 1 ether;
		teamsAlloc = ((totalSupply * 15) / 100) / 1 ether;
		costsAlloc = ((totalSupply * 10) / 100) / 1 ether;

		/* Token Sale Rates and limits
		* Stage 1; 1300 KEYis / Eth, 10% Investor supply allocated
		* Stage 2; 1200 KEYis / Eth, 20% Investor supply allocated
		* Stage 3; 1100 KEYis / Eth, 30% Investor Supply allocated
		* Stage 4; 1000 KEYis / Eth, 40% Investor Supply allocated
		*/
		tierToRates = [1300, 1200, 1100, 1000];
		tierToLimits = [(investorAlloc * 10) / 100, (investorAlloc * 20) / 100, (investorAlloc * 30) / 100, (investorAlloc * 40) / 100];
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

	// Get total amount tokens  purchased
	function getTokensSold() public view returns (uint256 total) {
		return tokensSold[0] + tokensSold[1] + tokensSold[2] + tokensSold[3];
	}

	function getTierRate(uint8 tier) public view returns(uint256 rate) {
		return tierToRates[tier];
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
		require(_tier == 1 || _tier == 2 || _tier == 3);
		require(_tier > currentTier);
		// Safety: Cannot switch to tiers that should have happened in the past
		// TODO: Find a more efficient way to do this.
		if(_tier == 1) {
			require(now < stages[0]);
		} else if (_tier == 2) {
			require(now < stages[1]);
		} else if (_tier == 3) {
			require(now < stages[2]);
		}
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

		// If tier is manually set (enabled on discretion, if all tokens in a stage are sold), then calculate rate accordingly
		if (manualTiers) {
			quantity = (msg.value.mul(tierToRates[currentTier])).div(1 ether);
			stage = currentTier;
		}

		// Stage 1; 30% Bonus
		else if (now < stages[0]) {
			quantity = (msg.value.mul(tierToRates[0])).div(1 ether);
		}
		// Stage 2; 20% Bonus
		else if (now < stages[1]) {
			quantity = (msg.value.mul(tierToRates[1])).div(1 ether);
			stage = 1;
		}
		// Stage 3; 10% Bonus
		else if (now < stages[2]) {
			quantity = (msg.value.mul(tierToRates[2])).div(1 ether);
			stage = 2;
		}
		// Stage 4; No Bonus
		else {
			quantity = (msg.value.mul(tierToRates[3])).div(1 ether);
			stage = 3;
		}

		// Check if there are enough tokens in current stage to sell
		require(tierToLimits[stage].sub(tokensSold[stage]) >= quantity);

		balances[msg.sender] = balances[msg.sender].add(quantity);
		balances[address(this)] = balances[address(this)].sub(quantity);

		tierToLimits[stage] = tierToLimits[stage].sub(quantity);
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

		uint256 remaining = investorAlloc.sub(tokensSold[0].add(tokensSold[1]).add(tokensSold[2]).add(tokensSold[3]));
		balances[owner] = balances[owner].add(remaining);
		emit Transfer(this, owner, remaining);

		return true;
	}

	// Withdraw eth in contract
	function withdrawFunds(uint256 _amount) public onlyOwner returns (bool success) {
		withdrawWallet.transfer(_amount);
		return true;
	}
}
