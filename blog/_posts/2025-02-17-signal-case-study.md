---
external: false
title: "ORAM is slow! ... is it?"
description: "Case Study on Signal's implementation of private contact discovery using ORAM"
date: 2025-02-12
truncated_preview: true
---

In 2014, the open-source encrypted messaging service Signal began exploring a feature called Private Contact Discovery (PCD). In this post, we trace the long path Signal took to implement PCD in a practical way, ultimately reducing the server infrastructure from hundreds of machines down to just a handful (exact numbers to be confirmed).

#### What's Private Contact Discovery
Private Contact Discovery (PCD) allows users to find out which of their contacts are already registered on a service—such as a messaging app—without revealing their entire address book to the server. Concretely:
1. Client has a set of data, called `clientContacts`
2. Server has a set of data, called `registeredUsers`
3. A function `findRegisteredUsers` that access both set of data, and finally return the intersection of both

In addition, PCD has a few requirements 
1. Server learns nothing about clients' contacts that haven't registered
2. Server learns nothing about clients' contacts that have registered
3. Clients learns nothing about registered users, except those are their contacts
4. Implementation practical with 10 million registered users

**Current Approach**: As of the time covered in this post, a common method to fulfill these requirements uses a trusted execution environment (TEE) such as Intel SGX, which isolates the data from the host operating system to ensure privacy.

## 2014: No Solution Works
In a [2014 blog post](https://signal.org/blog/contact-discovery/)  Signal detailed several methods they considered for providing a practical PCD for tens of millions of users with limited download sizes (roughly 2MB). Unfortunately, they found each approach either leaked too much information or was computationally infeasible:
1. Hash: Because there are only around $10^{10}$ possible phone numbers, the “preimage space” is too small—an attacker could brute force the hashed values.
1. Bloom Filters and Encrypted Bloom Filters: A single Bloom filter for 10 million registered users would be ~40MB, making it too large for routine download to mobile devices.
2. Sharded Bloom Filters: Splitting the data into multiple filters either reveals too much information about individual queries or still involves large data transfers, yielding minimal privacy benefits at significant complexity.
3. Private Set Intersection: Traditional protocols would require the server to perform billions of RSA operations for each client, which is computationally overwhelming.

## 2017: Linear Scan ORAM with SGX
Let's fast forward to 2017, Signal team has finally founded a solution to the PCD problem that satisfy all three requirements mentioned above, and it's through a combination of SGX and linear scan ORAM. 
### What's SGX 
Intel Software Guard Extensions (SGX) provides a hardware-based security feature that enables trusted execution environments (TEEs), known as enclaves, within a system's memory. Key SGX properties include:
1. **Attestation**: Confirms that the code running inside the enclave matches the expected code.
2. **Secure Memory** – Creates an Enclave Page Cache (EPC) that even the operating system cannot see the data (encrypted or not) stored here. 
3. **Memory Encryption** – Automatically encrypts and decrypts data in untrusted memory, preventing unauthorized access or tampering.
_TODO: add some summarization here_

### Signal's solution
Signal's solution includes two parts
1. build an oblivious hash table on `clientContacts`
2. do a linear scan on `registeredUsers`. For each registered user, the enclave would do a lookup in the oblivious hash table and update the table for mark a hit or miss. 

Both data structures are stored in untrusted memory, but all read/write operations are performed inside the secure SGX enclave. This design ensures that neither the server nor the operating system can infer details about the intersection of contacts.

To help people better understand, we will explain on the oblivious hash table in the later section, and let's assume we have a normal hash table for now. 

#### Linear Scan on Registered Users 
A straightforward way to discover matches is to iterate over all entries in `registeredUsers` and check each one against the clientContacts hash table:

```
private List<Long> findRegisteredUsers(List<Long> registeredUsers,
                                       Set<Long> clientContacts)
{
  List<Long> results = new LinkedList<>();

  for (long registeredUser : registeredUsers) {
    if (clientContacts.contains(registeredUser)) {
      results.add(registeredUser);
    }
  }

  return results;
}
```
Since this code runs within the enclave, the OS only sees that each entry of `registeredUsers` is accessed once. It cannot tell which entry results in a contacts match, thus preventing the information leakage on the `registeredUsers` side.

#### Why a Standard Hash Table Won’t Work

Consider the case where we use a normal hash table. When constructing the hash table, the OS can easily see which memory slots are written and which are not. This means that later, when `findRegisteredUsers` performs a lookup, the OS knows exactly whether it is a match or a miss.

Additionally, since the server knows which entry in `registeredUsers` is being checked at any given time, it can infer the user’s contacts.

#### What Is an Oblivious Hash Table?
Instead of a normal hash table, we need one additional feature: the OS should not be able to determine whether a lookup results in a hit or a miss.

To achieve this, we must touch all possible memory locations in the client’s contact hash table once, storing actual contacts in real memory locations and using dummy entries elsewhere so that the OS cannot distinguish between them.

Although the construction process is expensive, once built, the OS cannot determine whether a lookup results in a match or a miss in near native time.
#### Complexity
As one can see, the expensive part of this method is the cost for building the oblivious hash table and the cost for doing a linear scan on the `registeredUsers` database.  `registeredUsers` database is the bigger block here with 10 million entires. 

## 2022: Faster and More Efficient with Path ORAM
Fast forward to 2022—Signal has surpassed 100 million downloads and urgently needs a faster solution. In 2017, a linear scan was necessary to conceal database access patterns from the server. However, Path ORAM offers a significantly more efficient alternative while being relatively straightforward to implement.


This new solution includes: 
1. using Path ORAM to store the `registeredUsers` database,  
2. iterate through `clientContacts` and do a binary search in the `registeredUsers` database for every entry.

In this blog (_TODO: link to the intro to oram blog_) we described how Path ORAM works. Here, we focus on how Path ORAM is constructed and applied to this problem:
1. sort all `registeredUsers` based on their phone numbers, and assign the index to that specific user. 
2. assign a leaf node for each `registeredUsers` and initialize the ORAM
3. whenever checking a `clientContacts`, do a binary search in `registeredUsers` since the users are sorted

By leveraging Path ORAM as the underlying framework, we eliminate the need for linear scans while ensuring that all access patterns remain hidden, even when the database is stored in untrusted memory.

#### Complexity
Assume 1 billion of registered users. In the previous linear scan solution, checking registeredUsers with 1 billion entries required 1 billion operations. With Path ORAM:
1. Accessing the `registeredUsers` database involves ~30 reads and 30 writes per lookup, as a binary tree with 2 billion nodes has ~30 levels.
2. Performing a binary search for each `clientContacts` entry requires ~30 database accesses.
Thus, the total number of memory accesses is approximately 1,800—a drastic improvement compared to the original 1 billion.

## The Final Chapter: A Decade of Private Contact Discovery
After 10 years, private contact discovery finally has a near-native implementation. While ORAM is undeniably slower than non-private solutions, its performance has often been misunderstood—exaggerated as impractically slow.

Signal had already explored Path ORAM in 2017, but due to an incorrect implementation and lack of optimization, they underestimated its potential. Now, we present Oblivious STL, a standardized, optimized implementation that helps the broader audience understand the true cost of privacy—and how feasible it really is.

