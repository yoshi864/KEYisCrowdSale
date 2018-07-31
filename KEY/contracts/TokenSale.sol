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
	uint8 public currentTier = 0; // Current Pricing Tier.
	bool public enableSale = true;
	uint256 public tokensSold = 0;

	// Token Allocation as percentages
	uint8 public investorsNumerator = 75;
	uint8 public teamNumerator = 15;
	uint8 public costsNumerator = 10;

	// Allocation in number of tokens, mutable as supply is dependant on Token contract
	uint256 public investorAlloc;
	uint256 public teamsAlloc;
	uint256 public costsAlloc;


	mapping(uint8 => uint256) public tierToRates;

	constructor() public {
		owner = msg.sender;
		balances[this] = totalSupply;

		investorAlloc = (totalSupply * investorsNumerator) / 100;
		teamsAlloc = (totalSupply * teamNumerator) / 100;
		costsAlloc = (totalSupply * costsNumerator) / 100;
	}

	modifier onlyOwner {
		require(owner == msg.sender);
		_;
	}

	modifier saleOngoing {
		require(enableSale == true);
		_;
	}

	// Get total amount tokens purchased
	function getTokensSold() public view returns (uint256 total) {
		return tokensSold;
	}

	// Set a new owner
	function setOwner(address _newOwnerAddress) public onlyOwner returns (bool success) {
		require (_newOwnerAddress != address(0));
		owner = _newOwnerAddress;
		return true;
	}

	// Set initial tier rate
	function setInitalTierRate(uint256 _tierRate) public onlyOwner saleOngoing returns (bool success) {
		require (currentTier == 0);
		tierToRates[0] = _tierRate;
		return true;
	}

	// Set tier rates
	function setTierRates(uint256 _tier1Rate, uint256 _tier2Rate, uint256 _tier3Rate) public onlyOwner saleOngoing returns (bool success) {
		tierToRates[1] = _tier1Rate;
		tierToRates[2] = _tier2Rate;
		tierToRates[3] = _tier3Rate;
		return true;
	}

	/* Switch to the next tier
	* NOTE: In the final contract, this will most likely happen automatically
	* using a DateTime library, depending on gas efficiency. Decision pending.
	*/
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
		uint256 quantity = (msg.value.mul(tierToRates[currentTier])).div(1 ether);

		// Check if there are enough tokens to sell
		require(investorAlloc.sub(tokensSold) >= quantity);

		balances[msg.sender] = balances[msg.sender].add(quantity);
		balances[address(this)] = balances[address(this)].sub(quantity);

		emit Transfer(this, msg.sender, quantity);

		tokensSold = tokensSold.add(quantity);

		// TODO: Add a proper withdraw wallet. For now, transfer to owner.
		owner.transfer(msg.value);
	}

	// Disable sale (CANNOT BE REVERTED)
	function disableSale() public onlyOwner returns (bool success) {
		enableSale = false;

		// Transfer investor allocation and costs allocation to wallets
		// TODO: Set wallet function. For now, return to owner.
		emit Transfer(this, owner, teamsAlloc);
		emit Transfer(this, owner, costsAlloc);

		return true;
	}
}
