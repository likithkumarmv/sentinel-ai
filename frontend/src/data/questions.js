/**
 * ═══════════════════════════════════════════════════════════
 *  SENTINEL AI — QUESTION BANK
 *  Dedicated repository of interview questions.
 *  Used by the frontend for demo mode & question count config.
 *  Mirrors the backend question_bank.py structure.
 * ═══════════════════════════════════════════════════════════
 */

const PYTHON_QUESTIONS = {
  intern: [
    {
      id: "py_i_1",
      question: "What is the difference between a list and a tuple in Python?",
      ideal_answer: "Lists are mutable (can be modified after creation) and use square brackets []. Tuples are immutable (cannot be changed) and use parentheses (). Tuples are hashable (can be dictionary keys), lists cannot.",
      expected_keywords: ["mutable", "immutable", "ordered", "hashable"],
      difficulty: 1,
    },
    {
      id: "py_i_2",
      question: "Explain what a Python dictionary is and how you would use it.",
      ideal_answer: "A dictionary is an unordered collection of key-value pairs, implemented as a hash table. Keys must be hashable. Access by key is O(1) average.",
      expected_keywords: ["key-value", "hash table", "KeyError", "get()"],
      difficulty: 1,
    },
    {
      id: "py_i_3",
      question: "What are *args and **kwargs in Python functions?",
      ideal_answer: "*args collects extra positional arguments into a tuple. **kwargs collects extra keyword arguments into a dictionary. They allow functions to accept any number of arguments.",
      expected_keywords: ["variable arguments", "tuple", "dictionary", "unpacking"],
      difficulty: 1,
    },
    {
      id: "py_i_4",
      question: "Explain the difference between append() and extend() on a Python list.",
      ideal_answer: "append(x) adds x as a single element to the end of the list. extend(iterable) iterates over the argument and adds each element individually.",
      expected_keywords: ["single element", "iterable", "in-place", "list"],
      difficulty: 1,
    },
    {
      id: "py_i_5",
      question: "What is a Python function? Write one that takes two numbers and returns their sum.",
      ideal_answer: "A function is a reusable block of code defined with the 'def' keyword. Example: def add(a, b): return a + b.",
      expected_keywords: ["def", "return", "parameter", "argument", "None"],
      difficulty: 1,
    },
    {
      id: "py_i_6",
      question: "What is a for loop in Python? How does it differ from a while loop?",
      ideal_answer: "A for loop iterates over a sequence (list, range, string). A while loop continues as long as a condition is true. For loops are preferred when iteration count is known.",
      expected_keywords: ["iteration", "sequence", "condition", "range"],
      difficulty: 1,
    },
    {
      id: "py_i_7",
      question: "What are Python's basic data types? Name at least five.",
      ideal_answer: "int, float, str, bool, list, tuple, dict, set, NoneType. Python is dynamically typed — variables don't need type declarations.",
      expected_keywords: ["int", "float", "string", "boolean", "dynamic"],
      difficulty: 1,
    },
    {
      id: "py_i_8",
      question: "What is string slicing in Python? Give an example.",
      ideal_answer: "String slicing extracts a substring using [start:stop:step]. Example: 'Hello'[1:4] returns 'ell'. Negative indices count from the end.",
      expected_keywords: ["slice", "index", "substring", "step"],
      difficulty: 1,
    },
  ],
  junior: [
    {
      id: "py_j_1",
      question: "Explain Python's GIL. How does it affect multithreading?",
      ideal_answer: "The Global Interpreter Lock is a mutex in CPython that allows only one thread to execute Python bytecode at a time. CPU-bound multithreaded code gets no parallelism.",
      expected_keywords: ["thread safety", "CPython", "I/O bound", "multiprocessing"],
      difficulty: 2,
    },
    {
      id: "py_j_2",
      question: "What are Python decorators? Write a timing decorator from scratch.",
      ideal_answer: "Decorators are higher-order functions that wrap another function to extend its behavior without modifying it.",
      expected_keywords: ["wrapper", "closure", "higher-order function", "functools"],
      difficulty: 2,
    },
    {
      id: "py_j_3",
      question: "Explain the difference between list comprehensions and generator expressions.",
      ideal_answer: "List comprehensions create the entire list in memory at once. Generator expressions produce values lazily, one at a time. Generators use O(1) memory.",
      expected_keywords: ["lazy evaluation", "memory", "iterator", "yield"],
      difficulty: 2,
    },
    {
      id: "py_j_4",
      question: "What is the difference between shallow copy and deep copy in Python?",
      ideal_answer: "Shallow copy creates a new object but references the same nested objects. Deep copy recursively copies all objects. Use copy.deepcopy() for deep copies.",
      expected_keywords: ["shallow", "deep", "reference", "copy module"],
      difficulty: 2,
    },
    {
      id: "py_j_5",
      question: "How do you handle exceptions in Python? Explain try/except/finally.",
      ideal_answer: "try block contains code that might raise an exception. except catches specific exceptions. finally always executes regardless of exceptions. Use specific exception types.",
      expected_keywords: ["try", "except", "finally", "raise", "exception"],
      difficulty: 2,
    },
  ],
  mid: [
    {
      id: "py_m_1",
      question: "Explain Python's memory management and garbage collection.",
      ideal_answer: "Python uses reference counting as the primary mechanism. For circular references, the cyclic garbage collector detects and collects unreachable cycles.",
      expected_keywords: ["reference counting", "cyclic garbage collector", "heap", "gc module"],
      difficulty: 3,
    },
    {
      id: "py_m_2",
      question: "What is the difference between __str__ and __repr__ in Python?",
      ideal_answer: "__str__ returns a human-readable string. __repr__ returns an unambiguous developer-facing representation ideally recreatable via eval().",
      expected_keywords: ["dunder", "human readable", "unambiguous", "fallback", "eval"],
      difficulty: 3,
    },
    {
      id: "py_m_3",
      question: "Explain Python's descriptor protocol. How do properties work internally?",
      ideal_answer: "Descriptors implement __get__, __set__, __delete__. Properties are descriptors. The descriptor protocol defines how attribute access is intercepted.",
      expected_keywords: ["__get__", "__set__", "descriptor", "property", "protocol"],
      difficulty: 3,
    },
    {
      id: "py_m_4",
      question: "What are context managers in Python? How does the 'with' statement work?",
      ideal_answer: "Context managers implement __enter__ and __exit__. The 'with' statement ensures cleanup. contextlib.contextmanager simplifies creation using generators.",
      expected_keywords: ["__enter__", "__exit__", "with", "contextlib", "cleanup"],
      difficulty: 3,
    },
  ],
  senior: [
    {
      id: "py_s_1",
      question: "Design a metaclass that automatically logs every method call on any class that uses it.",
      ideal_answer: "Define a metaclass inheriting from type. Override __new__ to iterate over class attributes, wrapping each callable with a logging decorator.",
      expected_keywords: ["type", "__new__", "metaclass", "descriptor", "MRO"],
      difficulty: 4,
    },
    {
      id: "py_s_2",
      question: "Explain how Python's import system works. What are import hooks and finders?",
      ideal_answer: "Python's import system uses finders and loaders. sys.meta_path contains finders. importlib allows programmatic imports. Import hooks customize module loading.",
      expected_keywords: ["finder", "loader", "sys.meta_path", "importlib", "__import__"],
      difficulty: 4,
    },
  ],
  lead: [
    {
      id: "py_l_1",
      question: "Design a distributed task queue in Python from scratch, without using Celery.",
      ideal_answer: "Architecture: Redis as message broker with BRPOPLPUSH for reliable queue operations. Workers poll the queue, execute tasks, and send acknowledgments.",
      expected_keywords: ["Redis", "idempotency", "worker", "broker", "acknowledgment"],
      difficulty: 5,
    },
    {
      id: "py_l_2",
      question: "How would you design a high-performance async web framework from scratch in Python?",
      ideal_answer: "Use asyncio event loop, implement ASGI protocol, build routing with trie data structure, middleware chain pattern, connection pooling for databases.",
      expected_keywords: ["asyncio", "ASGI", "event loop", "middleware", "routing"],
      difficulty: 5,
    },
  ],
}

const C_QUESTIONS = {
  intern: [
    {
      id: "c_i_1",
      question: "What is the difference between a compiler and an interpreter? Which one does C use?",
      ideal_answer: "A compiler translates the entire source code into machine code at once before execution. An interpreter translates line by line. C uses a compiler (GCC, Clang).",
      expected_keywords: ["compiler", "machine code", "source code", "linker"],
      difficulty: 1,
    },
    {
      id: "c_i_2",
      question: "Explain the int, float, char, and double data types in C.",
      ideal_answer: "int stores whole numbers (4 bytes). float stores single-precision floating-point (4 bytes). double stores double-precision (8 bytes). char stores a single character (1 byte).",
      expected_keywords: ["integer", "floating point", "character", "bytes"],
      difficulty: 1,
    },
    {
      id: "c_i_3",
      question: "What is a variable in C? How do you declare and initialize one?",
      ideal_answer: "A variable is a named memory location. Declaration: int x; Initialization: int x = 10; Uninitialized locals contain garbage values.",
      expected_keywords: ["memory", "data type", "identifier", "garbage value"],
      difficulty: 1,
    },
    {
      id: "c_i_4",
      question: "Write a C program to print Hello World and explain each line.",
      ideal_answer: "#include <stdio.h> includes standard I/O. int main() is the entry point. printf outputs text. return 0 signals success.",
      expected_keywords: ["printf", "stdio.h", "main", "return", "header"],
      difficulty: 1,
    },
    {
      id: "c_i_5",
      question: "What is the difference between a while loop and a do-while loop?",
      ideal_answer: "while is entry-controlled (may execute zero times). do-while is exit-controlled (executes at least once).",
      expected_keywords: ["condition", "execute", "at least once", "entry controlled"],
      difficulty: 1,
    },
    {
      id: "c_i_6",
      question: "What is the sizeof operator in C? How does it work?",
      ideal_answer: "sizeof returns the size in bytes of a type or variable at compile time. sizeof(int) is typically 4. It's a compile-time operator, not a function.",
      expected_keywords: ["bytes", "compile time", "operator", "size"],
      difficulty: 1,
    },
    {
      id: "c_i_7",
      question: "Explain the difference between = and == in C.",
      ideal_answer: "= is the assignment operator (assigns a value). == is the comparison operator (checks equality). Using = in an if condition is a common bug.",
      expected_keywords: ["assignment", "comparison", "operator", "equality"],
      difficulty: 1,
    },
  ],
  junior: [
    {
      id: "c_j_1",
      question: "Explain pointers in C. What is the difference between the * and & operators?",
      ideal_answer: "A pointer stores the memory address of another variable. & returns the address. * dereferences the pointer. Dereferencing NULL causes undefined behavior.",
      expected_keywords: ["memory address", "dereference", "reference", "NULL"],
      difficulty: 2,
    },
    {
      id: "c_j_2",
      question: "What is the difference between malloc() and calloc()?",
      ideal_answer: "malloc allocates a single block without initializing. calloc allocates n blocks and initializes to zero. Both return void pointer. Must call free().",
      expected_keywords: ["heap", "dynamic memory", "initialization", "free", "memory leak"],
      difficulty: 2,
    },
    {
      id: "c_j_3",
      question: "How do arrays and pointers relate in C? Are they the same?",
      ideal_answer: "Arrays decay to pointers in most expressions. arr[i] equals *(arr+i). But array names are not modifiable lvalues — you can't reassign them.",
      expected_keywords: ["base address", "contiguous", "pointer arithmetic", "decay"],
      difficulty: 2,
    },
    {
      id: "c_j_4",
      question: "What are structures in C? How do they differ from unions?",
      ideal_answer: "Structures group different data types under one name. Each member has its own memory. Unions share the same memory — only one member is valid at a time.",
      expected_keywords: ["struct", "union", "member", "memory", "alignment"],
      difficulty: 2,
    },
  ],
  mid: [
    {
      id: "c_m_1",
      question: "Explain stack and heap memory. What gets stored where?",
      ideal_answer: "Stack stores local variables and function calls (LIFO, automatic). Heap stores dynamic allocations (manual management, slower).",
      expected_keywords: ["local variables", "dynamic allocation", "LIFO", "scope"],
      difficulty: 3,
    },
    {
      id: "c_m_2",
      question: "What are function pointers in C? Write a simple example.",
      ideal_answer: "Function pointers store the address of a function. Syntax: int (*fptr)(int, int) = &add; They enable callbacks and runtime dispatch.",
      expected_keywords: ["callback", "function address", "typedef", "flexibility"],
      difficulty: 3,
    },
    {
      id: "c_m_3",
      question: "Explain the preprocessor in C. What are macros and when should you avoid them?",
      ideal_answer: "The preprocessor runs before compilation. #define creates macros. Macros have no type safety and can cause unexpected side effects. Prefer inline functions.",
      expected_keywords: ["#define", "preprocessor", "macro", "inline", "include"],
      difficulty: 3,
    },
  ],
  senior: [
    {
      id: "c_s_1",
      question: "Explain the volatile keyword in C. When is it critical in embedded systems?",
      ideal_answer: "volatile tells the compiler not to optimize reads/writes. Critical for hardware registers, ISR variables, and shared multi-threaded data. Does NOT provide atomicity.",
      expected_keywords: ["compiler optimization", "hardware register", "interrupt", "caching"],
      difficulty: 4,
    },
    {
      id: "c_s_2",
      question: "What is undefined behavior in C? Give three examples and explain the consequences.",
      ideal_answer: "UB means the standard imposes no requirements. Examples: dereferencing NULL, signed integer overflow, accessing freed memory. Compiler can assume UB never happens.",
      expected_keywords: ["undefined", "standard", "optimization", "segfault", "compiler"],
      difficulty: 4,
    },
  ],
  lead: [
    {
      id: "c_l_1",
      question: "Design a thread-safe memory pool allocator in C. Walk me through your architecture.",
      ideal_answer: "Pre-allocate contiguous block, divide into fixed-size chunks in a free list. Use per-pool mutexes. For lock-free: CAS atomic operations, handle ABA problem.",
      expected_keywords: ["mutex", "atomic", "free list", "lock-free", "ABA problem"],
      difficulty: 5,
    },
  ],
}

/**
 * Get questions for a given topic and difficulty.
 * @param {string} topic - "python" or "c_programming"
 * @param {string} difficulty - "intern"|"junior"|"mid"|"senior"|"lead"
 * @param {number} count - Number of questions to return
 * @returns {Array} Shuffled array of question objects
 */
export function getQuestions(topic, difficulty, count = 5) {
  const bank = topic === "c_programming" ? C_QUESTIONS : PYTHON_QUESTIONS
  const questions = bank[difficulty] || bank["intern"]
  const shuffled = [...questions].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/**
 * Get the maximum number of questions available for a topic+difficulty combo.
 */
export function getMaxQuestions(topic, difficulty) {
  const bank = topic === "c_programming" ? C_QUESTIONS : PYTHON_QUESTIONS
  const questions = bank[difficulty] || bank["intern"]
  return questions.length
}

/**
 * Get ALL questions for a topic (across all difficulties).
 * Used for demo mode where we pool everything.
 */
export function getAllQuestions(topic) {
  const bank = topic === "c_programming" ? C_QUESTIONS : PYTHON_QUESTIONS
  const all = []
  Object.values(bank).forEach(qs => all.push(...qs))
  return all
}

export { PYTHON_QUESTIONS, C_QUESTIONS }
export default { PYTHON_QUESTIONS, C_QUESTIONS, getQuestions, getMaxQuestions, getAllQuestions }
