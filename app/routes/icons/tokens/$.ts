import type { LoaderArgs } from "@remix-run/node";
import { getAddress } from "ethers";
import { extractParams, handleError, streamingResizeBuffer } from "~/modules/image-resize";
import { resToBuffer } from "~/modules/response";

export const trustWalletChainsMap: { [chainId: number]: string } = {
  1: "ethereum",
  56: "smartchain",
  137: "polygon",
  10: "optimism",
  42161: "arbitrum",
  43114: "avalanchec",
  100: "xdai",
  250: "fantom",
  // 8217: "klaytn",
  1313161554: "aurora",
  42220: "celo",
  25: "cronos",
  // 2000: "dogechain",
  // 1285: "moonriver",
  // 199: "bttc",
  42262: "oasis",
  // 106: "velas",
  128: "heco",
  1666600000: "harmony",
  // 288: "boba",
  66: "okexchain",
  // 122: "fuse",
  1284: "moonbeam",
} as const;

export const loader = async ({ params, request }: LoaderArgs) => {
  // extract all the parameters from the url
  const { src, width, height, fit } = extractParams(params, request);

  try {
    const [chainId, ...tokenAddresses] = src.split("/");
    const tokenAddress = tokenAddresses.join("/").toLowerCase();

    // fetch token list
    const tokenList = await fetch("https://icons.llamao.fi/token-list").then((res) => res.json());

    if (!tokenList.tokens) {
      throw new Error(`${src}: Couldn't fetch tokens list`);
    }

    if (!tokenList.tokens[chainId]) {
      throw new Error(`${src}: Couldn't find chain`);
    }

    if (!tokenList.tokens[chainId][tokenAddress]) {
      throw new Error(`${src}: Couldn't find token`);
    }

    // fetch token image
    let tokenImage = await fetch(tokenList.tokens[chainId][tokenAddress]);

    const contentType = tokenImage.headers.get("content-type");

    if (!contentType || !contentType.startsWith("image")) {
      if (trustWalletChainsMap[Number(chainId)]) {
        const trustWalletImage = await fetch(
          `https://raw.githubusercontent.com/rainbow-me/assets/master/blockchains/${
            trustWalletChainsMap[Number(chainId)]
          }/assets/${getAddress(tokenAddress)}/logo.png`,
        );

        const cType = trustWalletImage.headers.get("content-type");

        if (cType && cType.startsWith("image")) {
          tokenImage = trustWalletImage;
        } else {
          throw new Error(`${src}: Failed to fetch token image`);
        }
      } else {
        throw new Error(`${src}: Failed to fetch token image`);
      }
    }

    const resBuffer = await resToBuffer(tokenImage);

    // return transformed image
    return streamingResizeBuffer(resBuffer, width, height, fit);
  } catch (error: unknown) {
    console.log(error);
    // if the image is not found, or we get any other errors we return different response types
    return handleError({ error, width, height, fit, defaultImage: true });
  }
};
