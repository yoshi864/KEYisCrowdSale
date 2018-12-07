const TokenSale = artifacts.require("TokenSale");
const StandardRate = 2000;

contract('TokenSale', async (accounts) => {
  let tryCatch = require("./exceptions.js").tryCatch;
  let errTypes = require("./exceptions.js").errTypes;

  let tokenSale

  // Reset contract for each test
  beforeEach('Setup new contract for each test', async function () {
    tokenSale = await TokenSale.new();
  })

  it('Owner is address that deployed contract', async function () {
    assert.equal(await tokenSale.owner(), accounts[0]);
  })

  it('Change owner to accounts[1]', async function () {
    await tokenSale.setOwner(accounts[1], {from: accounts[0]});
    assert.equal(await tokenSale.owner(), accounts[1]);
  })

  it('Nobody but current owner can change owner', async function () {
    await tryCatch(tokenSale.setOwner(accounts[1], {from: accounts[1]}), errTypes.revert);
  })

  it('Default whitelist status is false', async function () {
    assert.equal(await tokenSale.getWhitelistStatus(accounts[1]), false);
  })

  it('Adding to whitelist successfully', async function () {
    await tokenSale.addToWhitelist(accounts[1], {from: accounts[0]});
    assert.equal(await tokenSale.getWhitelistStatus(accounts[1]), true);
  })

  it('Reject purchases under 0.5 eth', async function () {
    await tokenSale.addToWhitelist(accounts[1], {from: accounts[0]});

    await tryCatch(tokenSale.buyTokens({value: web3.toWei('0.3', 'ether'), from: accounts[1]}), errTypes.revert);
  })

  it('Purchase 2000 Tokens with 1 Ether', async function () {
    await tokenSale.addToWhitelist(accounts[5], {from: accounts[0]});
    // Purchase tokens
    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});

    assert.equal(await tokenSale.balanceOf.call(accounts[5]), StandardRate, "1 ETH should buy 2000 tokens");
  })

  it('Purchase tokens with tiers manually changed', async function() {
    await tokenSale.addToWhitelist(accounts[5], {from: accounts[0]});

    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});
    const balanceTier1 = await tokenSale.balanceOf.call(accounts[5]);

    // Turn on manual tiers
    await tokenSale.enableManualTiers({from: accounts[0]});

    // Switch tiers to 1
    await tokenSale.switchTiers(1, {from: accounts[0]});

    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});
    const balanceTier2 = await tokenSale.balanceOf.call(accounts[5]);

    // Switch tiers to 2
    await tokenSale.switchTiers(2, {from: accounts[0]});

    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});
    const balanceTier3 = await tokenSale.balanceOf.call(accounts[5]);

    assert.equal(balanceTier1, StandardRate, "Tier 0 should have purchased 2000 tokens");
    assert.equal(balanceTier2, StandardRate * 2, "Tier 1 should have purchased 2000 tokens");
    assert.equal(balanceTier3, StandardRate * 3, "Tier 2 should have purchased 2000 tokens");
  })

  it('Should not be able to change tiers without setting manualTiers', async function () {
    // Expect a revert
    await tryCatch(tokenSale.switchTiers(1, {from: accounts[0]}), errTypes.revert);
  })

  it('Pause and unpause sale', async function() {
    await tokenSale.addToWhitelist(accounts[5], {from: accounts[0]});
    await tokenSale.pauseSale({from: accounts[0]});

    // Attempt to purchase tokens, expect a revert
    await tryCatch(tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]}), errTypes.revert);

    await tokenSale.unPauseSale({from: accounts[0]});

    // Should now be able to buy tokens
    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});

    assert.equal(await tokenSale.balanceOf.call(accounts[5]), StandardRate, "1 ETH should buy 2000 tokens");
  })

  it('Cannot resume sale once it has ended', async function() {
    await tokenSale.endSale({from: accounts[0]});
    await tryCatch(tokenSale.unPauseSale({from: accounts[0]}), errTypes.revert);
  })

  it('Disable Sale', async function () {
    await tokenSale.endSale({from: accounts[0]});
    assert.equal(await tokenSale.enableSale(), false, "Sale should be disabled");

    // Token purchase should not be possible
    await tryCatch(tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]}), errTypes.revert);
  })

  //  Tiers switch automatically when limits are reached
  it('Tiers switch automatically when limits are reached', async function () {
    await tokenSale.addToWhitelist(accounts[5], {from: accounts[0]});

    const tokenLimit = [];
    for(i = 0; i < 3; i++) {
      tokenLimit[i] = await tokenSale.getTierLimit.call(i);
    }

    const maxEthTiers = [(tokenLimit[0] / StandardRate), (tokenLimit[1] / StandardRate), (tokenLimit[2] / StandardRate)];

    // Purchase up to the limit on 1st tier, then try to purchase more
    await tokenSale.buyTokens({value: web3.toWei(maxEthTiers[0], 'ether'), from: accounts[5]});

    // Purchase up to the limit on 2nd tier, then try to purchase more
    await tokenSale.buyTokens({value: web3.toWei(maxEthTiers[1], 'ether'), from: accounts[5]});

    // Purchase up to the limit on last tier
    await tokenSale.buyTokens({value: web3.toWei(maxEthTiers[2], 'ether'), from: accounts[5]});

    // Should now have purchased all tokens
    assert.equal(await tokenSale.balanceOf(accounts[5]), 150000000);
    assert.equal(await tokenSale.getTokensSold(), 150000000);
  })

  //  Timestamps are correct when switching tiers automatically
  it('Timestamps are correct when switching tiers automatically', async function () {
    await tokenSale.addToWhitelist(accounts[5], {from: accounts[0]});

    tokenLimit = [];
    switchTimes = [];

    for(i = 0; i < 3; i++) {
      tokenLimit[i] = await tokenSale.getTierLimit.call(i);
    }

    const maxEthTiers = [(tokenLimit[0] / StandardRate), (tokenLimit[1] / StandardRate), (tokenLimit[2] / StandardRate)];

    // Purchase up to the limit on 1st tier. Then purchase over remaining
    await tokenSale.buyTokens({value: web3.toWei(maxEthTiers[0] - 1, 'ether'), from: accounts[5]});
    switchTimes[0] = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    await tokenSale.buyTokens({value: web3.toWei(2, 'ether'), from: accounts[5]});

    // Purchase up to the limit on 2nd tier, then try to purchase more
    await tokenSale.buyTokens({value: web3.toWei(maxEthTiers[1] - 3, 'ether'), from: accounts[5]});
    switchTimes[1] = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    await await tokenSale.buyTokens({value: web3.toWei(2, 'ether'), from: accounts[5]});

    // Block timestamps should be equal
    assert.equal(await tokenSale.getStageSwitchTimestamp.call(0), switchTimes[0]);
    assert.equal(await tokenSale.getStageSwitchTimestamp.call(1), switchTimes[1]);

  })


  //  Timestamps are correct when switching tiers manually
  it('Timestamps are correct when switching tiers manually', async function () {

    switchTimes = [];

    // Turn on manual tiers
    await tokenSale.enableManualTiers({from: accounts[0]});
    // Switch tiers to 1
    await tokenSale.switchTiers(1, {from: accounts[0]});
    switchTimes[0] = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

    // Switch tiers to 2
    await tokenSale.switchTiers(2, {from: accounts[0]});
    switchTimes[1] = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

    // Block timestamps should be equal
    assert.equal(await tokenSale.getStageSwitchTimestamp.call(0), switchTimes[0]);
    assert.equal(await tokenSale.getStageSwitchTimestamp.call(1), switchTimes[1]);

  })

  // Test sending unpurchased tokens to reserves
  it('Unsold Tokens return to contract owner', async function () {
    await tokenSale.addToWhitelist(accounts[6], {from: accounts[0]});
    await tokenSale.addToWhitelist(accounts[7], {from: accounts[0]});
    await tokenSale.addToWhitelist(accounts[8], {from: accounts[0]});

    // Set different addresses for teams and costs location
    await tokenSale.setTeamsWallet(accounts[1], {from: accounts[0]});
    await tokenSale.setCostsWallet(accounts[2], {from: accounts[0]});
    await tokenSale.setWithdrawWallet(accounts[3], {from: accounts[0]});

    // Should purchase 200000 tokens into two accounts
    await tokenSale.buyTokens({value: web3.toWei('40', 'ether'), from: accounts[7]});
    await tokenSale.buyTokens({value: web3.toWei('40', 'ether'), from: accounts[8]});


    // Should purchase 50000 tokens into one account
    await tokenSale.buyTokens({value: web3.toWei('20', 'ether'), from: accounts[7]});


    // Should purchase 50000 tokens into one account
    await tokenSale.buyTokens({value: web3.toWei('20', 'ether'), from: accounts[8]});

    // Should purchase 200000 tokens into one account
    await tokenSale.buyTokens({value: web3.toWei('80', 'ether'), from: accounts[6]});

    await tokenSale.endSale({from: accounts[0]});

    const returned = await tokenSale.investorAlloc() - (200 * StandardRate);

    assert.equal(returned, await tokenSale.balanceOf(accounts[3]));

  })

  // Test sending allocations to designated addresses
  it('Tokens send to team and costs addresses at end of sale', async function () {
    await tokenSale.setTeamsWallet(accounts[1], {from: accounts[0]});
    await tokenSale.setCostsWallet(accounts[2], {from: accounts[0]});

    // end sale
    await tokenSale.endSale({from: accounts[0]});

    assert.equal(await tokenSale.balanceOf.call(accounts[1]), 30000000);
    assert.equal(await tokenSale.balanceOf.call(accounts[2]), 20000000);
  })

  // TODO: Full test case
})
