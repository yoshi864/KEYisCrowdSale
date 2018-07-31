/* KEY Token Sale Smart Contract
 *
 * Supply = 226 Million
 * Pricing Stages = 4 (+30, +20, +10, +0 % Bonus)
 * Distribution: 75 Sale
 * Sale duration = Manually set
 */

pragma solidity ^0.4.23;

import "./KEYToken.sol";

contract TokenSale is KEYToken {
	using SafeMath for uint256;

	address public owner;
	uint8 public currentTier = 0; // Current Pricing Tier.
	bool public tiersEnabled = false; // Enable/Disable tier pricing
	bool public enableSale = true;

	mapping(uint8 => uint256) public tierToRates;

	constructor() public {
		owner = msg.sender;
		balances[this] = totalSupply;
	}

	modifier onlyOwner {
		require(owner == msg.sender);
		_;
	}

	modifier saleOngoing {
		require(enableSale == true);
		_;
	}

	// Set a new owner
	function setOwner(address _newOwnerAddress) public onlyOwner returns (bool success) {
		require (_newOwnerAddress != address(0));
		owner = _newOwnerAddress;
		return true;
	}

	// Disable sale (CANNOT BE REVERTED)
	function disableSale() public onlyOwner returns (bool success) {
		enableSale = false;
		return true;
	}

	// Get total ETH raised
	// TODO: Decide if onlyOwner necessary (i.e. make available for web3 integration)
	function getEthRaised() public view onlyOwner returns (uint256 total) {
		return address(this).balance;
	}

	// Set tier rates
	function setTiers(uint256 _tier1Rate, uint256 _tier2Rate) public onlyOwner saleOngoing returns (bool success) {
		tiersEnabled = true;
		tierToRates[1] = _tier1Rate;
		tierToRates[2] = _tier2Rate;
		return true;
	}

	// Switch to the next tier
	// NOTE: This could happen automatically using a DateTime library, or we could do it manually. Decision pending.
	function switchTiers(uint8 _tier) public onlyOwner returns (bool success) {
		require(_tier == 1 || _tier == 2);
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

		balances[msg.sender] = balances[msg.sender].add(quantity);
		balances[address(this)] = balances[address(this)].sub(quantity);

		emit Transfer(this, msg.sender, quantity);

		// TODO: Add a proper withdraw wallet. For now, transfer to owner.
		owner.transfer(msg.value);
	}
}
