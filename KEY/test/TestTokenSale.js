var TokenSale = artifacts.require("TokenSale");

contract('TokenSale', function(accounts) {
  it("Owner should be address that deployed contract (1st)", function() {
    return TokenSale.deployed().then(function(instance) {
      return instance.owner();
    }).then(function(owner) {
      assert.equal(owner, accounts[0], "Owner is not the 1st address");
    });
  });

  /*
   * Test owner functions
   */

  it("Should set initial tier rates", function() {
    var sale;

    return TokenSale.deployed().then(function(instance) {
      sale = instance;
      return sale.setInitalTierRate(1300, { from: accounts[0] });
    }).then(function() {
      return sale.getTierRate.call(0);
    }).then(function(tierRate) {
      assert.equal(tierRate, 1300, "Rate is not 1300");
    });
  });

  it("Should set remaining tier rates", function() {
    var sale;
    var tier1Rate;
    var tier2Rate;
    var tier3Rate;

    return TokenSale.deployed().then(function(instance) {
      sale = instance;
      return sale.setTierRates(1200, 1100, 1000, { from: accounts[0]} );
    }).then(function() {
      return sale.getTierRate.call(1);
    }).then(function(_tier1Rate) {
      tier1Rate = _tier1Rate;
      return sale.getTierRate.call(2);
    }).then(function(_tier2Rate) {
      tier2Rate = _tier2Rate;
      return sale.getTierRate.call(3);
    }).then(function(_tier3Rate) {
      tier3Rate = _tier3Rate;
    }).then(function() {
      assert.equal(tier1Rate, 1200, "Rate 1 wasn't correctly set");
      assert.equal(tier2Rate, 1100, "Rate 2 wasn't correctly set");
      assert.equal(tier3Rate, 1000, "Rate 3 wasn't correctly set");
    });
  });
});
