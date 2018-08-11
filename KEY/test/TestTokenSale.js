const TokenSale = artifacts.require("TokenSale");

const increaseTime = function(seconds) {
  const id = Date.now()

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [seconds],
      id: id,
    }, err1 => {
      if (err1) return reject(err1)

      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id+1,
      }, (err2, res) => {
        return err2 ? reject(err2) : resolve(res)
      })
    })
  })
}

contract('TokenSale', async (accounts) => {
  let tokenSale

  // Reset contract for each test
  beforeEach('Setup new contract for each test', async function () {
    tokenSale = await TokenSale.new();
  })

  it('Owner is address that deployed contract', async function () {
    assert.equal(await tokenSale.owner(), accounts[0]);
  })

  it('Set initial tier rates', async function () {
    await tokenSale.setInitalTierRate(1300, {from: accounts[0]});

    const tierRate = await tokenSale.getTierRate.call(0);

    assert.equal(tierRate, 1300, "Rate should be 1300");
  })

  it('Set remaining tier rates', async function () {
    await tokenSale.setTierRates(1200, 1100, 1000, {from: accounts[0]});

    const tier1Rate = await tokenSale.getTierRate.call(1);
    const tier2Rate = await tokenSale.getTierRate.call(2);
    const tier3Rate = await tokenSale.getTierRate.call(3);

    assert.equal(tier1Rate, 1200);
    assert.equal(tier2Rate, 1100);
    assert.equal(tier3Rate, 1000);
  })

  it('Set intial tier percentage', async function () {
    await tokenSale.setInitialTierLimit(10, {from: accounts[0]});

    const tierLimit = await tokenSale.getTierLimit(0);
    const investorAlloc = await tokenSale.investorAlloc();

    assert.equal(tierLimit, investorAlloc * 0.1, "Limit should be 10% investor allocation");
  })

  it('Set remaining tier percentages', async function () {
    await tokenSale.setTierLimits(15, 20, 40, {from: accounts[0]});

    const tier1Limit = await tokenSale.getTierLimit.call(1);
    const tier2Limit = await tokenSale.getTierLimit.call(2);
    const tier3Limit = await tokenSale.getTierLimit.call(3);
    const investorAlloc = await tokenSale.investorAlloc();

    assert.equal(tier1Limit, investorAlloc * 0.15);
    assert.equal(tier2Limit, investorAlloc * 0.2);
    assert.equal(tier3Limit, investorAlloc * 0.4);
  })

  it('Change owner to accounts[1]', async function () {
    await tokenSale.setOwner(accounts[1], {from: accounts[0]});
    assert.equal(await tokenSale.owner(), accounts[1]);
  })

  it('Purchase 1300 Tokens with 1 Ether', async function () {
    // Set the initial rate at 1300
    await tokenSale.setInitalTierRate(1300, {from: accounts[0]});

    // Set initial limit at 10% investor allocation
    await tokenSale.setInitialTierLimit(10, {from: accounts[0]});

    // Purchase tokens
    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});

    assert.equal(await tokenSale.balanceOf.call(accounts[5]), 1300, "1 ETH should buy 1300 tokens");
  })

  it('Purchase correct amount of tokens at each interval', async function () {
    // Configure vars
    await tokenSale.setInitalTierRate(1300, {from: accounts[0]});
    await tokenSale.setTierRates(1200, 1100, 1000, {from: accounts[0]});

    await tokenSale.setInitialTierLimit(10, {from: accounts[0]});
    await tokenSale.setTierLimits(15, 20, 40, {from: accounts[0]});


    // Increase the block time by 1 month each time and purchase
    increaseTime(2419200);
    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});
    const balanceInterval1 = await tokenSale.balanceOf.call(accounts[5]);

    increaseTime(2419200);
    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});
    const balanceInterval2 = await tokenSale.balanceOf.call(accounts[5]);

    increaseTime(2419200);
    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});
    const balanceInterval3 = await tokenSale.balanceOf.call(accounts[5]);

    assert.equal(balanceInterval1, 1200);
    assert.equal(balanceInterval2, 2300);
    assert.equal(balanceInterval3, 3300);
  })


  // TODO: better checking
  it('Disable Sale', async function () {
    await tokenSale.disableSale({from: accounts[0]});
    assert.equal(await tokenSale.enableSale(), false, "Sale should be disabled");
  })

  it('Purchase tokens with tiers manually changed (no months passed)', async function() {
    // Configure vars
    await tokenSale.setInitalTierRate(1300, {from: accounts[0]});
    await tokenSale.setTierRates(1200, 1100, 1000, {from: accounts[0]});

    await tokenSale.setInitialTierLimit(10, {from: accounts[0]});
    await tokenSale.setTierLimits(15, 20, 40, {from: accounts[0]});

    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});
    const balanceTier1 = await tokenSale.balanceOf.call(accounts[5]);

    // Switch tiers to 1
    await tokenSale.switchTiers(1, {from: accounts[0]});

    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});
    const balanceTier2 = await tokenSale.balanceOf.call(accounts[5]);

    // Switch tiers to 2
    await tokenSale.switchTiers(2, {from: accounts[0]});

    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});
    const balanceTier3 = await tokenSale.balanceOf.call(accounts[5]);

    // Switch tiers to 3
    await tokenSale.switchTiers(3, {from: accounts[0]});

    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});
    const balanceTier4 = await tokenSale.balanceOf.call(accounts[5]);

    assert.equal(balanceTier1, 1300, "Tier 0 should have purchased 1300 tokens");
    assert.equal(balanceTier2, 2500, "Tier 1 should have purchased 1200 tokens");
    assert.equal(balanceTier3, 3600, "Tier 2 should have purchased 1100 tokens");
    assert.equal(balanceTier4, 4600, "Tier 3 should have purchased 1000 tokens");

  })

  // TODO: More manual conditions


  // TODO: Test limits for tiers (fail once limit hit)

  // TODO: Test Eth sent on each purchase

  // TODO: Test sending unpurchased tokens to reserves
  it('Unsold Tokens return to contract owner', async function () {
    // Set different addresses for teams and costs location
    await tokenSale.setTeamsAddress(accounts[1], {from: accounts[0]});
    await tokenSale.setCostsAddress(accounts[2], {from: accounts[0]});

    // Configure vars
    await tokenSale.setInitalTierRate(1300, {from: accounts[0]});
    await tokenSale.setTierRates(1200, 1100, 1000, {from: accounts[0]});

    await tokenSale.setInitialTierLimit(10, {from: accounts[0]});
    await tokenSale.setTierLimits(15, 20, 40, {from: accounts[0]});

    // Should purchase 104000 tokens into two accounts
    await tokenSale.buyTokens({value: web3.toWei('40', 'ether'), from: accounts[7]});
    await tokenSale.buyTokens({value: web3.toWei('40', 'ether'), from: accounts[8]});

    await tokenSale.switchTiers.call(1);

    // Should purchase 24000 tokens into one account
    await tokenSale.buyTokens({value: web3.toWei('20', 'ether'), from: accounts[7]});

    await tokenSale.switchTiers.call(2);

    // Should purchase 22000 tokens into one account
    await tokenSale.buyTokens({value: web3.toWei('20', 'ether'), from: accounts[8]});

    await tokenSale.switchTiers.call(3);

    // Should purchase 80000 tokens into one account
    await tokenSale.buyTokens({value: web3.toWei('80', 'ether'), from: accounts[9]});

    await tokenSale.disableSale({from: accounts[0]});

    const returned = await tokenSale.investorAlloc() - (104000 + 24000 + 22000 + 80000);

    assert.equal(returned, await tokenSale.balanceOf(accounts[0]));

  })

  // Test sending allocations to designated addresses
  it('Tokens send to team and costs addresses at end of sale', async function () {
    await tokenSale.setTeamsAddress(accounts[1], {from: accounts[0]});
    await tokenSale.setCostsAddress(accounts[2], {from: accounts[0]});

    // end sale
    await tokenSale.disableSale({from: accounts[0]});

    assert.equal(await tokenSale.balanceOf.call(accounts[1]), 33900000);
    assert.equal(await tokenSale.balanceOf.call(accounts[2]), 22600000);
  })

  // TODO: Full test case
})
