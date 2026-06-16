import random
from typing import List, Dict, Optional

C_QUESTIONS = {
    "intern": [
        {
            "id": "c_i_1",
            "question": "What is the difference between a compiler and an interpreter? Which one does C use?",
            "ideal_answer": "A compiler translates the entire source code into machine code at once before execution, producing an executable binary. An interpreter translates and executes code line by line at runtime. C uses a compiler (like GCC or Clang). The compilation process involves preprocessing, compilation to assembly, assembly to object code, and linking to produce the final executable.",
            "follow_ups": ["Name one advantage of compilation.", "What happens during linking?"],
            "expected_keywords": ["compiler", "machine code", "source code", "linker"],
            "difficulty": 1, "topic": "c"
        },
        {
            "id": "c_i_2",
            "question": "Explain the int, float, char, and double data types in C.",
            "ideal_answer": "int stores whole numbers (typically 4 bytes, range ~-2B to +2B). float stores single-precision floating-point numbers (4 bytes, ~6-7 decimal digits precision). double stores double-precision floating-point numbers (8 bytes, ~15-16 digits precision). char stores a single character or small integer (1 byte, range -128 to 127 or 0 to 255). Storing 3.14 in an int truncates the decimal, storing just 3.",
            "follow_ups": ["How many bytes does each type use?", "What happens when you store 3.14 in an int variable?"],
            "expected_keywords": ["integer", "floating point", "character", "bytes"],
            "difficulty": 1, "topic": "c"
        },
        {
            "id": "c_i_3",
            "question": "What is a variable in C? How do you declare and initialize one?",
            "ideal_answer": "A variable is a named memory location that stores data. Declaration specifies the type and name (e.g., int x;), while initialization assigns an initial value (int x = 10;). Declaration tells the compiler to reserve memory, definition actually allocates it. Uninitialized local variables contain garbage values — whatever was previously in that memory location.",
            "follow_ups": ["What is the difference between declaration and definition?", "What happens to uninitialized variables?"],
            "expected_keywords": ["memory", "data type", "identifier", "garbage value"],
            "difficulty": 1, "topic": "c"
        },
        {
            "id": "c_i_4",
            "question": "Write a C program to print Hello World and explain each line.",
            "ideal_answer": "#include <stdio.h> includes the standard I/O header for printf. int main() is the entry point — the OS calls this function. printf(\"Hello World\") outputs text to stdout. return 0 signals successful execution to the OS. The header file is needed because printf is declared there; without it, the compiler won't know printf's signature.",
            "follow_ups": ["Why do we need #include stdio.h?", "What does return 0 mean?"],
            "expected_keywords": ["printf", "stdio.h", "main", "return", "header"],
            "difficulty": 1, "topic": "c"
        },
        {
            "id": "c_i_5",
            "question": "What is the difference between a while loop and a do-while loop?",
            "ideal_answer": "A while loop is entry-controlled — it checks the condition before executing the body, so it may execute zero times. A do-while loop is exit-controlled — it executes the body at least once, then checks the condition. do-while is better when you need guaranteed first execution, like menu-driven programs. An infinite loop occurs when the condition never becomes false.",
            "follow_ups": ["When is do-while the better choice?", "What is an infinite loop?"],
            "expected_keywords": ["condition", "execute", "at least once", "entry controlled"],
            "difficulty": 1, "topic": "c"
        },
    ],
    "junior": [
        {
            "id": "c_j_1",
            "question": "Explain pointers in C. What is the difference between the * and & operators?",
            "ideal_answer": "A pointer is a variable that stores the memory address of another variable. The & (address-of) operator returns the memory address of a variable. The * (dereference) operator accesses the value at the address stored in a pointer. A NULL pointer points to address 0 and indicates 'no valid address'. Dereferencing a NULL pointer causes undefined behavior — typically a segmentation fault.",
            "follow_ups": ["What is a NULL pointer?", "What happens if you dereference a NULL pointer?"],
            "expected_keywords": ["memory address", "dereference", "reference", "NULL"],
            "difficulty": 2, "topic": "c"
        },
        {
            "id": "c_j_2",
            "question": "What is the difference between malloc() and calloc()?",
            "ideal_answer": "malloc(size) allocates a single block of 'size' bytes on the heap without initializing it (contents are garbage). calloc(n, size) allocates 'n' blocks of 'size' bytes each AND initializes all bytes to zero. Both return a void pointer. You must call free() to release the memory; failure to do so causes memory leaks where allocated memory is never returned to the OS.",
            "follow_ups": ["What is a memory leak?", "Why must you always call free()?"],
            "expected_keywords": ["heap", "dynamic memory", "initialization", "free", "memory leak"],
            "difficulty": 2, "topic": "c"
        },
        {
            "id": "c_j_3",
            "question": "How do arrays and pointers relate in C? Are they the same?",
            "ideal_answer": "Arrays and pointers are related but not identical. An array name decays to a pointer to its first element in most expressions. arr[i] is equivalent to *(arr + i) — pointer arithmetic. However, an array name is not a modifiable lvalue — you cannot assign a new address to it. Arrays have a fixed size known at compile time; pointers are variables that can point anywhere.",
            "follow_ups": ["What does arr[i] mean in pointer arithmetic?", "Can you assign a new address to an array name?"],
            "expected_keywords": ["base address", "contiguous", "pointer arithmetic", "decay"],
            "difficulty": 2, "topic": "c"
        },
    ],
    "mid": [
        {
            "id": "c_m_1",
            "question": "Explain stack and heap memory. What gets stored where?",
            "ideal_answer": "Stack memory stores local variables, function parameters, and return addresses in a LIFO structure. It's automatically managed — variables are pushed/popped with function calls. Heap memory is for dynamic allocation via malloc/calloc — manually managed, slower due to allocation overhead. Stack overflow occurs from deep recursion or large local arrays. Heap is slower because the allocator must search for free blocks and manage fragmentation.",
            "follow_ups": ["What causes stack overflow?", "Why is heap slower than stack?"],
            "expected_keywords": ["local variables", "dynamic allocation", "LIFO", "scope"],
            "difficulty": 3, "topic": "c"
        },
        {
            "id": "c_m_2",
            "question": "What are function pointers in C? Write a simple example.",
            "ideal_answer": "Function pointers store the address of a function, enabling indirect function calls. Syntax: int (*fptr)(int, int) = &add; result = fptr(3, 4); They enable callbacks — passing functions as arguments to other functions (like qsort). typedef simplifies syntax: typedef int (*Operation)(int, int); This provides runtime flexibility to choose which function to call.",
            "follow_ups": ["How are function pointers used in callbacks?", "Syntax for pointer to function taking two ints returning int?"],
            "expected_keywords": ["callback", "function address", "typedef", "flexibility"],
            "difficulty": 3, "topic": "c"
        },
    ],
    "senior": [
        {
            "id": "c_s_1",
            "question": "Explain the volatile keyword in C. When is it critical in embedded systems?",
            "ideal_answer": "volatile tells the compiler not to optimize reads/writes to a variable — it must always read from memory, not from a register cache. Critical in embedded systems for: hardware registers (memory-mapped I/O), variables modified by interrupt service routines, and shared variables in multi-threaded contexts. volatile does NOT provide atomicity or thread safety — you still need mutexes. const volatile means the program can't modify it but hardware can.",
            "follow_ups": ["Does volatile make code thread-safe?", "What is the difference between volatile and const volatile?"],
            "expected_keywords": ["compiler optimization", "hardware register", "interrupt", "caching"],
            "difficulty": 4, "topic": "c"
        },
    ],
    "lead": [
        {
            "id": "c_l_1",
            "question": "Design a thread-safe memory pool allocator in C. Walk me through your architecture.",
            "ideal_answer": "Architecture: Pre-allocate a large contiguous block, divide into fixed-size chunks linked in a free list. Use per-pool mutexes (not global) for thread safety. Allocation: pop from free list (O(1)). Deallocation: push back to free list. To prevent fragmentation, use slab allocation with size classes. For lock-free design, use CAS (compare-and-swap) atomic operations on the free list head, handling the ABA problem with tagged pointers or hazard pointers.",
            "follow_ups": ["How would you handle fragmentation?", "Prove your design prevents race conditions without a global mutex."],
            "expected_keywords": ["mutex", "atomic", "free list", "lock-free", "ABA problem"],
            "difficulty": 5, "topic": "c"
        },
    ]
}

PYTHON_QUESTIONS = {
    "intern": [
        {
            "id": "py_i_1",
            "question": "What is the difference between a list and a tuple in Python?",
            "ideal_answer": "Lists are mutable (can be modified after creation) and use square brackets []. Tuples are immutable (cannot be changed) and use parentheses (). Tuples are hashable (can be dictionary keys), lists cannot. Use tuples for fixed collections like coordinates or function return values. Tuples are slightly faster and use less memory due to immutability optimizations.",
            "follow_ups": ["When would you choose tuple over list?", "Why are tuples hashable but lists are not?"],
            "expected_keywords": ["mutable", "immutable", "ordered", "hashable"],
            "difficulty": 1, "topic": "python"
        },
        {
            "id": "py_i_2",
            "question": "Explain what a Python dictionary is and how you would use it.",
            "ideal_answer": "A dictionary is an unordered collection of key-value pairs, implemented as a hash table. Keys must be hashable (strings, numbers, tuples). Access by key is O(1) average. Accessing a missing key raises KeyError; use dict.get(key, default) to avoid this. Unlike lists which use integer indices, dicts use arbitrary keys for fast lookup.",
            "follow_ups": ["What happens if you access a missing key?", "How is dict different from list?"],
            "expected_keywords": ["key-value", "hash table", "KeyError", "get()"],
            "difficulty": 1, "topic": "python"
        },
        {
            "id": "py_i_3",
            "question": "What are *args and **kwargs in Python functions?",
            "ideal_answer": "*args collects extra positional arguments into a tuple. **kwargs collects extra keyword arguments into a dictionary. They allow functions to accept any number of arguments. Order in function signature must be: regular args, *args, keyword-only args, **kwargs. Example: def f(*args, **kwargs): handles any call like f(1, 2, name='x').",
            "follow_ups": ["Write a function accepting any number of arguments.", "What order must they appear?"],
            "expected_keywords": ["variable arguments", "tuple", "dictionary", "unpacking"],
            "difficulty": 1, "topic": "python"
        },
        {
            "id": "py_i_4",
            "question": "Explain the difference between append() and extend() on a Python list.",
            "ideal_answer": "append(x) adds x as a single element to the end of the list — even if x is a list, it becomes one nested element. extend(iterable) iterates over the argument and adds each element individually. insert(i, x) adds x at position i. += is equivalent to extend for lists, not append. All modify the list in-place and return None.",
            "follow_ups": ["What does insert() do?", "How is += different from append for lists?"],
            "expected_keywords": ["single element", "iterable", "in-place", "list"],
            "difficulty": 1, "topic": "python"
        },
        {
            "id": "py_i_5",
            "question": "What is a Python function? Write one that takes two numbers and returns their sum.",
            "ideal_answer": "A function is a reusable block of code defined with the 'def' keyword. Example: def add(a, b): return a + b. Parameters (a, b) receive values when called: add(3, 5) returns 8. The return statement sends a value back to the caller. Without return, the function returns None by default. Functions enable code reuse and modular design.",
            "follow_ups": ["What is a return statement?", "What happens if you don't have a return?"],
            "expected_keywords": ["def", "return", "parameter", "argument", "None"],
            "difficulty": 1, "topic": "python"
        },
    ],
    "junior": [
        {
            "id": "py_j_1",
            "question": "Explain Python's GIL. How does it affect multithreading?",
            "ideal_answer": "The Global Interpreter Lock (GIL) is a mutex in CPython that allows only one thread to execute Python bytecode at a time. This means CPU-bound multithreaded code gets no parallelism — threads take turns. However, the GIL is released during I/O operations, so I/O-bound tasks (network, file) still benefit from threading. For CPU-bound parallelism, use multiprocessing (separate processes, each with own GIL) or alternatives like C extensions.",
            "follow_ups": ["If the GIL exists, why use threads at all?", "What is the difference between I/O-bound and CPU-bound tasks?"],
            "expected_keywords": ["thread safety", "CPython", "I/O bound", "multiprocessing"],
            "difficulty": 2, "topic": "python"
        },
        {
            "id": "py_j_2",
            "question": "What are Python decorators? Write a timing decorator from scratch.",
            "ideal_answer": "Decorators are higher-order functions that wrap another function to extend its behavior without modifying it. A timing decorator: import time; def timer(func): @functools.wraps(func) def wrapper(*args, **kwargs): start = time.time(); result = func(*args, **kwargs); print(f'{func.__name__} took {time.time()-start:.4f}s'); return result; return wrapper. functools.wraps preserves the original function's name and docstring.",
            "follow_ups": ["What is functools.wraps?", "How do you write a decorator that accepts arguments?"],
            "expected_keywords": ["wrapper", "closure", "higher-order function", "functools"],
            "difficulty": 2, "topic": "python"
        },
        {
            "id": "py_j_3",
            "question": "Explain the difference between list comprehensions and generator expressions. What is the memory difference?",
            "ideal_answer": "List comprehensions [x**2 for x in range(n)] create the entire list in memory at once. Generator expressions (x**2 for x in range(n)) produce values lazily, one at a time, using the yield mechanism internally. For large n, a list could crash with MemoryError while a generator uses constant O(1) memory. Use generators when you only need to iterate once; lists when you need random access or multiple iterations.",
            "follow_ups": ["When would a generator prevent a crash compared to a list?", "What does the yield keyword do?"],
            "expected_keywords": ["lazy evaluation", "memory", "iterator", "yield"],
            "difficulty": 2, "topic": "python"
        },
    ],
    "mid": [
        {
            "id": "py_m_1",
            "question": "Explain Python's memory management and garbage collection.",
            "ideal_answer": "Python uses reference counting as the primary mechanism — each object tracks how many references point to it; when the count hits zero, memory is freed immediately. For circular references (A references B, B references A), the cyclic garbage collector (gc module) periodically detects and collects unreachable cycles. All objects live on a private heap managed by Python's memory allocator. You can tune gc with gc.set_threshold() and force collection with gc.collect().",
            "follow_ups": ["What is reference counting?", "How does Python handle circular references?"],
            "expected_keywords": ["reference counting", "cyclic garbage collector", "heap", "gc module"],
            "difficulty": 3, "topic": "python"
        },
        {
            "id": "py_m_2",
            "question": "What is the difference between __str__ and __repr__ in Python?",
            "ideal_answer": "__str__ returns a human-readable, informal string representation — used by print() and str(). __repr__ returns an unambiguous, developer-facing representation — ideally one that could recreate the object via eval(). If only __repr__ is defined, str() falls back to it. Convention: __repr__ is for debugging (show all state), __str__ is for display (clean output). Both are dunder (double-underscore) methods.",
            "follow_ups": ["Which one should be unambiguous?", "What happens when you call str() on an object that only has __repr__ defined?"],
            "expected_keywords": ["dunder", "human readable", "unambiguous", "fallback", "eval"],
            "difficulty": 3, "topic": "python"
        },
    ],
    "senior": [
        {
            "id": "py_s_1",
            "question": "Design a metaclass that automatically logs every method call on any class that uses it.",
            "ideal_answer": "Define a metaclass inheriting from type. Override __new__ to iterate over the class attributes, wrapping each callable with a logging decorator. The decorator logs function name, args, kwargs, return value, and execution time. Use functools.wraps to preserve metadata. The MRO (Method Resolution Order) determines which methods are inherited. Unlike class decorators, metaclasses affect all subclasses automatically. __new__ creates the class object, __init__ initializes it.",
            "follow_ups": ["How is a metaclass different from a decorator?", "What is the difference between __new__ and __init__ in metaclasses?"],
            "expected_keywords": ["type", "__new__", "metaclass", "descriptor", "MRO"],
            "difficulty": 4, "topic": "python"
        },
    ],
    "lead": [
        {
            "id": "py_l_1",
            "question": "Design a distributed task queue in Python from scratch, without using Celery.",
            "ideal_answer": "Architecture: Redis as message broker with BRPOPLPUSH for reliable queue operations. Workers poll the queue, execute tasks, and send acknowledgments. For exactly-once execution: assign unique task IDs, use Redis SETNX for distributed locking, and make tasks idempotent. Handle worker death with a visibility timeout — if no acknowledgment within N seconds, the task returns to the queue. Use separate queues for priorities, dead-letter queues for failed tasks, and health check heartbeats for workers.",
            "follow_ups": ["How do you ensure exactly-once execution?", "How do you handle a worker dying in the middle of a task?"],
            "expected_keywords": ["Redis", "idempotency", "worker", "broker", "acknowledgment"],
            "difficulty": 5, "topic": "python"
        },
    ]
}

def get_questions(topic: str, difficulty: str, count: int = 5) -> List[Dict]:
    bank = C_QUESTIONS if topic == "c_programming" else PYTHON_QUESTIONS
    questions = bank.get(difficulty, bank["intern"])
    shuffled = questions.copy()
    random.shuffle(shuffled)
    return shuffled[:count]

def get_answer_key(question_id: str, topic: str, difficulty: str) -> Optional[Dict]:
    """Return the ideal answer and expected keywords for a given question ID."""
    bank = C_QUESTIONS if topic == "c_programming" else PYTHON_QUESTIONS
    questions = bank.get(difficulty, bank["intern"])
    for q in questions:
        if q["id"] == question_id:
            return {
                "ideal_answer": q.get("ideal_answer", ""),
                "expected_keywords": q.get("expected_keywords", []),
            }
    return None

def get_follow_up(question_id: str, topic: str, difficulty: str) -> str:
    bank = C_QUESTIONS if topic == "c_programming" else PYTHON_QUESTIONS
    questions = bank.get(difficulty, bank["intern"])
    for q in questions:
        if q["id"] == question_id and q["follow_ups"]:
            return random.choice(q["follow_ups"])
    return "Could you elaborate further on that?"

def check_answer_keywords(answer: str, question_id: str, topic: str, difficulty: str) -> float:
    bank = C_QUESTIONS if topic == "c_programming" else PYTHON_QUESTIONS
    questions = bank.get(difficulty, bank["intern"])
    for q in questions:
        if q["id"] == question_id:
            keywords = q["expected_keywords"]
            found = sum(1 for k in keywords if k.lower() in answer.lower())
            return round(found / len(keywords), 2) if keywords else 0.0
    return 0.0

def find_question_by_text(text: str, topic: str) -> Optional[dict]:
    bank = C_QUESTIONS if topic == "c_programming" else PYTHON_QUESTIONS
    for diff, questions in bank.items():
        for q in questions:
            if q["question"].strip().lower() == text.strip().lower():
                return q
    return None
