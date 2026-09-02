// Truffle configuration file

module.exports = {
    networks: {
        development: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "5777",
            gas: 30000000,          // <- set to block limit or lower
            gasPrice: 20000000000
        }
    },

  // Set default mocha options here
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.21",   // Match your compiler version
      // optimizer: {
      //   enabled: false,
      //   runs: 200
      // }
    }
  },

  // Truffle DB is disabled by default
  db: {
    enabled: false
  }
};
