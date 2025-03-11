---
external: false
title: "...."
description: "..."
date: 2025-03-10
truncated_preview: true
---
Elaine's suggestions
1. Draw a private order flow（swap specific）general architecture，Check on Elaine的slides as example，we need to first explain the architecture clearly
Questions:
   1. this is different from the TEE-boost from flashbots right?
   2. after the code is executed in the secure enclave, what's exactly in the attestation?

Architecture https://docs.google.com/drawings/d/1izIoM4HcHiTdrVcEfY3fTiSj9IlOBO0e4qqtYxwVVCM/edit 

In the architecture of the private swap order in Uniswap, block builders would pick encrypted transactions (for example: swaps 1 ETH to 1000 DAI in the uniswap liquidity pool)where the details of the transactions are hidden. 
After the block builders selected a set of transactions based on the gas fee, they will use secure enclaves to execute all the selected transactions and make sure that they're all valid. In our example transaction, the secure enclave will execute the uniswap code (detailed code in the next section) to 
   1. check if the user has sent 1 ETH to the liquidity pool by looking into the user's balance in ETH in the liquidity pool and see if it's greater than 1
   2. send the 1000 DAI to the user by increamenting the user's balance in DAI in the liquiity pool by 1000
In the above two steps, the secure enclave needs to access contract state storage, which is sotred ouside secure enclave. If all transactions are executed succesfully by the seucure enclave, it will generate attestation on the succesful execution, and block builders will be able to send the encrypted block along with the attestation to validators for proposing. 

2. Explain why without ORAM will cause leak info，use uniswap contract，if don't hide，it will leak user，direction，how much money (connect the leakage with the code)；(possibly needs to explain what could be hide in flashbot's works)

'''
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
'''
In the above architecture, a few pieces of information will be leaked. The first is in which order the user is tryig to switch: from ETH to DAI or DAI to ETH. This leakage happens in the first two if statements. If the user sends 1 DAI 




1. what is ORAM (add benchmark), how it works, why ORAM solve this problem

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