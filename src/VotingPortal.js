import Web3 from "web3";
import VotingContract from "./contracts/Voting.json";

let web3;
let contract;
let accounts;

export async function init() {
  // Connect to Ganache
  web3 = new Web3("http://127.0.0.1:7545");
  accounts = await web3.eth.getAccounts();
  console.log("✅ Connected to Ganache");
  console.log("📊 Accounts:", accounts[0]);

  const networkId = await web3.eth.net.getId();
  console.log("🌐 Network ID:", networkId);
  
  // Get the deployed contract address from the JSON
  const deployedNetwork = VotingContract.networks[networkId];
  
  if (!deployedNetwork) {
    console.error("Available networks:", Object.keys(VotingContract.networks));
    throw new Error(
      `Contract not deployed on network ${networkId}. Make sure Ganache is running on port 7545`
    );
  }
  
  console.log("📝 Contract address:", deployedNetwork.address);
  
  // Create contract instance
  contract = new web3.eth.Contract(
    VotingContract.abi,
    deployedNetwork.address
  );
  
  // Test the contract
  try {
    // Try to get candidates count to verify connection
    const count = await contract.methods.candidatesCount().call();
    console.log("✅ Contract connected! Candidates count:", count);
  } catch(e) {
    console.error("❌ Contract test failed:", e.message);
  }
}

export { web3, contract, accounts };