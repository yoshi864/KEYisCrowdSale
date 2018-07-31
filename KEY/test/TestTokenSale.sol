pragma solidity	^0.4.23;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/TokenSale.sol";

contract TestTokenSale {
	TokenSale tokensale = TokenSale(DeployedAddresses.TokenSale());
	
	// Test setting rates
	function testSetRates() public {
		uint tier1 = 1100;
		uint tier2 = 1200;
		
		tokensale.setTiers(tier1, tier2);

		uint returnRate1 = tokensale.tierToRates(1);
		uint returnRate2 = tokensale.tierToRates(2);

		Assert.equal(returnRate1, tier1, "Rate 1 should be 1100");
		Assert.equal(returnRate2, tier2, "Rate 2 should be 1200");
	}

	// Test setting tiers

	// Test purchase

	// Test change owner

	// Test get balance

	// Test sale disable
}
