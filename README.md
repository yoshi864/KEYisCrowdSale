# KEYis Token Configuration and Sale Smart Contract

## Abstract

KEYis is an ERC20 contract, with the primary token characteristics defined in KEYisToken.sol, and the sale functionality defined in the TokenSale.sol contract. The total token quantity is 200000000. The token configuration does not deviate from the ERC20 standard and does not offer any additional functionality outside the defined paradigm.

## The Token Sale

Has the following functionality and attributes:

1. Control of the whitelist of who can purchase tokens though addToWhiteist, removeFromWhitelist, and getWhitelistStatus functions - the former two are available only to the contract owner.
2. Purchasing tokens from the contract using the buyTokens function. Tokens (non-bonus) are purchased only through this function.
3. The ether sent when purchasing tokens is immediately withdrawn to the withdrawWallet address (initially the owner address)
4. The owner address can be changed to a non-zero address by the owner.
5. The withdrawWallet, teamsWallet, and costsWallet addresses can be changed to a non-zero address by the owner.
6. The allocation of tokens available for Sale to investors comprises of 75% of the total supply. 15% is allocated to the team and the remaining 10% is allocated to costs.
7. The contract has three tiers of sale, with 10% of investor allocation available in the first tier, 30% in the next and 60% in the third and final tier.
8. These tiers change automatically once their limits are reached and switching is timestamped so that vested bonuses can be calculated after the end of the Sale.
9. The Sale can also be moved to the next tier manually using the enableManualTiers and switchTiers functions.
10. The rate for ether/KEYis is constant throughout the Sale (1 ETH = 2000 KEYis) however the earlier the tier in which the tokens were purchased, the better the vested bonus.
11. The Sale can be paused and unpaused (preventing the Sale of any tokens while paused) if the Sale has not ended.
12. The Sale can be finalised at any time using the endSale function, and cannot be re-opened.
13. Tokens can be burnt using the burn() function.

## Deployment and Testing

KEYis can be deployed directly onto a testnet, custom RPC or the main Ethereum chain. This can be done with tools such as Etherscan.io or any relevant platform that can interact with the blockchain directly.

To deploy the contract and running the included tests using the Truffle Framework with Ganache as the custom RPC:

1. Install the Truffle Framework and Ganache for your relevant platform.
2. Increase the default amount of ether in each account to 10 Million.
3. Navigate to the `KEYCrowdSale/Key` directory within the cloned repository with your preferred terminal emulator.
4. Run `truffle compile`
5. Run `truffle migrate`
6. The contract is now live on the Ganache RPC, and can be interacted with using any address listed on the Ganache client.
7. To run tests, run `truffle test`.
