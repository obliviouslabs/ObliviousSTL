---
external: false
title: "ORAM Is Slow! Is It?"
description: "Case Study on Signal's implementation of private contact discovery using ORAM"
date: 2025-02-12
---

In 2014, Signal, an open-source, encrypted messaging service for instant messaging, voice calls, and video calls, started to think of a feature called private contact discovery (PCD). In this blog, we review the long way Signal has gone through to implememnt this feature and cuts the server numbers from 600 to 6. 

#### What's Private Contact Discovery
Private contact discovery allows users to find mutual contacts or friends in a service (e.g., messaging apps) without revealing their full contact list to the server. In this scenario, the user would have a list of contacts while the server holds another list of registered users. We would like to find and return the intersection of the two lists to users without revealing this intersection to the server. This is normally done through a trusted processor such as Intel SGX, which could isolate the data being processed from the hosting OS. 

Specifically, we could abstract PCD as following:
1. Client has a set of data, called `clientContacts`
2. Server has a set of data, called `registeredUsers`
3. A function `findRegisteredUsers` that access both set of data, and finally return the intersection of both

In addition, PCD has a few requirements 
1. Server learns nothing about clients' contacts that haven't registered
2. Server learns nothing about clients' contacts that have registered
3. Clients learns nothing about registered users, except those are their contacts
4. Implementation practical with 10 million registered users

## 2014: No Solution Works
In this [blog](https://signal.org/blog/contact-discovery/) Signal has listed the many solutions it tried to implement a practical PCD for 10 million users and none of those work. Specifically
1. Hash: There're only 10^10 phone numbers in total, the "preimage space" is so small to break the hash.
2. Bloom Filters and Encrypted Bloom Filters
3. Sharded Bloom Filters
4. Private Set Intersection: inpractical with 10M users

## 2017: Linear Scan ORAM with SGX
Let's fast forward to 2017, Signal team has finally founded a solution to the PCD problem that satisfy all three requirements mentioned above, and it's through a combination of SGX and linear scan ORAM. 
### What's SGX 
Intel Software Guard Extensions (SGX) is a hardware-based security feature that enables the creation of trusted execution environments (TEEs), called enclaves, within a system's main memory. It has a few festures: 
1. execute a piece of code with attestitation, so users could verify that this is exactly the piece of code being executed in this enclaves
2. maintains a small seure memory, called Enclave Page Cache (EPC), that even the operating system cannot see the data (encrypted or not) stored here 
3. encrypt and decrypt any data that needs to be stored outside of the EPC in untrusted memory fetching it 
_TODO: add some summarization here_
### Signal's solution
Signal's solution includes two parts: build an oblivious hash table on `clientContacts`, and do a linear scan on `registeredUsers`. Both `clientContacts` and `registeredUsers` need to be stored in untrusted memory. 

To help people better understand, we will explain on the oblivious hash table in the later section, and let's assume we have a normal hash table for now. 

#### Linear Scan on Registered Users 
Consider iterating over all registered users and for each registered users, do a search in `clientContacts` hash table to check if there is a match. If a match exists, add it to the restuls. If all execution happens in SGX, the OS learns nothing on which user is added to the results. Since every entry in the `registeredUsers` is touched once, the server learns nothing on which registered user is the client's contact.
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

#### What's wrong with a standard hash table
Consider the case where we use a normal hash table. When constructing the hash table, the OS could easily see which memory slot is written and which is not, which means later, when `findRegisteredUsers` do a lookup, the OS knows exactly if this is a match or miss. 

Plus server knows which entry in `registeredUsers` is being checked at this time, the server learns user's contacts. 

#### What's Oblivious Hash Table 
In stead of a normal hash table, we would like the table to have one additional feature: the OS cannot learn if any look up results in a hit or miss.  

To do this, we need to touch all possible memory location for the client contact's hash table once, and store the client's contact either in a real memory location or some dummy location so that the OS can't tell the difference. 

The construction process is expensive, but after the construction, the OS can't tell whenever a lookup if performed, if this lookup results in a hit or miss. 

#### Complexity
As one can see, the expensive part of this method is the cost for building the oblivious hash table and the cost for doing a linear scan on the `registeredUsers` database.  `registeredUsers` database is the bigger block here with 10 million entires. 

## 2022: Faster and More Efficient with Path ORAM
Let's fast forward again to 2022. Signal has grown from 10M to 1B registered users and they really need something that works faster. In 2017, a linear scan is needed because we would like to hide which entry in database is being accessed from the server, Path ORAM is a much better solution and easy to implement. 

This new solution includes: 1. using Path ORAM to store the `registeredUsers` database,  2. iterate through `clientContacts` and do a binary search in the `registeredUsers` database for every entry.

In this blog (_TODO: link to the intro to oram blog_) we described how Path ORAM works, and here we specifically describe how the Path ORAM is construected and used in this scenario. 
1. sort all `registeredUsers` based on their phone numbers, and assign the index to that specific user. 
2. assign a leaf node for each `registeredUsers` and initialize the ORAM
3. whenever checking a `clientContacts`, do a binary search in `registeredUsers` since the users are sorted

With Path ORAM working as the underlying framework, linear scan is no longer needed and all access patterns are hidden for database stored in untrusted memory space. 

#### Complexity
In the solution involving linear scan, assuming 1 billion of registered users, the cost is 1 billion. With Path ORAM, each access to the `registeredUsers` database is roughly 30 read and 30 writes, because a binary tree with 2 billion nodes has 30 levels. Doing the binary search for the client contact requires roughly 30 access to the database. All together, this is 1800 memory access, comparing with the initial 1 billion. 

## At the end
It's been 10 years for private contact discovery to have a near native implementation. Yes, ORAM is slower, comparing with no privacy solutions, but it has long been misunderstood on how slow it is exactly. Back in 2017, Signal was investigating into Path ORAM already. However, they misunderstood the performance with an incorrect implementation and optimization. Here we're presenting an Oblivious STL for a standardized implementation with optimization to help the general audience better understand how much cost exactly is needed for privacy. 

