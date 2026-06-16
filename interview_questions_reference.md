# SentinelAI Interview Questions Reference

This document contains all the interview questions currently available in the SentinelAI Question Bank.

## C Programming Questions

### Intern
1. **What is the difference between a compiler and an interpreter? Which one does C use?**
   - *Ideal Answer:* A compiler translates the entire source code into machine code at once before execution, producing an executable binary. An interpreter translates and executes code line by line at runtime. C uses a compiler (like GCC or Clang).
   - *Follow-ups:* Name one advantage of compilation. What happens during linking?
   - *Keywords:* compiler, machine code, source code, linker

2. **Explain the int, float, char, and double data types in C.**
   - *Ideal Answer:* int stores whole numbers (4 bytes). float stores single-precision floating-point (4 bytes). double stores double-precision floating-point (8 bytes). char stores a single character (1 byte).
   - *Follow-ups:* How many bytes does each type use? What happens when you store 3.14 in an int variable?
   - *Keywords:* integer, floating point, character, bytes

3. **What is a variable in C? How do you declare and initialize one?**
   - *Ideal Answer:* A variable is a named memory location. Declaration: `int x;`. Initialization: `int x = 10;`.
   - *Follow-ups:* What is the difference between declaration and definition? What happens to uninitialized variables?
   - *Keywords:* memory, data type, identifier, garbage value

4. **Write a C program to print Hello World and explain each line.**
   - *Ideal Answer:* `#include <stdio.h>` for `printf`. `int main()` is the entry point. `printf("Hello World")` for output. `return 0` for success.
   - *Follow-ups:* Why do we need #include stdio.h? What does return 0 mean?
   - *Keywords:* printf, stdio.h, main, return, header

5. **What is the difference between a while loop and a do-while loop?**
   - *Ideal Answer:* While checks condition before (0+ executions). Do-while checks after (1+ executions).
   - *Follow-ups:* When is do-while the better choice? What is an infinite loop?
   - *Keywords:* condition, execute, at least once, entry controlled

### Junior
1. **Explain pointers in C. What is the difference between the * and & operators?**
   - *Ideal Answer:* Pointer stores memory address. `&` is address-of. `*` is dereference (access value).
   - *Follow-ups:* What is a NULL pointer? What happens if you dereference a NULL pointer?
   - *Keywords:* memory address, dereference, reference, NULL

2. **What is the difference between malloc() and calloc()?**
   - *Ideal Answer:* `malloc` allocates one block (uninitialized). `calloc` allocates multiple blocks (zero-initialized).
   - *Follow-ups:* What is a memory leak? Why must you always call free()?
   - *Keywords:* heap, dynamic memory, initialization, free, memory leak

3. **How do arrays and pointers relate in C? Are they the same?**
   - *Ideal Answer:* Related but not same. Array name decays to pointer to first element. `arr[i]` is `*(arr + i)`.
   - *Follow-ups:* What does arr[i] mean in pointer arithmetic? Can you assign a new address to an array name?
   - *Keywords:* base address, contiguous, pointer arithmetic, decay

### Mid
1. **Explain stack and heap memory. What gets stored where?**
   - *Ideal Answer:* Stack: local variables (LIFO, automatic). Heap: dynamic memory (manual via malloc).
   - *Follow-ups:* What causes stack overflow? Why is heap slower than stack?
   - *Keywords:* local variables, dynamic allocation, LIFO, scope

2. **What are function pointers in C? Write a simple example.**
   - *Ideal Answer:* Store address of a function. Syntax: `int (*fptr)(int, int)`. Used for callbacks.
   - *Follow-ups:* How are function pointers used in callbacks? Syntax for pointer to function taking two ints returning int?
   - *Keywords:* callback, function address, typedef, flexibility

### Senior
1. **Explain the volatile keyword in C. When is it critical in embedded systems?**
   - *Ideal Answer:* Prevents compiler optimization for a variable. Critical for hardware registers and ISRs.
   - *Follow-ups:* Does volatile make code thread-safe? What is the difference between volatile and const volatile?
   - *Keywords:* compiler optimization, hardware register, interrupt, caching

### Lead
1. **Design a thread-safe memory pool allocator in C. Walk me through your architecture.**
   - *Ideal Answer:* Pre-allocate block, use free list, mutex/lock-free CAS for thread safety, slab allocation for fragmentation.
   - *Follow-ups:* How would you handle fragmentation? Prove your design prevents race conditions without a global mutex.
   - *Keywords:* mutex, atomic, free list, lock-free, ABA problem

---

## Python Programming Questions

### Intern
1. **What is the difference between a list and a tuple in Python?**
   - *Ideal Answer:* Lists are mutable `[]`. Tuples are immutable `()`. Tuples are hashable and faster.
   - *Follow-ups:* When would you choose tuple over list? Why are tuples hashable but lists are not?
   - *Keywords:* mutable, immutable, ordered, hashable

2. **Explain what a Python dictionary is and how you would use it.**
   - *Ideal Answer:* Key-value collection (hash table). O(1) lookup.
   - *Follow-ups:* What happens if you access a missing key? How is dict different from list?
   - *Keywords:* key-value, hash table, KeyError, get()

3. **What are *args and **kwargs in Python functions?**
   - *Ideal Answer:* `*args` for variable positional args (tuple). `**kwargs` for variable keyword args (dict).
   - *Follow-ups:* Write a function accepting any number of arguments. What order must they appear?
   - *Keywords:* variable arguments, tuple, dictionary, unpacking

4. **Explain the difference between append() and extend() on a Python list.**
   - *Ideal Answer:* `append` adds as one element. `extend` iterates and adds each element.
   - *Follow-ups:* What does insert() do? How is += different from append for lists?
   - *Keywords:* single element, iterable, in-place, list

5. **What is a Python function? Write one that takes two numbers and returns their sum.**
   - *Ideal Answer:* Reusable block defined with `def`. `return` sends value back.
   - *Follow-ups:* What is a return statement? What happens if you don't have a return?
   - *Keywords:* def, return, parameter, argument, None

### Junior
1. **Explain Python's GIL. How does it affect multithreading?**
   - *Ideal Answer:* Global Interpreter Lock. Only one thread executes Python bytecode. Bad for CPU-bound, okay for I/O.
   - *Follow-ups:* If the GIL exists, why use threads at all? What is the difference between I/O-bound and CPU-bound tasks?
   - *Keywords:* thread safety, CPython, I/O bound, multiprocessing

2. **What are Python decorators? Write a timing decorator from scratch.**
   - *Ideal Answer:* Higher-order functions wrapping others. `@functools.wraps` preserves metadata.
   - *Follow-ups:* What is functools.wraps? How do you write a decorator that accepts arguments?
   - *Keywords:* wrapper, closure, higher-order function, functools

3. **Explain the difference between list comprehensions and generator expressions. What is the memory difference?**
   - *Ideal Answer:* List comprehension `[x for x in range(n)]` (eager). Generator `(x for x in range(n))` (lazy, O(1) memory).
   - *Follow-ups:* When would a generator prevent a crash compared to a list? What does the yield keyword do?
   - *Keywords:* lazy evaluation, memory, iterator, yield

### Mid
1. **Explain Python's memory management and garbage collection.**
   - *Ideal Answer:* Reference counting + Cyclic GC for circular references. Private heap.
   - *Follow-ups:* What is reference counting? How does Python handle circular references?
   - *Keywords:* reference counting, cyclic garbage collector, heap, gc module

2. **What is the difference between __str__ and __repr__ in Python?**
   - *Ideal Answer:* `__str__` is human-readable. `__repr__` is unambiguous/developer-facing (for debugging).
   - *Follow-ups:* Which one should be unambiguous? What happens when you call str() on an object that only has __repr__ defined?
   - *Keywords:* dunder, human readable, unambiguous, fallback, eval

### Senior
1. **Design a metaclass that automatically logs every method call on any class that uses it.**
   - *Ideal Answer:* Inherit from `type`, override `__new__`, wrap callables with logging decorator.
   - *Follow-ups:* How is a metaclass different from a decorator? What is the difference between __new__ and __init__ in metaclasses?
   - *Keywords:* type, __new__, metaclass, descriptor, MRO

### Lead
1. **Design a distributed task queue in Python from scratch, without using Celery.**
   - *Ideal Answer:* Redis as broker, workers poll with BRPOPLPUSH, use visibility timeouts, task IDs for idempotency.
   - *Follow-ups:* How do you ensure exactly-once execution? How do you handle a worker dying in the middle of a task?
   - *Keywords:* Redis, idempotency, worker, broker, acknowledgment
