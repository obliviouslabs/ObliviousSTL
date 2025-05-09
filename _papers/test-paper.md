---
title: "Oblivious RAM Papers"
excerpt: "A collection of significant papers on Oblivious RAM technology."
---

## 🔐 What is Oblivious RAM (ORAM)?
Oblivious RAM (ORAM) is a cryptographic technique that conceals access patterns to data stored on untrusted servers. It ensures that the sequence of read and write operations remains indistinguishable to observers, even if the data is encrypted. This protection is vital in scenarios like cloud storage, secure processors, and privacy-preserving computations, where access patterns could leak sensitive information.

## 📚 Key ORAM Research Papers

### 1. Oblivious RAM with O((log N)³) Worst-Case Cost
- **Authors:** Elaine Shi, T.-H. Hubert Chan, Emil Stefanov, Mingfei Li
- **Date:** 2011
- **Summary:** Introduces a tree-based ORAM construction achieving polylogarithmic worst-case overhead with constant client storage.
- **Link:** [eprint.iacr.org](https://eprint.iacr.org)

### 2. Path ORAM: An Extremely Simple Oblivious RAM Protocol
- **Authors:** Emil Stefanov, Marten van Dijk, Elaine Shi, et al.
- **Date:** 2013
- **Summary:** Proposes a practical and simple ORAM scheme using a binary tree structure, suitable for secure processors.
- **Link:** [dl.acm.org](https://dl.acm.org)

### 3. Towards Practical Oblivious RAM
- **Authors:** Emil Stefanov, Elaine Shi, Dawn Song
- **Date:** 2011
- **Summary:** Presents techniques to make ORAM more practical, including partitioning and background eviction, reducing overhead.
- **Link:** [arxiv.org](https://arxiv.org)

### 4. Oblivious RAM with Worst-Case Logarithmic Overhead
- **Authors:** Gilad Asharov, Ilan Komargodski, Wei-Kai Lin, Elaine Shi
- **Date:** 2021
- **Summary:** Achieves worst-case O(log N) overhead with constant client memory, improving upon previous amortized guarantees.
- **Link:** [eprint.iacr.org](https://eprint.iacr.org)

### 5. Oblivious RAM Simulation with Efficient Worst-Case Access Overhead
- **Authors:** Michael T. Goodrich, Michael Mitzenmacher, Olga Ohrimenko, Roberto Tamassia
- **Date:** 2011
- **Summary:** Focuses on de-amortizing ORAM simulations to ensure bounded worst-case access overhead, enhancing practicality.
- **Link:** [arxiv.org](https://arxiv.org)
