import 'dotenv/config'
import express from 'express'
import { LazyMinter, recoverWalletFromMnemonic } from '@chainsafe/lazy-minting-voucher-signer'
import { GeneralERC1155__factory, GeneralERC721__factory } from '@chainsafe/marketplace-contracts'
import axios from 'axios'
import { FilesApiClient } from '@chainsafe/files-api-client'
import dayjs from 'dayjs'
import { File } from 'formdata-node'
import { getDefaultProvider } from 'ethers'
import { stream2buffer } from './stream2buffer'
import { cidToTokenId } from './cidHelpers'
import cors from 'cors'

const app = express();

const signerMnemonic = process.env.SIGNER_MNEMONIC
const storageApiKey = process.env.STORAGE_API_KEY
const minter721Address = process.env.MINTER_721_ADDRESS
const minter1155Address = process.env.MINTER_1155_ADDRESS
const storageApiUrl = process.env.STORAGE_API_URL
const port = process.env.PORT || 3000

app.use(cors())

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.get("/voucher721", async (req, res) => {
  if (!signerMnemonic) {
    throw new Error("No signer key is configured")
  }

  if (!minter721Address) {
    throw new Error("No 721 Minter Address is configured");
  }

  if (!storageApiUrl) {
    throw new Error("No Storage API URL is configured");
  }

  if (!storageApiKey) {
    throw new Error("No Storage API Key is configured");
  }

  // Query game state to determine whether the user making the request is authorized to mint
  const voucherEarned = true

  if (!voucherEarned) {
    throw new Error("Voucher is not yet earned");
  }

  const receiver = req.query.receiver as string

  if (!receiver) {
    throw new Error("Voucher receiver not specified")
  }

  //Create metadata for the NFT to be minted
  const imageStream = await axios.get('https://picsum.photos/800.jpg', { responseType: 'stream' }).then(res => res.data)
  const imageBuffer = await stream2buffer(imageStream)
  const image = new File([imageBuffer.buffer], "image.jpg", { type: "image/jpg" })

  const metadata = {
    name: `test lazy mint ERC721 nft`,
    description: `ipsum lorem`,
    image,
  }

  const axiosClient = axios.create({
    // Disable the internal Axios JSON de serialization as this is handled by the client
    transformResponse: []
  })
  const apiClient = new FilesApiClient({}, storageApiUrl, axiosClient)
  apiClient.setToken(storageApiKey)
  try {
    const uploadResult = await apiClient.uploadNFT(metadata, "blake2b-208")
    const provider = getDefaultProvider(5)
    const wallet = (recoverWalletFromMnemonic(signerMnemonic)).connect(provider)
    const minterContract = GeneralERC721__factory.connect(minter721Address, wallet)
    const minter = new LazyMinter({ contract: minterContract, signer: wallet })

    const voucher = await minter.createVoucher721({
      minPrice: 0,
      tokenId: cidToTokenId(uploadResult.cid),
      signer: wallet.address,
      receiver
    })

    res.send(voucher)
  } catch (error: any) {
    console.error(error?.message)
    res.status(503).send("Internal Server Error")
  }
})

app.get("/voucher1155", async (req, res) => {
  console.log("In sign 1155")
  if (!signerMnemonic) {
    throw new Error("No signer key is configured")
  }
  console.log("mnemonic is configured")

  if (!minter1155Address) {
    throw new Error("No 1155 Minter Address is configured");
  }
  console.log("minter 1155 is configured")
  if (!storageApiKey) {
    throw new Error("No Storage API Key is configured");
  }
  console.log("Storage api key is configured")
  // Query game state to determine whether the user making the request is authorized to mint
  const voucherEarned = true

  if (!voucherEarned) {
    throw new Error("Voucher is not yet earned");
  }

  const receiver = req.query.receiver as string

  if (!receiver) {
    throw new Error("Voucher receiver not specified")
  }
  console.log("receiver is provided")
  // Create metadata for the NFT to be minted
  const imageStream = await axios.get('https://picsum.photos/800.jpg', { responseType: 'stream' }).then(res => res.data)
  const imageBuffer = await stream2buffer(imageStream)
  const image = new File([imageBuffer.buffer], "image.jpg", { type: "image/jpg" })

  const metadata = {
    name: `test lazy mint ERC1155 nft`,
    description: `ipsum lorem`,
    image,
  }

  const axiosClient = axios.create({
    // Disable the internal Axios JSON de serialization as this is handled by the client
    transformResponse: []
  })
  const apiClient = new FilesApiClient({}, storageApiUrl, axiosClient)
  apiClient.setToken(storageApiKey)
  try {
    const uploadResult = await apiClient.uploadNFT(metadata, "blake2b-208")
    console.log("upload to IPFS successfull")
    const provider = getDefaultProvider(5)
    const wallet = (recoverWalletFromMnemonic(signerMnemonic)).connect(provider)
    const minterContract = GeneralERC1155__factory.connect(minter1155Address, wallet)
    const minter = new LazyMinter({ contract: minterContract, signer: wallet })

    const voucher = await minter.createVoucher1155({
      minPrice: 0,
      tokenId: cidToTokenId(uploadResult.cid),
      amount: 1,
      nonce: dayjs().valueOf(),
      signer: wallet.address,
      receiver
    })
    console.log("Voucher generated")
    res.send({ ...voucher, uri: uploadResult.cid })
  } catch (error) {
    console.log(error)
    res.status(503).send("Internal Server Error")
  }
})