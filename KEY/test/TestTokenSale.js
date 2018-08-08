var TokenSale = artifacts.require("TokenSale");

contract('TokenSale', function(accounts) {
  it("Owner should be address that deployed contract", function() {
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
      return sale.setTierRates(1200, 1100, 1000, { from: accounts[0] });
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

  it("Should set initial tier percentage", function() {
    var sale;
    var tierLimit;

    return TokenSale.deployed().then(function(instance) {
      sale = instance;
      return sale.setInitialTierLimit(10, { from: accounts[0] });
    }).then(function() {
      return sale.getTierLimit.call(0);
    }).then(function(_tierLimit) {
      tierLimit = _tierLimit;
      return sale.investorAlloc();
    }).then(function(investorAlloc) {
      assert.equal(tierLimit, investorAlloc * 0.1, "Limit should be 10% Investor Alloc");
    });
  });

  it("Should set remaining tier percentages", function() {
    var sale;
    var tier1Limit;
    var tier2Limit;
    var tier3Limit;

    return TokenSale.deployed().then(function(instance) {
      sale = instance;
      return sale.setTierLimits(15, 20, 40, { from: accounts[0] });
    }).then(function() {
      return sale.getTierLimit.call(1);
    }).then(function(_tier1Limit) {
      tier1Limit = _tier1Limit;
      return sale.getTierLimit.call(2);
    }).then(function(_tier2Limit) {
      tier2Limit = _tier2Limit;
      return sale.getTierLimit.call(3);
    }).then(function(_tier3Limit) {
      tier3Limit = _tier3Limit;
      return sale.investorAlloc();
    }).then(function(investorAlloc) {
      assert.equal(tier1Limit, investorAlloc * 0.15, "Limit should be 15% Investor Alloc");
      assert.equal(tier2Limit, investorAlloc * 0.2, "Limit should be 20% Investor Alloc");
      assert.equal(tier3Limit, investorAlloc * 0.4, "Limit should be 40% Investor Alloc");
    });
  });

  // Test changing Owner
  it("Should change owner to accounts[1]", function() {
    var sale;
    return TokenSale.deployed().then(function(instance) {
      sale = instance;
      return sale.setOwner(accounts[1], { from: accounts[0] });
    }).then(function() {
      return sale.owner();
    }).then(function(owner) {
      assert.equal(owner, accounts[1], "accounts[1] should now be the owner");
    });
  });

  // TODO: Test setting costs and teams addresses

  // TODO: Test buying tokens
  // it("Should purchase 1300 tokens", function() {
  //
  // });

  // TODO: Test timed tiers for purchasing

  // TODO: Test manually changed tiers

  // TODO: Test limits for tiers

  // TODO: Test Eth sent on each purchase

  // TODO: Test sending unpurchased tokens to reserves

  // TODO: Test sending allocations to designated addresses


  // Disable test function (NOTE: accounts[1] now owner, we have to send from accounts[1])
  it("Should Disale Sale", function() {
    var sale;

    return TokenSale.deployed().then(function(instance) {
      sale = instance;
      return sale.disableSale({ from: accounts[1] });
    }).then(function() {
      return sale.enableSale();
    }).then(function(enableSale) {
      assert.equal(enableSale, false, "Sale should be disabled");
    });
  });

  // Try and change the Tier Rates after disabled sale
  // it("Should not be able to change rates after sale disabled", function() {
  //   var sale;
  //
  // })
});
