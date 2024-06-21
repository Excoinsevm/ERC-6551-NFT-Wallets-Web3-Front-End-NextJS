const { defineChain } = require("thirdweb");

// Define any custom chain using `defineChain`
const bitrock = defineChain({
  chain: "bitrock",
  name: "bitrock",
  chainId: 7171,
  rpc: ["https://connect.bit-rock.io"],
  nativeCurrency: {
    name: "BROCK",
    symbol: "BROCK",
    decimals: 18,
  },
  shortName: "custom",
  testnet: false,
  slug: "bitrock",
});

module.exports = bitrock;
