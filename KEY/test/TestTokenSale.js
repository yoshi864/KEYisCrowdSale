const TokenSale = artifacts.require("TokenSale");

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

  it('Purchase 2500 Tokens with 1 Ether', async function () {
    await tokenSale.addToWhitelist(accounts[5], {from: accounts[0]});
    // Purchase tokens
    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});

    assert.equal(await tokenSale.balanceOf.call(accounts[5]), 2500, "1 ETH should buy 2500 tokens");
  })

  it('Bonus tokens are owed after purchase', async function () {
    await tokenSale.addToWhitelist(accounts[5], {from: accounts[0]});

    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});

    assert.equal(await tokenSale.getBonusOwings(accounts[5], {from: accounts[0]}), 750);

  })

  it('Purchase tokens with tiers manually changed, and have correct bonuses', async function() {
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

    assert.equal(balanceTier1, 2500, "Tier 0 should have purchased 2500 tokens");
    assert.equal(balanceTier2, 5000, "Tier 1 should have purchased 2500 tokens");
    assert.equal(balanceTier3, 7500, "Tier 2 should have purchased 2500 tokens");

    assert.equal(await tokenSale.getBonusOwings(accounts[5], {from: accounts[0]}), 1500)

  })

  it('Should not be able to change tiers without setting manualTiers', async function () {
    // Expect a revert
    await tryCatch(tokenSale.switchTiers(1, {from: accounts[0]}), errTypes.revert);
  })

  it('Disable Sale', async function () {
    await tokenSale.disableSale({from: accounts[0]});
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

    const maxEthTiers = [(tokenLimit[0] / 3250), (tokenLimit[1] / 3000), (tokenLimit[2] / 2750)];


    // Purchase up to the limit on 1st tier, then try to purchase more
    await tokenSale.buyTokens({value: web3.toWei(maxEthTiers[0], 'ether'), from: accounts[5]});

    console.log(await tokenSale.getBonusOwings(accounts[5], {from: accounts[0]}))

    assert.equal(await tokenSale.getBonusOwings(accounts[5], {from: accounts[0]}), maxEthTiers[0] * 0.3);

    // Purchase up to the limit on 1st tier, then try to purchase more
    await tokenSale.buyTokens({value: web3.toWei(maxEthTiers[1], 'ether'), from: accounts[5]});

    console.log(await tokenSale.getBonusOwings(accounts[5], {from: accounts[0]}))

    // We should now be in 20% stage
    assert.equal(await tokenSale.getBonusOwings(accounts[5], {from: accounts[0]}), (maxEthTiers[0] * 0.3) + (maxEthTiers[1] * 0.2));

    // Purchase up to the limit on 1st tier, then try to purchase more
    await tokenSale.buyTokens({value: web3.toWei(maxEthTiers[2], 'ether'), from: accounts[5]});

    console.log(await tokenSale.getBonusOwings(accounts[5], {from: accounts[0]}))

    // Should now be in 10% stage
    assert.equal(await tokenSale.getBonusOwings(accounts[5], {from: accounts[0]}), (maxEthTiers[0] * 0.3) + (maxEthTiers[1] * 0.2) + (maxEthTiers[2] * 0.1));
    })

  // Test sending unpurchased tokens to reserves
  it('Unsold Tokens return to contract owner', async function () {
    await tokenSale.addToWhitelist(accounts[6], {from: accounts[0]});
    await tokenSale.addToWhitelist(accounts[7], {from: accounts[0]});
    await tokenSale.addToWhitelist(accounts[8], {from: accounts[0]});

    await tokenSale.enableManualTiers({from: accounts[0]});

    // Set different addresses for teams and costs location
    await tokenSale.setTeamsWallet(accounts[1], {from: accounts[0]});
    await tokenSale.setCostsWallet(accounts[2], {from: accounts[0]});

    // Should purchase 200000 tokens into two accounts
    await tokenSale.buyTokens({value: web3.toWei('40', 'ether'), from: accounts[7]});
    await tokenSale.buyTokens({value: web3.toWei('40', 'ether'), from: accounts[8]});

    await tokenSale.switchTiers(1, {from: accounts[0]});

    // Should purchase 50000 tokens into one account
    await tokenSale.buyTokens({value: web3.toWei('20', 'ether'), from: accounts[7]});

    await tokenSale.switchTiers(2, {from: accounts[0]});

    // Should purchase 50000 tokens into one account
    await tokenSale.buyTokens({value: web3.toWei('20', 'ether'), from: accounts[8]});

    await tokenSale.switchTiers(3, {from: accounts[0]});

    // Should purchase 200000 tokens into one account
    await tokenSale.buyTokens({value: web3.toWei('80', 'ether'), from: accounts[6]});

    await tokenSale.disableSale({from: accounts[0]});

    const returned = await tokenSale.investorAlloc() - (200000 + 50000 + 50000 + 200000);

    assert.equal(returned, await tokenSale.balanceOf(accounts[0]));

  })

  // Test sending allocations to designated addresses
  it('Tokens send to team and costs addresses at end of sale', async function () {
    await tokenSale.setTeamsWallet(accounts[1], {from: accounts[0]});
    await tokenSale.setCostsWallet(accounts[2], {from: accounts[0]});

    // end sale
    await tokenSale.disableSale({from: accounts[0]});

    assert.equal(await tokenSale.balanceOf.call(accounts[1]), 33450000);
    assert.equal(await tokenSale.balanceOf.call(accounts[2]), 22300000);
  })

  it('Only owner can withdraw', async function() {
    await tokenSale.addToWhitelist(accounts[7], {from: accounts[0]});

    await tokenSale.buyTokens({value: web3.toWei('40', 'ether'), from: accounts[7]});

    await tryCatch(tokenSale.withdrawFunds(web3.toWei('40', 'ether'), {from: accounts[6]}), errTypes.revert);
  })

  // Test withdrawal function

  it('Withdraw ETH received', async function() {
    await tokenSale.addToWhitelist(accounts[7], {from: accounts[0]});

    await tokenSale.buyTokens({value: web3.toWei('400', 'ether'), from: accounts[7]});

    // Set withdaw wallet
    await tokenSale.setWithdrawWallet(accounts[9], {from: accounts[0]});

    const balanceInitial = web3.eth.getBalance(accounts[9]);

    const receipt = await tokenSale.withdrawFunds.sendTransaction(web3.toWei('400', 'ether'), {from: accounts[0]});

    const balanceAfter = web3.eth.getBalance(accounts[9]);

    assert.equal(web3.toWei('400', 'ether'), web3.fromWei(balanceAfter - balanceInitial));
  })

  // TODO: Full test case
})
