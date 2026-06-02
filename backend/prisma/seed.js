const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bugs = [
  // ==================== JAVASCRIPT ====================
  // JS Easy
  {
    language: "javascript",
    difficulty: "easy",
    title: "Off-by-one in Array Sum",
    category: "off-by-one",
    brokenCode: `function sumArray(arr) {
  let sum = 0;
  // Bug: Loops to index equal to length, causing undefined addition
  for (let i = 0; i <= arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}`,
    fixedCode: `function sumArray(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}`,
    explanation: "The loop condition `i <= arr.length` allows `i` to reach `arr.length`, which is out of bounds. Accessing `arr[arr.length]` returns `undefined`, and adding `undefined` to `sum` results in `NaN`."
  },
  {
    language: "javascript",
    difficulty: "easy",
    title: "Shallow Object Assignment Mutation",
    category: "logic",
    brokenCode: `function updateConfig(baseConfig, overrides) {
  // Bug: Direct mutation of baseConfig instead of creating a copy
  const finalConfig = baseConfig;
  for (let key in overrides) {
    finalConfig[key] = overrides[key];
  }
  return finalConfig;
}`,
    fixedCode: `function updateConfig(baseConfig, overrides) {
  const finalConfig = { ...baseConfig };
  for (let key in overrides) {
    finalConfig[key] = overrides[key];
  }
  return finalConfig;
}`,
    explanation: "Assigning `finalConfig = baseConfig` copies the reference, not the object. Mutating `finalConfig` directly mutates the original `baseConfig`. Using object destructuring `{ ...baseConfig }` creates a new copy."
  },
  {
    language: "javascript",
    difficulty: "easy",
    title: "Loose Equality in Type Check",
    category: "logic",
    brokenCode: `function processInput(value) {
  // Bug: Checks falsy check using loose equals which matches '0' or false
  if (value == "") {
    return "Default Value";
  }
  return value;
}`,
    fixedCode: `function processInput(value) {
  if (value === "") {
    return "Default Value";
  }
  return value;
}`,
    explanation: "Using loose equality `==` matches empty strings, but also matches numeric `0` or boolean `false` as equal. Strict equality `===` ensures only actual empty strings are matched."
  },
  {
    language: "javascript",
    difficulty: "easy",
    title: "Falsy Value Blocker",
    category: "null-ref",
    brokenCode: `function getScore(player) {
  // Bug: score of 0 evaluates as falsy and returns 100 instead
  const score = player.score || 100;
  return score;
}`,
    fixedCode: `function getScore(player) {
  const score = player.score !== undefined && player.score !== null ? player.score : 100;
  return score;
}`,
    explanation: "Using the logical OR operator `||` treats `0` as falsy, overriding a valid score of 0 with the default 100. Checking for null/undefined explicitly preserves 0."
  },
  // JS Medium
  {
    language: "javascript",
    difficulty: "medium",
    title: "String Global Replace Omission",
    category: "syntax",
    brokenCode: `function cleanFormatting(text) {
  // Bug: replace() with a string pattern only replaces the first match
  return text.replace("\\n", " ");
}`,
    fixedCode: `function cleanFormatting(text) {
  return text.replaceAll("\\n", " ");
}`,
    explanation: "The `.replace()` method only replaces the first occurrence of a string search key. To replace all occurrences, `.replaceAll()` or a regular expression with the global `g` flag must be used."
  },
  {
    language: "javascript",
    difficulty: "medium",
    title: "Variable Shadowing in Closure",
    category: "logic",
    brokenCode: `function createCounters() {
  const result = [];
  // Bug: var has function scope, causing all closures to share the final index value
  for (var i = 0; i < 3; i++) {
    result.push(() => i);
  }
  return result;
}`,
    fixedCode: `function createCounters() {
  const result = [];
  for (let i = 0; i < 3; i++) {
    result.push(() => i);
  }
  return result;
}`,
    explanation: "Declaring the loop variable with `var` gives it function scope. By the time the functions in `result` are called, the shared variable `i` has become 3. Using block-scoped `let` binds a new copy of `i` per iteration."
  },
  {
    language: "javascript",
    difficulty: "medium",
    title: "Async Array Map Resolution",
    category: "async",
    brokenCode: `async function fetchAllUsers(userIds, fetchUserFn) {
  // Bug: map does not wait for async promises, returns list of Pending promises
  const users = userIds.map(async (id) => {
    return await fetchUserFn(id);
  });
  return users;
}`,
    fixedCode: `async function fetchAllUsers(userIds, fetchUserFn) {
  const promises = userIds.map(async (id) => {
    return await fetchUserFn(id);
  });
  return await Promise.all(promises);
}`,
    explanation: "`Array.prototype.map` returns an array of Promises immediately. You must await all promises using `Promise.all()` to resolve them into actual values."
  },
  // JS Hard
  {
    language: "javascript",
    difficulty: "hard",
    title: "Context Loss in Callback Method",
    category: "logic",
    brokenCode: `class UserTracker {
  constructor(name) {
    this.name = name;
  }
  getName() {
    return this.name;
  }
  track(callback) {
    callback();
  }
  run() {
    // Bug: Passing method directly loses the 'this' context when called
    this.track(this.getName);
  }
}`,
    fixedCode: `class UserTracker {
  constructor(name) {
    this.name = name;
  }
  getName() {
    return this.name;
  }
  track(callback) {
    return callback();
  }
  run() {
    this.track(this.getName.bind(this));
  }
}`,
    explanation: "Passing `this.getName` as a callback loses the class context (`this`). Binding it via `bind(this)` or wrapping it in an arrow function `() => this.getName()` keeps the target object bound."
  },
  {
    language: "javascript",
    difficulty: "hard",
    title: "Async Racing with Let Mutation",
    category: "async",
    brokenCode: `async function loadData(apiCall) {
  let cache = null;
  // Bug: Repeated calls overwrite each other's status before completing
  async function get() {
    if (cache) return cache;
    const res = await apiCall();
    cache = res;
    return cache;
  }
  return get;
}`,
    fixedCode: `async function loadData(apiCall) {
  let cachePromise = null;
  async function get() {
    if (!cachePromise) {
      cachePromise = apiCall();
    }
    return cachePromise;
  }
  return get;
}`,
    explanation: "In the broken implementation, multiple concurrent requests will see `cache` as null and trigger multiple overlapping `apiCall()` executions. Caching the Promise itself resolves it concurrently for all callers."
  },
  {
    language: "javascript",
    difficulty: "hard",
    title: "Array Filter Return Missing",
    category: "logic",
    brokenCode: `function filterActiveUsers(users) {
  // Bug: Arrow function with curly braces needs explicit return statement
  return users.filter(user => {
    user.isActive && user.age > 18;
  });
}`,
    fixedCode: `function filterActiveUsers(users) {
  return users.filter(user => {
    return user.isActive && user.age > 18;
  });
}`,
    explanation: "Arrow functions with block body `{ ... }` do not implicitly return values. Without `return`, the callback returns `undefined` (falsy), filter filters out all elements."
  },

  // ==================== PYTHON ====================
  // Python Easy
  {
    language: "python",
    difficulty: "easy",
    title: "Exclusive Range Calculation",
    category: "off-by-one",
    brokenCode: `def list_indices(limit):
    indices = []
    # Bug: range is exclusive of stop parameter, missing the limit value
    for i in range(0, limit):
        indices.append(i)
    return indices`,
    fixedCode: `def list_indices(limit):
    indices = []
    for i in range(0, limit + 1):
        indices.append(i)
    return indices`,
    explanation: "Python's `range(start, stop)` goes up to, but does not include `stop`. To include the value of `limit`, range needs `limit + 1`."
  },
  {
    language: "python",
    difficulty: "easy",
    title: "Mutable Default Parameters",
    category: "logic",
    brokenCode: `def append_to_list(element, target=[]):
    # Bug: Default argument list is initialized once at function definition time
    target.append(element)
    return target`,
    fixedCode: `def append_to_list(element, target=None):
    if target is None:
        target = []
    target.append(element)
    return target`,
    explanation: "Default parameters in Python are evaluated once at function definition. Repeated calls to `append_to_list('x')` will share the same list instance, leaking data across invocations. Use `None` as default."
  },
  {
    language: "python",
    difficulty: "easy",
    title: "Local Unbound Shadowing",
    category: "runtime",
    brokenCode: `counter = 0

def increment():
    # Bug: Modifies global variable without global declaration
    counter += 1
    return counter`,
    fixedCode: `counter = 0

def increment():
    global counter
    counter += 1
    return counter`,
    explanation: "Modifying a global variable inside a function without the `global` keyword causes Python to treat it as local, throwing an `UnboundLocalError` when accessed."
  },
  {
    language: "python",
    difficulty: "easy",
    title: "Key Error in Dictionary Fetch",
    category: "null-ref",
    brokenCode: `def get_user_status(users, username):
    # Bug: Direct access throws KeyError if username is missing
    return users[username]["status"]`,
    fixedCode: `def get_user_status(users, username):
    user = users.get(username)
    if not user:
        return "Offline"
    return user.get("status", "Offline")`,
    explanation: "Using direct bracket notation `[key]` raises a `KeyError` if the key doesn't exist. Using `.get(key)` returns `None` (or a fallback value) instead of crashing."
  },
  // Python Medium
  {
    language: "python",
    difficulty: "medium",
    title: "Modifying List During Iteration",
    category: "logic",
    brokenCode: `def remove_even_numbers(numbers):
    # Bug: Iterating over and removing from the same list shifts indices
    for num in numbers:
        if num % 2 == 0:
            numbers.remove(num)
    return numbers`,
    fixedCode: `def remove_even_numbers(numbers):
    return [num for num in numbers if num % 2 != 0]`,
    explanation: "Mutating a list while iterating over it skips subsequent items because Python internal pointers shift on removal. Creating a new list via comprehension avoids this bug."
  },
  {
    language: "python",
    difficulty: "medium",
    title: "Shallow Dict Copy Leak",
    category: "logic",
    brokenCode: `import copy

def clone_and_modify(data):
    # Bug: dict.copy() is a shallow copy, nested data structures are reference-linked
    new_data = data.copy()
    new_data["meta"]["updated"] = True
    return new_data`,
    fixedCode: `import copy

def clone_and_modify(data):
    new_data = copy.deepcopy(data)
    new_data["meta"]["updated"] = True
    return new_data`,
    explanation: "`.copy()` creates a shallow copy. Modifying nested keys like `new_data['meta']` changes the shared reference in both dictionary copies. Use `copy.deepcopy()` to clone recursively."
  },
  {
    language: "python",
    difficulty: "medium",
    title: "Zero Division Check Missing",
    category: "runtime",
    brokenCode: `def calculate_average(items):
    # Bug: Crashes with ZeroDivisionError if list is empty
    return sum(items) / len(items)`,
    fixedCode: `def calculate_average(items):
    if not items:
        return 0
    return sum(items) / len(items)`,
    explanation: "Dividing by `len(items)` when `items` is empty raises a `ZeroDivisionError`. Guarding for empty lists prevents the crash."
  },
  // Python Hard
  {
    language: "python",
    difficulty: "hard",
    title: "Decorator Metadata Loss",
    category: "logic",
    brokenCode: `def log_call(func):
    def wrapper(*args, **kwargs):
        print("Call logged")
        return func(*args, **kwargs)
    # Bug: loses original function metadata (__name__, __doc__, etc.)
    return wrapper`,
    fixedCode: `import functools

def log_call(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print("Call logged")
        return func(*args, **kwargs)
    return wrapper`,
    explanation: "Decorators replace original functions with a wrapper, erasing details like `__name__` and `__doc__`. Decorating with `@functools.wraps(func)` preserves original function reflection."
  },
  {
    language: "python",
    difficulty: "hard",
    title: "Mutable Class Attribute Leak",
    category: "logic",
    brokenCode: `class UserGroup:
    # Bug: Class attribute is shared across all instances
    members = []
    
    def add_member(self, member):
        self.members.append(member)`,
    fixedCode: `class UserGroup:
    def __init__(self):
        self.members = []
    
    def add_member(self, member):
        self.members.append(member)`,
    explanation: "Defining `members = []` outside `__init__` defines it as a class attribute. All instances of `UserGroup` will modify the same shared array. Move initialization into `__init__` for instance variables."
  },
  {
    language: "python",
    difficulty: "hard",
    title: "List Comprehension Scope Mutation",
    category: "logic",
    brokenCode: `def create_lambdas():
    # Bug: Loop variable 'x' is closed over by reference, keeping final state
    return [lambda: x for x in range(3)]`,
    fixedCode: `def create_lambdas():
    return [lambda x=x: x for x in range(3)]`,
    explanation: "Lambda captures are bound by reference. At execution time, they look up `x` in outer scope (which is 2 after loop finishes). Binding `x=x` sets a default parameter binding scope."
  },

  // ==================== JAVA ====================
  // Java Easy
  {
    language: "java",
    difficulty: "easy",
    title: "String Literal Pointer Equality",
    category: "logic",
    brokenCode: `public boolean checkRole(String role) {
  // Bug: Uses == for String comparison instead of .equals()
  return role == "admin";
}`,
    fixedCode: `public boolean checkRole(String role) {
  return "admin".equals(role);
}`,
    explanation: "In Java, `==` compares object references (memory location) instead of values. String value comparison requires `.equals()`. Ordering it \"admin\".equals(role) prevents NullPointerExceptions."
  },
  {
    language: "java",
    difficulty: "easy",
    title: "Integer Division Floor",
    category: "runtime",
    brokenCode: `public double getRatio(int completed, int total) {
  // Bug: Integer division performs truncation before conversion to double
  return completed / total;
}`,
    fixedCode: `public double getRatio(int completed, int total) {
  return (double) completed / total;
}`,
    explanation: "Dividing two integers in Java drops fractions (e.g. `1/2` becomes `0`) before casting to double. Casting one operand to `double` forces floating-point math."
  },
  {
    language: "java",
    difficulty: "easy",
    title: "Null Pointer on Equals",
    category: "null-ref",
    brokenCode: `public boolean isDefault(String val) {
  // Bug: If val is null, calling .equals throws NullPointerException
  return val.equals("default");
}`,
    fixedCode: `public boolean isDefault(String val) {
  return "default".equals(val);
}`,
    explanation: "Calling `.equals()` on a null reference throws a `NullPointerException`. Positioning the constant string literal first acts as a safe null check."
  },
  {
    language: "java",
    difficulty: "easy",
    title: "Array Index Limit",
    category: "off-by-one",
    brokenCode: `public int getLastElement(int[] numbers) {
  // Bug: Accesses index equal to length, causing ArrayIndexOutOfBoundsException
  return numbers[numbers.length];
}`,
    fixedCode: `public int getLastElement(int[] numbers) {
  return numbers[numbers.length - 1];
}`,
    explanation: "Java arrays are 0-indexed. The last element index is `length - 1`. Accessing `length` directly throws an out-of-bounds error."
  },
  // Java Medium
  {
    language: "java",
    difficulty: "medium",
    title: "Concurrent Loop Modification",
    category: "runtime",
    brokenCode: `import java.util.List;

public void filterList(List<String> list) {
  // Bug: Modifying a list during iteration throws ConcurrentModificationException
  for (String item : list) {
    if (item.startsWith("test")) {
      list.remove(item);
    }
  }
}`,
    fixedCode: `import java.util.List;
import java.util.Iterator;

public void filterList(List<String> list) {
  Iterator<String> it = list.iterator();
  while (it.hasNext()) {
    if (it.next().startsWith("test")) {
      it.remove();
    }
  }
}`,
    explanation: "Modifying a collection directly while using an implicit iterator (for-each) invalidates the iterator structure. Using an explicit `Iterator` and calling `it.remove()` is safe."
  },
  {
    language: "java",
    difficulty: "medium",
    title: "Equals HashCode Mismatch",
    category: "logic",
    brokenCode: `public class Point {
  int x, y;
  
  // Bug: Overrides equals but not hashCode, breaking HashMap lookups
  @Override
  public boolean equals(Object obj) {
    if (this == obj) return true;
    if (!(obj instanceof Point)) return false;
    Point other = (Point) obj;
    return this.x == other.x && this.y == other.y;
  }
}`,
    fixedCode: `import java.util.Objects;

public class Point {
  int x, y;
  
  @Override
  public boolean equals(Object obj) {
    if (this == obj) return true;
    if (!(obj instanceof Point)) return false;
    Point other = (Point) obj;
    return this.x == other.x && this.y == other.y;
  }

  @Override
  public int hashCode() {
    return Objects.hash(x, y);
  }
}`,
    explanation: "Java collections rely on equal objects yielding identical hashcodes. If you override `equals()` without `hashCode()`, equal objects will land in different Hash buckets, making map key hits fail."
  },
  {
    language: "java",
    difficulty: "medium",
    title: "Static Instance Count Leak",
    category: "logic",
    brokenCode: `public class Connection {
  // Bug: static counter is not thread-safe and can become out of sync
  public static int count = 0;
  
  public Connection() {
    count++;
  }
}`,
    fixedCode: `import java.util.concurrent.atomic.AtomicInteger;

public class Connection {
  public static final AtomicInteger count = new AtomicInteger(0);
  
  public Connection() {
    count.incrementAndGet();
  }
}`,
    explanation: "The increment operation `count++` is not atomic. In concurrent applications, threads will overwrite each other's updates, corrupting values. `AtomicInteger` guarantees thread-safe execution."
  },
  // Java Hard
  {
    language: "java",
    difficulty: "hard",
    title: "Integer Math Binary Search Overflow",
    category: "off-by-one",
    brokenCode: `public int getMid(int low, int high) {
  // Bug: Summing low and high can overflow the max capacity of integer (2^31 - 1)
  return (low + high) / 2;
}`,
    fixedCode: `public int getMid(int low, int high) {
  return low + (high - low) / 2;
}`,
    explanation: "If `low + high` exceeds `Integer.MAX_VALUE`, it wraps around to a negative number, returning an invalid negative index. Calculating it as `low + (high - low) / 2` avoids the overflow."
  },
  {
    language: "java",
    difficulty: "hard",
    title: "Double-Checked Locking Volatile Missing",
    category: "async",
    brokenCode: `public class Singleton {
  private static Singleton instance;
  
  public static Singleton getInstance() {
    if (instance == null) {
      synchronized (Singleton.class) {
        if (instance == null) {
          // Bug: Without volatile, CPU compiler optimization can reorder operations
          instance = new Singleton();
        }
      }
    }
    return instance;
  }
}`,
    fixedCode: `public class Singleton {
  private static volatile Singleton instance;
  
  public static Singleton getInstance() {
    if (instance == null) {
      synchronized (Singleton.class) {
        if (instance == null) {
          instance = new Singleton();
        }
      }
    }
    return instance;
  }
}`,
    explanation: "Without the `volatile` modifier, the Java memory model allows the compiler to expose an uninitialized object instance (due to out-of-order writes during constructor execution) to other threads."
  },
  {
    language: "java",
    difficulty: "hard",
    title: "Executor Thread Leak",
    category: "runtime",
    brokenCode: `import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

public void processTasks() {
  // Bug: Creating ExecutorService locally without shutdown leaks memory/threads
  ExecutorService exec = Executors.newFixedThreadPool(4);
  exec.submit(() -> System.out.println("Executing..."));
}`,
    fixedCode: `import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

public void processTasks() {
  ExecutorService exec = Executors.newFixedThreadPool(4);
  try {
    exec.submit(() -> System.out.println("Executing..."));
  } finally {
    exec.shutdown();
  }
}`,
    explanation: "Threads inside thread pools don't terminate when out of scope. Failing to call `.shutdown()` keeps the threads alive indefinitely, leaking memory and resources."
  }
];

async function main() {
  console.log("Seeding challenges...");
  for (const bug of bugs) {
    await prisma.bug.create({
      data: bug
    });
  }
  console.log("Seed complete! 30 bugs created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
