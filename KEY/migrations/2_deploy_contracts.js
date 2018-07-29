var KEYCrowdsale = artifacts.require("TokenSale");

module.exports = function(deployer) {
	deployer.deploy(KEYCrowdsale);
};
