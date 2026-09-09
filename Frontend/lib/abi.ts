export const infrgateSubscriptionAbi = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_usdt",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "enum InfrgateSubscription.Tier",
          "name": "_tier",
          "type": "uint8"
        }
      ],
      "name": "subscribeWithBOT",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "enum InfrgateSubscription.Tier",
          "name": "_tier",
          "type": "uint8"
        }
      ],
      "name": "subscribeWithUSDT",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_subscriber",
          "type": "address"
        }
      ],
      "name": "isSubscriptionActive",
      "outputs": [
        {
          "internalType": "bool",
          "name": "active",
          "type": "bool"
        },
        {
          "internalType": "enum InfrgateSubscription.Tier",
          "name": "tier",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "expiresAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "tokenQuota",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "enum InfrgateSubscription.Tier",
          "name": "",
          "type": "uint8"
        }
      ],
      "name": "tierPriceBOT",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "enum InfrgateSubscription.Tier",
          "name": "",
          "type": "uint8"
        }
      ],
      "name": "tierPriceUsdt",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const;
