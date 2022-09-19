// constants
import Web3EthContract from "web3-eth-contract";
import Web3 from "web3";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import WalletLink from "walletlink";

// log
import { fetchData } from "../data/dataActions";

const INFURA_ID = "bea5def735a048d7856e43be3988ea8f";

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider, // required
    options: {
      infuraId: INFURA_ID, // required
      rpc: {
        1: "https://rinkeby.infura.io/v3/bea5def735a048d7856e43be3988ea8f", // AVAX C-Chain
      },
    },
  },
  walletlink: {
    package: WalletLink, // Required
    options: {
      appName: "TBT1", // Required
      infuraId: "", // Required unless you provide a JSON RPC url; see `rpc` below
      rpc: "https://rinkeby.infura.io/v3/bea5def735a048d7856e43be3988ea8f", // Optional if `infuraId` is provided; otherwise it's required
      chainId: 1, // Optional. It defaults to 1 if not provided
      appLogoUrl: null, // Optional. Application logo image URL. favicon is used if unspecified
      darkMode: false, // Optional. Use dark theme, defaults to false
    },
  },
};

const connectRequest = () => {
  return {
    type: "CONNECTION_REQUEST",
  };
};

const connectSuccess = (payload) => {
  return {
    type: "CONNECTION_SUCCESS",
    payload: payload,
  };
};

const connectFailed = (payload) => {
  return {
    type: "CONNECTION_FAILED",
    payload: payload,
  };
};

const updateAccountRequest = (payload) => {
  return {
    type: "UPDATE_ACCOUNT",
    payload: payload,
  };
};

export const connect = () => {
  return async (dispatch) => {
    dispatch(connectRequest());
    try {
      const abiResponse = await fetch("/config/abi.json", {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const abi = await abiResponse.json();
      const configResponse = await fetch("/config/config.json", {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const CONFIG = await configResponse.json();
      localStorage.removeItem("walletconnect");
      localStorage.removeItem("WALLETCONNECT_DEEPLINK_CHOICE");
      const web3Modal = new Web3Modal({
        network: "mainnet", // optional
        cacheProvider: false, // optional
        providerOptions, // required
      });
      const provider = await web3Modal.connect();
      const web3 = new Web3(provider);
      console.log("web", web3);

      Web3EthContract.setProvider(provider);
      const accounts = await web3.eth.getAccounts();
      const networkId = await provider.request({
        method: "net_version",
      });
      console.log("networkId", networkId);
      if (networkId == CONFIG.NETWORK.ID) {
        const SmartContractObj = new Web3EthContract(
          abi,
          CONFIG.CONTRACT_ADDRESS
        );
        dispatch(
          connectSuccess({
            account: accounts[0],
            smartContract: SmartContractObj,
            web3: web3,
          })
        );
        // Add listeners start
        provider.on("accountsChanged", (accounts) => {
          dispatch(updateAccount(accounts[0]));
        });
        provider.on("chainChanged", () => {
          window.location.reload();
        });
        // Add listeners end
      } else {
        dispatch(
          connectFailed(`Changer de réseau pour ${CONFIG.NETWORK.NAME}.`)
        );
      }
    } catch (err) {
      console.log("error", err, " message", err.message);
      if (
        typeof err !== "undefined" &&
        typeof err.message !== "undefined" &&
        err.message.includes("Utilisateur rejeté")
      ) {
        dispatch(connectFailed("L'utilisateur a rejeté la demande"));
      } else if (
        (typeof err === "string" || err instanceof String) &&
        err.includes("Modal fermé par l'utilisateur")
      ) {
        dispatch(connectFailed("Modal fermé par l'utilisateur"));
      } else {
        dispatch(connectFailed("Quelque chose s'est mal passé."));
      }
    }
  };
};

export const updateAccount = (account) => {
  return async (dispatch) => {
    dispatch(updateAccountRequest({ account: account }));
    dispatch(fetchData(account));
  };
};
