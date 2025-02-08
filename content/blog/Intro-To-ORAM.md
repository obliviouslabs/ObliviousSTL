---
external: false
title: "What is Oblivious Algorithms"
description: "Basic introduction to oblivious algorithms to people with a general CS background "
date: 2025-02-07
---

When one is using cloud services, simply encrypting the data is not enough. Patterns in data access—such as which files are read or written and how often—can reveal sensitive information, even if the data itself is encrypted. This vulnerability is particularly concerning as more data is stored and processed in the cloud, where service providers or malicious attackers may monitor access patterns. 

Oblivious Algorithms addresses the critical privacy gap mentioned above by ensuring that access patterns remain hidden, protecting users from potential information leaks. As a result, Oblivious Algorithms are essential for building secure systems that uphold privacy in sensitive applications like finance, healthcare, and artificial intelligence.

## Examples of Access Pattern Leakage 
### Private Contact Discovery
**Scenario: Messaging App with Private Contact Discovery**
A secure messaging app (e.g., Signal, WhatsApp, or Telegram) allows users to discover which of their phone contacts also use the app.
- Database Structure: Each entry correponds to a registered user's phone number and account information.
- New User Matching Process: When a new user register, users can sync their contacts to check who is on the platform without revealing raw phone numbers.

**Leakage Due to Unprotected Access Patterns**
The service provider, government agency, or hacker does not have direct access to the database but can monitor the queries sent by a user when they sync their contacts.

1. Alice installs the messaging app and syncs her encrypted phone contacts.
   - The system queries specific database entries matching some of her contacts' encrypted phone numbers.
2. An observer (e.g., the service provider monitoring the network or a government agency) watches Alice’s access patterns.
   - They see that Alice's device queries entries #5, #12, #28, and #34.
   - These correspond to specific phone numbers already registered in the app.

**Consequences of the Leakage**

🔴 Encryption is not doing anything!The entire social graph is being reconstructed even with encrypted database.



### Kidney Transplantation Records
**Scenario: A Hospital Managing Kidney Transplants**
A hospital maintains a highly sensitive database of available kidneys for transplantation. Each kidney entry is linked to metadata such as blood type compatibility, donor status, and urgency levels.
- Database Structure: Each entry (e.g., #3, #7, #10) corresponds to a kidney available for transplant.
- Patient Matching Process: When a new patient arrives needing a transplant, doctors query the database to find a compatible kidney.

**Leakage Due to Unprotected Access Patterns**
An insurance company or an external observer does not have access to the decrypted medical records but can see database queries in real-time.

1. A new patient is admitted with a suspected kidney issue.
2. The hospital system queries specific database entries (e.g., #3, #7, #10), which correspond to kidney availability.
3. The insurance company observes these access patterns and correlates them with the patient's recent admission and prescribed medication (e.g., immunosuppressants for transplant patients).
4. Future Accesses Leak More Information:
     - Later, the same kidney entries (#3, #7, #10) are accessed again → Suggesting that a patient is progressing toward transplant surgery.
     - If a new entry is accessed instead → Suggests a different patient is now in need of a transplant.

**Consequences of the Leakage**

🔴 Insurance Denial:
- The insurance company infers that the patient has end-stage kidney disease and may soon require a costly transplant.
- They increase premiums or deny coverage before the patient even formally applies.

🔴 Privacy Violation & Targeted Ads:
- The patient starts receiving targeted ads for dialysis centers and transplant medications, even though their medical records are encrypted.
- Their employer, which provides group insurance, may notice these ads and suspect a major health issue, impacting future employment.

🔴 Black Market Risks:
- If an external attacker observes that a specific kidney is being accessed repeatedly, they might infer a specific high-priority transplant case is ongoing.
- This could lead to kidney brokers or criminals targeting the patient or hospital staff.

## Oblivious RAM
Oblivious RAM (ORAM) is the most fundamental Oblivious Algorithm – a cryptographic protocol designed to conceal access patterns during data interactions in the simplest abstraction of an array. When we’re accessing an array stored in cloud services, even when data is encrypted, the sequence of operations—such as which entries are accessed and in what order—can inadvertently expose private details. 

ORAM works by introducing randomized access and periodic reshuffling of data, making access patterns indistinguishable from random behavior.

_TODO: add some imgs here_

### Naive Design for ORAM

The easiest way for designing an ORAM is to do a linear scan with every read/write access. This is easy to implement, but the read and write cost would boost from $O(1) to $O(N) given $N$ is the size of the RAM.
