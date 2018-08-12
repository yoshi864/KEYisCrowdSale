/* KEY Token Sale Smart Contract
 *
 * Supply = 226 Million
 * Pricing Stages = 4 (+30, +20, +10, +0 % Bonus) - set by function
 * Distribution: 75 Sale
 * Sale duration = Manually set, DateTime implementation pending
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

	uint8 public currentTier = 0; // Current Pricing Tier.
	bool public enableSale = true;

	// Token Allocation as percentages
	uint8 public investorsNumerator = 75;
	uint8 public teamNumerator = 15;
	uint8 public costsNumerator = 10;

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

		// Configure temporal stages of sale
		stages[0] = birth + (4 weeks);
		stages[1] = birth + (2 * (4 weeks));
		stages[2] = birth + (3 * (4 weeks));

		// Initially set team alloc / costs alloc addresses as owner
		withdrawWallet = owner;
		teamsWallet = owner;
		costsWallet = owner;

		// Calculate allocations
		investorAlloc = ((totalSupply * investorsNumerator) / 100) / 1 ether;
		teamsAlloc = ((totalSupply * teamNumerator) / 100) / 1 ether;
		costsAlloc = ((totalSupply * costsNumerator) / 100) / 1 ether;

		// Specify rates and limits
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

	// Switch to the next tier
	function switchTiers(uint8 _tier) public onlyOwner returns (bool success) {
		require(_tier == 1 || _tier == 2 || _tier == 3);
		require(_tier > currentTier);
		currentTier = _tier;
		return true;
	}

	// Default function - Revert any direct ETH payments
	function () public payable {
		revert();
	}

	// Token purchase function. Tokens can ONLY be purchase using this method
	function buyTokens() public saleOngoing payable {
		uint256 quantity = 0;
		uint8 stage = 0;

		// If tier is manually set (if all tokens in a stage are sold), then calculate rate accordingly
		if (currentTier > 0) {
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
		uint256 remaining = investorAlloc.sub(tokensSold[0] + tokensSold[1] + tokensSold[2] + tokensSold[3]);
		balances[owner] = balances[owner].add(remaining);
		emit Transfer(this, owner, remaining);

		return true;
	}

	// Withdraw eth in contract
	function withdrawFunds() public onlyOwner returns (bool success) {
		withdrawWallet.transfer(address(this).balance);
		return true;
	}
}
