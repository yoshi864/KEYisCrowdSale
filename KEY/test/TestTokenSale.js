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

  it('Purchase 1300 Tokens with 1 Ether', async function () {
    // Purchase tokens
    await tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]});

    assert.equal(await tokenSale.balanceOf.call(accounts[5]), 1300, "1 ETH should buy 1300 tokens");
  })

  it('Purchase correct amount of tokens at each interval', async function () {

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


  it('Disable Sale', async function () {
    await tokenSale.disableSale({from: accounts[0]});
    assert.equal(await tokenSale.enableSale(), false, "Sale should be disabled");

    // Token purchase should not be possible
    await tryCatch(tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]}), errTypes.revert);
  })

  it('Purchase tokens with tiers manually changed (no months passed)', async function() {
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


  // TODO: REWRORK THIS test
  //  tier limits (fail once limit hit)
  it('Cannot purchase more than the allocated amount per tier', async function () {

    const tokenLimit = [];
    for(i = 0; i < 4; i++) {
      tokenLimit[i] = await tokenSale.getTierLimit.call(i);
    }

    const maxEthTiers = [(tokenLimit[0] / 1300), (tokenLimit[1] / 1200), (tokenLimit[2] / 1100), (tokenLimit[3] / 1000)];


    // Purchase up to the limit on 1st tier, then try to purchase more
    await tokenSale.buyTokens({value: web3.toWei(maxEthTiers[0] - 1, 'ether'), from: accounts[5]});

    // Test for revert err
    await tryCatch(tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]}), errTypes.revert);

    await tokenSale.switchTiers(1, {from: accounts[0]});

    // Purchase up to the limit on 1st tier, then try to purchase more
    await tokenSale.buyTokens({value: web3.toWei(maxEthTiers[1] - 1, 'ether'), from: accounts[5]});

    // Test for revert err
    await tryCatch(tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]}), errTypes.revert);

    await tokenSale.switchTiers(2, {from: accounts[0]});

    // Purchase up to the limit on 1st tier, then try to purchase more
    await tokenSale.buyTokens({value: web3.toWei(maxEthTiers[2] - 1, 'ether'), from: accounts[5]});

    // Test for revert err
    await tryCatch(tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]}), errTypes.revert);

    await tokenSale.switchTiers(3, {from: accounts[0]});

    // Purchase up to the limit on 1st tier, then try to purchase more
    await tokenSale.buyTokens({value: web3.toWei(maxEthTiers[3] - 1, 'ether'), from: accounts[5]});

    // Test for revert err
    await tryCatch(tokenSale.buyTokens({value: web3.toWei('1', 'ether'), from: accounts[5]}), errTypes.revert);

  })

  // Test sending unpurchased tokens to reserves
  it('Unsold Tokens return to contract owner', async function () {
    // Set different addresses for teams and costs location
    await tokenSale.setTeamsWallet(accounts[1], {from: accounts[0]});
    await tokenSale.setCostsWallet(accounts[2], {from: accounts[0]});

    // Should purchase 104000 tokens into two accounts
    await tokenSale.buyTokens({value: web3.toWei('40', 'ether'), from: accounts[7]});
    await tokenSale.buyTokens({value: web3.toWei('40', 'ether'), from: accounts[8]});

    await tokenSale.switchTiers(1, {from: accounts[0]});

    // Should purchase 24000 tokens into one account
    await tokenSale.buyTokens({value: web3.toWei('20', 'ether'), from: accounts[7]});

    await tokenSale.switchTiers(2, {from: accounts[0]});

    // Should purchase 22000 tokens into one account
    await tokenSale.buyTokens({value: web3.toWei('20', 'ether'), from: accounts[8]});

    await tokenSale.switchTiers(3, {from: accounts[0]});

    // Should purchase 80000 tokens into one account
    await tokenSale.buyTokens({value: web3.toWei('80', 'ether'), from: accounts[9]});

    await tokenSale.disableSale({from: accounts[0]});

    const returned = await tokenSale.investorAlloc() - (104000 + 24000 + 22000 + 80000);

    assert.equal(returned, await tokenSale.balanceOf(accounts[0]));

  })

  // Test sending allocations to designated addresses
  it('Tokens send to team and costs addresses at end of sale', async function () {
    await tokenSale.setTeamsWallet(accounts[1], {from: accounts[0]});
    await tokenSale.setCostsWallet(accounts[2], {from: accounts[0]});

    // end sale
    await tokenSale.disableSale({from: accounts[0]});

    assert.equal(await tokenSale.balanceOf.call(accounts[1]), 33900000);
    assert.equal(await tokenSale.balanceOf.call(accounts[2]), 22600000);
  })

  it('Only owner can withdraw', async function() {
    await tokenSale.buyTokens({value: web3.toWei('40', 'ether'), from: accounts[7]});

    await tryCatch(tokenSale.withdrawFunds({from: accounts[6]}), errTypes.revert);
  })

  // Test withdrawal at arbitrary points // TODO: Rework this test
  // it('Withdraw Eth received at any point of the sale', async function() {
  //   // Set withdrawWallet
  //   await tokenSale.setWithdrawWallet(accounts[9], {from: accounts[0]});
  //
  //   await tokenSale.setInitalTierRate(1300, {from: accounts[0]});
  //   await tokenSale.setTierRates(1200, 1100, 1000, {from: accounts[0]});
  //
  //   await tokenSale.setInitialTierLimit(10, {from: accounts[0]});
  //   await tokenSale.setTierLimits(15, 20, 40, {from: accounts[0]});
  //
  //   const balanceWithdraw1 = web3.eth.getBalance(accounts[9]);
  //
  //   await tokenSale.buyTokens({value: web3.toWei('400', 'ether'), from: accounts[7]});
  //
  //   // Withdrawal 1
  //   await tokenSale.withdrawFunds({from: accounts[0]});
  //
  //   // Change stage, purchase, then withdraw again
  //   await tokenSale.switchTiers(1, {from: accounts[0]});
  //
  //   const balanceWithdraw2 = web3.eth.getBalance(accounts[9]);
  //
  //   await tokenSale.buyTokens({value: web3.toWei('400', 'ether'), from: accounts[7]});
  //
  //   // Withdrawal 2
  //   await tokenSale.withdrawFunds({from: accounts[0]});
  //
  //   assert.equal(balanceWithdraw1 + 400, web3.eth.getBalance(accounts[9]));
  //   assert.equal(balanceWithdraw2 + 400, web3.eth.getBalance(accounts[9]));
  // })

  // TODO: Full test case
})
