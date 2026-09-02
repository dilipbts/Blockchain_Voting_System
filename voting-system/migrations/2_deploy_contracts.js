// migrations/2_deploy_contracts.js

const Voting = artifacts.require("Voting");

module.exports = function (deployer) {
  // No constructor arguments needed now
  deployer.deploy(Voting);
};
