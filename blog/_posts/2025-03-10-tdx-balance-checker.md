---
external: false
title: "...."
description: "..."
date: 2025-03-10
truncated_preview: true
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