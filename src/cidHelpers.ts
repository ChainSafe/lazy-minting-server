import CID from "cids";

export const cidToTokenId = (cid: string): string =>
  `0x${new CID(cid).toString("base16").substring(1)}`;
export const tokenIdToCid = (id: string): string =>
  new CID(id.replace("0x", "f")).toString("base32");
