---
external: false
title: "Deploying Private Order Flow in TDX Using Oblivious RAM"
description: "..."
date: 2025-03-10
truncated_preview: true
---
# Introduction
Recently, there has been growing interest in deploying Trusted Execution Environments (TEEs) to enhance privacy in blockchain applications. In this blog post, we present a case study of a **private order flow** running in TDX, highlighting the key challenges and solutions encountered during deployment.
_Afonso: not sure if flashbots like the term private order flow_

We define a **private order flow** as one that, for each exchange:
1. Hides the identity of the user making the exchange.
2. Hides the exchanged amount.
3. Hides the transaction direction (e.g., whether the user is swapping USDT for WETH or vice versa).

Our solution builds upon **Flashbots' TEE-boost**. We will explain the architecture of TEE-boost, identify privacy leakages in its current design, and demonstrate how **Oblivious RAM (ORAM)** mitigates these issues.
_Afonso: this architecture is DStack, and it's correct for TEE-boost, but Flashbots may not want present it this way as they might bigger usage on this?_

# Architecture
![Architecture](/assets/tdx-balance-checker/architecture.jpg)
In this section, we break down the architecture of Flashbots' TEE-boost using a **Uniswap exchange order** as an example. Suppose a user wants to exchange **1 WETH for 1000 USDT**.

_Afonso: flashbots are not using mempool, builders have the private pool_
_Junxi: I changed to transaction, and I don't think it's a good idea to involve private pool_

## Workflow:
1. **Encrypted Transactions**: Block builders collect encrypted transactions from the users. These transactions contain **encrypted details** (e.g., exchange amount, sender's address).
2. **Execution in a Secure Enclave**: The block builder submits selected transactions to a **secure enclave**, which executes them while maintaining confidentiality.
3. **Verification and Execution**:
   1. The enclave executes Uniswap’s smart contract logic to:
      1. Verify that the user has deposited **1 WETH** into the liquidity pool
      2. Transfer **1000 USDT** to the user by updating their balance.
   2. The enclave must access contract state storage (which resides outside the enclave) to verify and update the balance.
4. **Attestation & Block Proposal**: If all transactions execute successfully, the enclave generates an attestation, and block builders submit the encrypted block along with the attestation to validators.

_Afonso: double check if the attestation is sent to validators_
_Junxi: the attestation is submitted at the start of each epoch and validattors could verify_

While this architecture effectively **hides the transaction amount**, it still leaks critical information, as we will explore next.

# Privacy Leakage
We continue with the **1 WETH → 1000 USDT Uniswap swap** as an example. A transaction is truly **private** if it hides:
1. **Who is making the transaction.**
2. **The transaction amount.**
3. **The transaction direction.**

Below is a snippet from the **Uniswap V2 Core contract**, which executes swaps:

{% highlight js linenos %}
function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock {
   require(amount0Out > 0 || amount1Out > 0, 'UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT');
   (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
   require(amount0Out < _reserve0 && amount1Out < _reserve1, 'UniswapV2: INSUFFICIENT_LIQUIDITY');

   uint balance0;
   uint balance1;
   { // scope for _token{0,1}, avoids stack too deep errors
   address _token0 = token0;
   address _token1 = token1;
   require(to != _token0 && to != _token1, 'UniswapV2: INVALID_TO');
   if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
   if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
   if (data.length > 0) IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
   balance0 = IERC20(_token0).balanceOf(address(this));
   balance1 = IERC20(_token1).balanceOf(address(this));
   }
   uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
   uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
   require(amount0In > 0 || amount1In > 0, 'UniswapV2: INSUFFICIENT_INPUT_AMOUNT');
   { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
   uint balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));
   uint balance1Adjusted = balance1.mul(1000).sub(amount1In.mul(3));
   require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(1000**2), 'UniswapV2: K');
   }

   _update(balance0, balance1, _reserve0, _reserve1);
   emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
}
{% endhighlight %}
While TEE-boost hides the transaction amount using encryption, two pieces of information are still leaked:

**Transaction Direction**: This leakage occurs in lines 12 and 13. If a user submits an WETH-to-USDT swap, only one of these conditional statements executes. Attackers monitoring execution can infer the transaction direction. This can be mitigated by requiring users to send nonzero amounts of both WETH and USDT to the contract before executing the exchange.

**User Identity**: Even though the user's address is encrypted, attackers can infer their identity from memory access patterns. When the secure enclave retrieves contract state storage, an attacker observing access patterns can correlate them with specific users.

For example, when Alice (with address 0xF04...) submits a transaction, the TEE must access specific storage slots associated with her address. An attacker (block builder in this case) monitoring these memory access patterns can observe: "The TEE just accessed storage slots related to address 0xABC... while processing this supposedly 'private' transaction." While the attacker initially doesn't know exactly which user corresponds to address 0xABC..., once the transaction is published on Ethereum, they can correlate this address with Alice's public identity. If Alice conducts another exchange later, the **same memory access pattern** occurs, immediately revealing her as the transaction initiator—despite the encryption of transaction details. This effectively undermines the anonymity guarantees of the private order flow system.

_Afonso: the user identity leakage is not clear enough_

> Summary of Leakage Risks
1. **User Identity**: Leaked due to observable memory access patterns.
2. **Exchange Amount**: Protected by encryption within the enclave.
3. **Transaction Direction**: Can be protected by requiring nonzero transfers of both tokens.

# Oblivious RAM (ORAM) for Privacy
Oblivious RAM (ORAM) is a cryptographic technique that prevents access pattern leakage. Even if an attacker monitors memory accesses, ORAM ensures all operations appear random.

### Core Idea
ORAM organizes data into a **tree structure** stored on an untrusted server. The client maintains **a small local stash** to temporarily store blocks during access operations. The key concept is that each data block is assigned **a random leaf node** and is always stored along the path from the root to that leaf.In our current example of Uniswap exchange, "client" in the below context would be the enclave while "memory" stands for contract state storage. 

![Architecture](/assets/tdx-balance-checker/ORAMTree.png)

#### Operations
When accessing ORAM, the reads and writes are performed as below. In addition to accessing the database, evictions happen regularly to ensure that nodes in the stash don't overflow. 
1. **Read/Write**:
   1. The client downloades the **entire path** from the root to the leaf associated with the requested block.
   2. The client assigns a new random leaf to the block, and the block is modified (if the operation is write). 
   3. All blocks downloaded are temporarily stored in the stash, along with other blocks on the path.
2. **Eviction**:
   1. The client first pick a path to evict.
   2. It writes back blocks from the stash to the selected path, moving **from leaf to root**.
   3. For each node along the path, the client checks if any block in the stash belongs to that node’s assigned path. If so, the block is placed in that node.
   4. Blocks are pushed as deep as possible to optimize storage distribution and ensure uniform access patterns.

_[D]Afonso: rewrite the eviction sectoin to be more clear on a path is selected initially_
_[D]Afonso: replace the clients with TEE, memory with contract state storage_

By applying ORAM, all reads and writes appear randomized. Even if the secure enclave repeatedly accesses the same user balance, block builders only observe random memory accesses. This protects user identity while maintaining secure computations.

### Benchmark
Again, we continue with the **1 WETH → 1000 USDT Uniswap swap** example. We're going to evaluate the latency of doing ORAM access to contract state storage. This latency depends on the size of keys and values (in Ethereum storage, each one is 32 bytes) and the size of the database (which depends on the number of accounts holding the token).

Testing was conducted in SGX prerelease mode using an Intel(R) Xeon(R) Platinum 8352S processor (48M Cache, 2.20 GHz). We constrained the enclave size to 64 GB, with excess data swapped to SSD storage.

![Architecture](/assets/tdx-balance-checker/Latency1.jpg)

The figure above compares the latency of individual ORAM operations during **sequential** access across different implementations, including MobileCoin and Oblix. The x-axis represents the number of key-value pairs (indicating total data entries stored in memory), while the y-axis displays latency in microseconds (µs). In the context of our USDT/WETH pair analysis, USDT has approximately 7 million active token holders, while WETH has 1.2 million. We constructed separate ORAM databases for each token, mapping account addresses to balances. With databases containing 7 million and 1.2 million key-value pairs respectively, lookups can be executed in just 10 microseconds.

The throughput here would be around 100,000 access per second. If we need higher throughput, we could do batch processing which groups 1000 or 10,000 ORAM accsses together, reducing total computation but increasing latency. The second figure below demonstrates performance under **batch processing** conditions, where we executed 1,000 lookups per batch. This approach increased latency to 5 milliseconds for 1,000 operations, but it increased the throughput to around 200,000 on a database containing 10 million key-value pairs.

![Architecture](/assets/tdx-balance-checker/Latency1000.jpg)

_[D]Junxi: check with Afonso on the benchmark for private exchange_
_[D]Afonso: just put ORAM benchmark here, graph is in repo_
_[D]A&J: use latency here, and sequential access is the min & batch is the max, also explain to make it work, we need_
_[D]A&J: use USDT & WETH_

# Conclusion
While TEE-boost significantly enhances transaction privacy by encrypting transaction details within a secure enclave, it still falls short in protecting user identity and transaction direction. The leakage of access patterns in contract state storage remains a major concern, allowing attackers to correlate memory access to specific users.

By integrating ORAM, we eliminate this vulnerability, ensuring that access patterns remain indistinguishable and truly private. This approach strengthens confidentiality guarantees for private exchange orders, preventing adversaries from deducing transaction metadata. As privacy concerns continue to shape blockchain advancements, the combination of TEEs and ORAM stands out as a crucial step toward achieving robust, trust-minimized financial transactions.

---
# Notes
Elaine's suggestions
1. Draw a private order flow（swap specific）general architecture，Check on Elaine的slides as example，we need to first explain the architecture clearly
Questions:
   1. this is different from the TEE-boost from flashbots right? 
      Answer from G: Yes and no, the TEE used by flashbots as a way to communicate between builders and proposers are the TEE-boost, and we're proposing an extra step on TEE-boost
   2. after the code is executed in the secure enclave, what's exactly in the attestation?
      E: Not relevant to this blog

Architecture https://docs.google.com/drawings/d/1izIoM4HcHiTdrVcEfY3fTiSj9IlOBO0e4qqtYxwVVCM/edit 

In this section, we will explain the architecture of Flashbot's TEE-boost, using a private swap order in Uniswap as an example. First, block builders would pick encrypted transactions (for example: swaps 1 WETH to 1000 USDT in the uniswap liquidity pool)where the details of the transactions are hidden. 
After the block builders selected a set of transactions based on the gas fee, they will use secure enclaves to execute all the selected transactions and make sure that they're all valid. In our example transaction, the secure enclave will execute the uniswap code (detailed code in the next section) to 
   1. check if the user has sent 1 WETH to the liquidity pool by looking into the user's balance in WETH in the liquidity pool and see if it's greater than 1
   2. send the 1000 USDT to the user by increamenting the user's balance in USDT by 1000
In the above two steps, the secure enclave needs to access contract state storage, which is sotred ouside secure enclave. If all transactions are executed succesfully by the seucure enclave, it will generate attestation on the succesful execution, and block builders will be able to send the encrypted block along with the attestation to validators for proposing. 


2. Explain why without ORAM will cause leak info，use uniswap contract，if don't hide，it will leak user，direction，how much money (connect the leakage with the code)；(possibly needs to explain what could be hide in flashbot's works)

{% highlight js linenos %}
function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock {
        require(amount0Out > 0 || amount1Out > 0, 'UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'UniswapV2: INSUFFICIENT_LIQUIDITY');

        uint balance0;
        uint balance1;
        { // scope for _token{0,1}, avoids stack too deep errors
        address _token0 = token0;
        address _token1 = token1;
        require(to != _token0 && to != _token1, 'UniswapV2: INVALID_TO');
        if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
        if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
        if (data.length > 0) IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        }
        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, 'UniswapV2: INSUFFICIENT_INPUT_AMOUNT');
        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
        uint balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));
        uint balance1Adjusted = balance1.mul(1000).sub(amount1In.mul(3));
        require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(1000**2), 'UniswapV2: K');
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }
{% endhighlight %}
We use a uniswap transaction from 1WETH to 1000 USDT as an example. We call this a private order flow if three pieces of information could be hidden: who is making the transaction, in which order, and in what amount. 

In the above architecture, the amount of transaction is hidden as the transaction is encrypted, and will only be decryptetd in the secure enclave for computation. However, the remaining two will be leaked. The first is in which order the user is tryig to switch: from WETH to USDT or from USDT to WETH. This leakage happens in the first two if statements. If the user sends 1 WETH and 0 USDT to the liquidity pool and trys to exchanges from 1 WETH to 1000 USDT, when the uniswap contract calling this underlying function, only one of the two if statements will be executed. By monitoring which one is executed, the attacker would be able to know in which direction is the transaction.
Mitigating this is not difficult. The user needs to send both non zero amount of WETH and USDT to the contract and then sign a transaction for exchange.
A more hard to resolve problem is in balance checking (and updating) steps, although the user's address is encrypted, when the enclave is accessing contract states storage, the attacker knows which memory slot is accessed, and he could easily refer which user is doing the transaction. For example, once the transaction is included in the blockchain, it's public and attackers could link the user's address to the memory slot in contract states storage. When the same user is doing another transactions next time, the attacker knows. 


3. what is ORAM (add benchmark), how it works, why ORAM solve this problem
The above problem is called access pattern leakage. It happens when the same data (Alice's balance) is always stored in the same memory slot in a database. To hide the access pattern, we need oblvious algorithms. 
(Junxi:I have another blog on Intro to ORAM, maybe can borrow some text from there)

With ORAM, even when the secure enclave keeps fetching the same user's balance form contract state storage, from the perspective of an attacker, it access random memory slot each time. In this way, we hide the user who is making a exchange. 

Low level detail
1. SGX VS TDX 
2. Flashbots implementation leakage

High level：anything that could connected to flashbots could mention flashbots
different architecture with SGX and TDX



---

// TODO: is verifiable an ok word. 

# Intro

> Motivate 
Recently there has been raising interest in deploing TEE's.  //TODO
In this blogpost we will show an example application - a verifiable balance checker running in TDX
 and the main challenges we found while deploying this kind of applications 
 and how to tackled them.

## What is a balance checker
So first, what a balance checker? ...

## TDX
Now the verifiable part ... The user of the balance checker wants to be sure that the results of the balance checker 
are correct, without having to trust any intermediate states. 
In ethereum, this can be achieved via merkle proofs, however these proof are on the order of a few KB, wherewas a balance checker value is only 32bytes.
We will show how can we use TDX to reduce these proofs to around 100bytes and explain the security tradeoffs.

> What is TDX



# Problems 
## Problem 1) Memory and Timing Side Channels / Leakage

## Problem 2) Veryfiable TDX state and responses

## Problem 3) Fast TDX reinitialization


# Architecture


# Solutions
## Solution 1) 

## Solution 2) 

## Solution 3) 


# Benchmarks
## ORAM benchmark

# Demo

# Usecases
>> (High level)
> Private uniswap exchanges
>> High level - mev, people could attack you, tdx can hide specific transaction ammount and oram hides user+direction

> 

# About us
... 