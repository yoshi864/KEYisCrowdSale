var KEYToken = artifacts.require("KEYToken");

module.exports = function(deployer) {
	deployer.deploy(KEYToken);
};
