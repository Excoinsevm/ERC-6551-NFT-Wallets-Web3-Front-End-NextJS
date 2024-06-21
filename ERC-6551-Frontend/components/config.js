import { createWalletClient, custom } from "viem";
import { bitrock } from "./chain";
import nftabi from "./nftabi.json";
import erc20abi from "./erc20abi.json";
import erc6551regAbi from "./erc6551registry.json";
import erc6551accAbi from "./erc6551account.json";
import { ethers } from "ethers";

const nftContractAddr = '0x8dDEC53Ad0FbBd07FC1e5E5C238dC8B9DcE45557';
const erc6551RegistryAddr = '0xbE0c9852EeF1E8b78793Db47b2Dd5fAEC96fEB63';
const erc6551BaseAccount = '0xD00F4825B27A838Fb4004Cf61f8eA041C3402090';
const popcatContractAddr = '0xdcE5726e3Bc8E1F574416978279bb0AE62AB3c15';

const web3Provider = async () => {
  const [account] = await window.ethereum.request({ method: "eth_requestAccounts" });
  const client = createWalletClient({ account, chain: bitrock, transport: custom(window.ethereum) });
  return client;
};

const convertToEth = async (type, value) => {
  if (type == 'eth') {
    return Number(ethers.utils.formatEther(value)).toFixed('5');
  }
  else {
    return Number(ethers.utils.formatEther(value)).toFixed('2');
  }
}

export async function connectWallet() {
  const connection = await web3Provider()
  const provider = new ethers.providers.Web3Provider(connection);
  const { chainId } = await provider.getNetwork();
  const signer = provider.getSigner()
  const nftcollection = new ethers.Contract(nftContractAddr, nftabi, signer);
  const erc6551registry = new ethers.Contract(erc6551RegistryAddr, erc6551regAbi, signer);
  const usdtContract = new ethers.Contract(usdtContractAddr, erc20abi, signer);
  return { connection, signer, provider, nftcollection, erc6551registry, usdtContract, chainId };
}

async function getNftImageUrl(nftcid) {
  try {
    let cidurl = "https://ipfs.io/ipfs/" + nftcid  + "1.json";
    let response = await fetch(cidurl);
    let output = await response.json();
    let imagecid = (output.image).replace("ipfs://", "").replace("1.jpg", "");
    let imageurl = "https://ipfs.io/ipfs/" + imagecid;
    return imageurl;
  }
  catch (error) {
    console.log(error.name === 'AbortError');
  }
}

export async function getNftsInfo() {
  const web3connection = await connectWallet();
  let userwallet = web3connection.connection.account.address
  let nftcollection = web3connection.nftcollection;
  let signer = web3connection.signer;
  let erc6551registry = web3connection.erc6551registry;
  let chainId = (web3connection.chainId).toString();
  let nftinventory = await nftcollection.walletOfOwner(userwallet);
  let nftcid = (await nftcollection.baseURI()).replace("ipfs://", "");
  let imageurl = await getNftImageUrl(nftcid);
  let nftArray = [];
  for (let i = 0; i < nftinventory.length; i++) {
    let nftid = nftinventory[i];
    let nft6551wallet = await getErc6551Wallet(erc6551registry, chainId, nftid);
    let erc6551account = new ethers.Contract(nft6551wallet, erc6551accAbi, signer);
    let owner = await erc6551account.owner().then(() => {
      return true;
    }).catch((error) => {return error});
    if (owner == true){
      let data = {
        nftimage: imageurl + nftid + ".jpg",
        nftid: (nftinventory[i]).toString(),
        nftwallet: nft6551wallet,
        buttontext: "Withdraw"
      }
      nftArray.push(data);
    }
    else {
      let data = {
        nftimage: imageurl + nftid + ".jpg",
        nftid: (nftinventory[i]).toString(),
        nftwallet: nft6551wallet,
        buttontext: "Create Account"
      }
      nftArray.push(data);
    }
  }
  return nftArray;
}


async function getErc6551Wallet(erc6551registry, chainId, nftid) {
  let getnftwallet = await erc6551registry.account(erc6551BaseAccount,
    chainId,
    nftContractAddr,
    nftid,
    0);
  return getnftwallet;
}

export async function getErc6551Balances(nft6551wallet) {
  const web3connection = await connectWallet();
  let provider = web3connection.provider;
  let usdtcontract = web3connection.usdtContract;
  let nativebalanceraw = (await provider.getBalance(nft6551wallet)).toString();
  let usdtbalanceraw = (await usdtcontract.balanceOf(nft6551wallet)).toString();
  let usdtbalance = await convertToEth(null, usdtbalanceraw);
  let nativebalance = await convertToEth('eth', nativebalanceraw);
  let data = {
    nativebal: nativebalance,
    nativetoken: 'BROCK',
    custombal: popcatbalance,
    customtoken: 'POPCAT'
  }
  return [data];
}

export async function walletAction(nft6551wallet, tokenname, appbuttontxt, nftid) {
  const web3connection = await connectWallet();
  let provider = web3connection.provider;
  let erc6551registry = web3connection.erc6551registry;
  let { chainId } = await provider.getNetwork();
  if (appbuttontxt == "Create Account"){
    let createwallet = await erc6551registry.createAccount(erc6551BaseAccount,
      chainId,
      nftContractAddr,
      nftid,
      0,
      []).then(() => { return true })
      
    return createwallet;
  }
  else {
    let userwallet = web3connection.connection.account.address;
    let signer = web3connection.signer;
    let usdtcontract = web3connection.usdtContract;
    let erc6551account = new ethers.Contract(nft6551wallet, erc6551accAbi, signer);
    if (tokenname == "POPCAT") {
      let usdtbalance = await popcatcontract.balanceOf(nft6551wallet);
      let withdraw = await erc6551account.sendCustom(userwallet, popcatbalance, popcatContractAddr);
      if (withdraw) {
        return true;
      }
    }
    else {
      let nativebalance = await provider.getBalance(nft6551wallet);
      let withdraw = await erc6551account.send(userwallet, nativebalance);
      if (withdraw) {
        return true;
      }
    }
  }
}

