// Mock database of 50 developer-focused questions for Code KBC
const questions = [
  // ==================== EASY QUESTIONS (1-20) ====================
  {
    id: "easy-1",
    question: "What is the output of 'typeof null' in JavaScript?",
    options: ["\"null\"", "\"undefined\"", "\"object\"", "\"function\""],
    correctAnswer: 2,
    difficulty: "easy",
    category: "JavaScript",
    explanation: "In JavaScript, typeof null is historical code from the first implementation where values were represented as a type tag and a value. Since null was representing a null pointer (0x00), it had the object type tag.",
    points: 100
  },
  {
    id: "easy-2",
    question: "Which React Hook is primarily used to perform side effects in a functional component?",
    options: ["useState", "useMemo", "useContext", "useEffect"],
    correctAnswer: 3,
    difficulty: "easy",
    category: "React",
    explanation: "useEffect is standard for fetching data, setting up subscriptions, and manually changing the DOM in React components.",
    points: 200
  },
  {
    id: "easy-3",
    question: "Which Git command is used to add file changes to the staging area?",
    options: ["git commit", "git push", "git add", "git stage-file"],
    correctAnswer: 2,
    difficulty: "easy",
    category: "Git",
    explanation: "git add is used to stage modified or new files before committing them.",
    points: 300
  },
  {
    id: "easy-4",
    question: "What does the abbreviation CSS stand for?",
    options: ["Computer Style Sheets", "Creative Style Sheets", "Cascading Style Sheets", "Collate Styling System"],
    correctAnswer: 2,
    difficulty: "easy",
    category: "Web Development",
    explanation: "CSS stands for Cascading Style Sheets, describing how HTML elements are to be displayed on screen, paper, or in other media.",
    points: 500
  },
  {
    id: "easy-5",
    question: "What is the average time complexity of searching for a value in a Hash Map?",
    options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
    correctAnswer: 0,
    difficulty: "easy",
    category: "DSA",
    explanation: "Hash maps map keys to array indices via hashing. Under normal circumstances, key lookup is a constant time operation, O(1).",
    points: 1000
  },
  {
    id: "easy-6",
    question: "Which HTTP status code represents an 'Internal Server Error'?",
    options: ["400 Bad Request", "401 Unauthorized", "404 Not Found", "500 Internal Server Error"],
    correctAnswer: 3,
    difficulty: "easy",
    category: "Web Development",
    explanation: "The 500 status code indicates that the server encountered an unexpected condition that prevented it from fulfilling the request.",
    points: 2000
  },
  {
    id: "easy-7",
    question: "Which JavaScript keyword declares a block-scoped variable that can be reassigned?",
    options: ["var", "let", "const", "define"],
    correctAnswer: 1,
    difficulty: "easy",
    category: "JavaScript",
    explanation: "let allows you to declare variables that are limited to the scope of a block, statement, or expression, unlike var which has function scope.",
    points: 4000
  },
  {
    id: "easy-8",
    question: "What is the default package manager bundled with a standard Node.js installation?",
    options: ["yarn", "pnpm", "npm", "bun"],
    correctAnswer: 2,
    difficulty: "easy",
    category: "Node.js",
    explanation: "npm (Node Package Manager) is automatically installed alongside Node.js and serves as the default package manager.",
    points: 8000
  },
  {
    id: "easy-9",
    question: "In GitHub, what is the primary purpose of 'forking' a repository?",
    options: [
      "To download the codebase directly to your local computer.",
      "To create a copy of the repository under your own account so you can propose changes.",
      "To merge two branches together securely.",
      "To delete unwanted commits from the history."
    ],
    correctAnswer: 1,
    difficulty: "easy",
    category: "GitHub",
    explanation: "Forking creates an isolated server-side copy of someone else's project under your account, enabling you to experiment and submit Pull Requests without affecting the original repository.",
    points: 16000
  },
  {
    id: "easy-10",
    question: "Which SQL clause is used to filter query results based on a condition?",
    options: ["GROUP BY", "ORDER BY", "HAVING", "WHERE"],
    correctAnswer: 3,
    difficulty: "easy",
    category: "Web Development",
    explanation: "The WHERE clause is used to filter records in SQL queries, matching only rows that satisfy the specified search expression.",
    points: 32000
  },
  {
    id: "easy-11",
    question: "Which layout direction is primary for elements inside a CSS Flexbox container with 'flex-direction: column'?",
    options: ["Horizontal (left-to-right)", "Vertical (top-to-bottom)", "Z-index stack (front-to-back)", "Radial grid layout"],
    correctAnswer: 1,
    difficulty: "easy",
    category: "Web Development",
    explanation: "Setting flex-direction to column rotates the main axis to vertical, stacking child items from top to bottom.",
    points: 64000
  },
  {
    id: "easy-12",
    question: "What does HTML DOM stand for in Web Development?",
    options: ["Document Object Model", "Data Object Monitor", "Direct Object Mapping", "Distributed Order Method"],
    correctAnswer: 0,
    difficulty: "easy",
    category: "Web Development",
    explanation: "The Document Object Model (DOM) is a programming interface for web documents. It represents the page structure so that programs can change the document style and content.",
    points: 125000
  },
  {
    id: "easy-13",
    question: "In DSA, which data structure operates on a Last-In, First-Out (LIFO) model?",
    options: ["Queue", "Stack", "Binary Search Tree", "Linked List"],
    correctAnswer: 1,
    difficulty: "easy",
    category: "DSA",
    explanation: "A stack is a LIFO structure where the last item pushed onto the stack is the first one popped off.",
    points: 250000
  },
  {
    id: "easy-14",
    question: "Which Git command displays the status of modified, staged, and untracked files in the working directory?",
    options: ["git status", "git diff", "git log", "git show"],
    correctAnswer: 0,
    difficulty: "easy",
    category: "Git",
    explanation: "git status displays paths that have differences between the index file and the current HEAD commit, along with untracked files.",
    points: 500000
  },
  {
    id: "easy-15",
    question: "What is the key difference between '==' and '===' comparison operators in JavaScript?",
    options: [
      "'==' checks both value and type, while '===' only checks value.",
      "'==' performs type coercion before comparing, while '===' checks both value and type strictly.",
      "'===' is asynchronous, while '==' is synchronous.",
      "There is no difference in modern JavaScript engine execution."
    ],
    correctAnswer: 1,
    difficulty: "easy",
    category: "JavaScript",
    explanation: "The loose equality operator '==' converts operands to common types before comparing. The strict equality operator '===' does not perform coercion and returns false if types differ.",
    points: 1000000
  },
  {
    id: "easy-16",
    question: "Which React API enables sharing values like theme or authentication state down a component tree without passing props manually?",
    options: ["React Router", "Context API", "useReducer", "React Fiber"],
    correctAnswer: 1,
    difficulty: "easy",
    category: "React",
    explanation: "React Context provides a way to pass data through the component tree without having to pass props down manually at every level.",
    points: 100
  },
  {
    id: "easy-17",
    question: "What default TCP port number is utilized by secure HTTPS web servers?",
    options: ["80", "8080", "22", "443"],
    correctAnswer: 3,
    difficulty: "easy",
    category: "General Tech",
    explanation: "Port 443 is the standard port for secure web traffic (HTTPS). Unencrypted HTTP traffic default port is 88 or 80.",
    points: 200
  },
  {
    id: "easy-18",
    question: "What does the abbreviation JSON stand for?",
    options: ["JavaScript Object Notation", "Java System Operator Network", "Junction Socket Open Node", "JavaScript Oriented Markup"],
    correctAnswer: 0,
    difficulty: "easy",
    category: "General Tech",
    explanation: "JSON stands for JavaScript Object Notation. It is a lightweight data-interchange format derived from JavaScript object literals.",
    points: 300
  },
  {
    id: "easy-19",
    question: "Which Git command is used to display the chronological commit history log?",
    options: ["git history", "git status", "git log", "git reflog"],
    correctAnswer: 2,
    difficulty: "easy",
    category: "Git",
    explanation: "git log shows the commit history for the current active branch in reverse chronological order.",
    points: 500
  },
  {
    id: "easy-20",
    question: "In HTML, which element tag is used to embed or reference an external JavaScript file?",
    options: ["<link>", "<script>", "<js>", "<style>"],
    correctAnswer: 1,
    difficulty: "easy",
    category: "Web Development",
    explanation: "The <script> tag is used to embed client-side scripts, or point to an external file using the src attribute.",
    points: 1000
  },

  // ==================== MEDIUM QUESTIONS (21-40) ====================
  {
    id: "medium-1",
    question: "What is a closure in JavaScript?",
    options: [
      "A technique that resolves asynchronous promises instantly.",
      "A function combined with references to its surrounding state (lexical environment).",
      "A configuration that locks object keys from being modified.",
      "A method to automatically free memory using the garbage collector."
    ],
    correctAnswer: 1,
    difficulty: "medium",
    category: "JavaScript",
    explanation: "A closure is the combination of a function bundled together with references to its surrounding state (the lexical environment). In other words, a closure gives an inner function access to the outer scope even after the outer function has finished executing.",
    points: 2000
  },
  {
    id: "medium-2",
    question: "What is the primary optimization benefit of wrapping a React component in 'React.memo'?",
    options: [
      "It automatically fetches data asynchronously for the component.",
      "It binds event handlers to the global window scope.",
      "It prevents unnecessary re-renders if the component's incoming props haven't changed.",
      "It decreases the overall memory footprints of functional states."
    ],
    correctAnswer: 2,
    difficulty: "medium",
    category: "React",
    explanation: "React.memo is a higher-order component that shallowly compares props and skips rendering if props are identical to the previous render.",
    points: 4000
  },
  {
    id: "medium-3",
    question: "How does the Node.js Event Loop process asynchronous operations?",
    options: [
      "It spawns a new OS-level thread for every single asynchronous function call.",
      "It delegates asynchronous actions to the kernel or Libuv thread pool, and queues callbacks to run in specific phases.",
      "It converts JavaScript code to synchronized assembly loops.",
      "It pauses execution entirely until the network or filesystem responds."
    ],
    correctAnswer: 1,
    difficulty: "medium",
    category: "Node.js",
    explanation: "Node.js uses a single-threaded event loop with Libuv, delegating operations to kernel helpers or thread pools and executing callbacks in phases (timers, poll, check, etc.).",
    points: 8000
  },
  {
    id: "medium-4",
    question: "What is the primary difference between 'git fetch' and 'git pull' commands?",
    options: [
      "'git fetch' downloads remote changes but does not merge them; 'git pull' downloads and immediately merges them.",
      "'git pull' is safe, while 'git fetch' can overwrite local uncommitted changes.",
      "'git fetch' works on local commits, whereas 'git pull' pushes commits to remote servers.",
      "They are identical commands, with 'git fetch' being a deprecated alias."
    ],
    correctAnswer: 0,
    difficulty: "medium",
    category: "Git",
    explanation: "git fetch downloads objects and refs from another repository. git pull does a git fetch followed by git merge to combine remote commits into the current local branch.",
    points: 16000
  },
  {
    id: "medium-5",
    question: "What is the worst-case time complexity of merging two sorted arrays of size N and M?",
    options: ["O(N log M)", "O(N * M)", "O(N + M)", "O(log(N + M))"],
    correctAnswer: 2,
    difficulty: "medium",
    category: "DSA",
    explanation: "Merging two sorted arrays involves scanning through both arrays once using a two-pointer approach, taking linear time proportional to the sum of their sizes.",
    points: 32000
  },
  {
    id: "medium-6",
    question: "In System Design, what does 'horizontal scaling' refer to?",
    options: [
      "Upgrading an existing server with more CPU and RAM resources.",
      "Adding more server instances to the system resource pool to share load.",
      "Structuring databases using a linear column-family representation.",
      "Optimizing CSS grid layouts for wide horizontal display monitors."
    ],
    correctAnswer: 1,
    difficulty: "medium",
    category: "System Design",
    explanation: "Horizontal scaling (scaling out) involves adding more nodes (servers) to a cluster, rather than scaling vertically (scaling up) which increases hardware specs of a single server.",
    points: 64000
  },
  {
    id: "medium-7",
    question: "Which database index structure is commonly structured as a balanced tree to optimize search ranges?",
    options: ["Hash Index", "B-Tree Index", "Inverted Index", "Bitmap Index"],
    correctAnswer: 1,
    difficulty: "medium",
    category: "System Design",
    explanation: "B-Tree (and B+ Tree) indices maintain sorted data allowing logarithmic search, insertion, deletion, and efficient range queries.",
    points: 125000
  },
  {
    id: "medium-8",
    question: "Which of the following is a fundamental rule when using React Hooks?",
    options: [
      "Hooks must be called inside standard Javascript helper functions.",
      "Hooks must only be called at the top level of a component (not inside loops or conditions).",
      "Hooks should only be invoked within class components.",
      "Hooks must be declared in asynchronous rendering functions."
    ],
    correctAnswer: 1,
    difficulty: "medium",
    category: "React",
    explanation: "React relies on the order in which Hooks are called. Calling them conditionally or within loops breaks Hook execution index consistency.",
    points: 250000
  },
  {
    id: "medium-9",
    question: "What browser mechanism regulates resource requests from origins different from the serving site?",
    options: ["DOM security shadow", "Cross-Origin Resource Sharing (CORS)", "Content Security Policy (CSP)", "Strict HTTP redirection"],
    correctAnswer: 1,
    difficulty: "medium",
    category: "Web Development",
    explanation: "CORS is a browser security mechanism that uses HTTP headers to allow or deny cross-origin resource access.",
    points: 500000
  },
  {
    id: "medium-10",
    question: "What does the Git command 'git cherry-pick' accomplish?",
    options: [
      "It deletes unwanted code commits from the remote origin branch.",
      "It merges a whole branch into HEAD while automatically resolving merge conflicts.",
      "It applies the changes introduced by a specific existing commit onto the current branch.",
      "It formats the code according to style rules before submitting commits."
    ],
    correctAnswer: 2,
    difficulty: "medium",
    category: "Git",
    explanation: "git cherry-pick allows you to select a specific commit from one branch and copy its changes to your current working branch.",
    points: 1000000
  },
  {
    id: "medium-11",
    question: "What is the primary function of a Content Delivery Network (CDN) in System Design?",
    options: [
      "To compile production assets from TypeScript to Javascript dynamically.",
      "To cache static data geographically closer to users to reduce request latency.",
      "To partition relational database servers across physical servers.",
      "To validate JWT signatures on api requests."
    ],
    correctAnswer: 1,
    difficulty: "medium",
    category: "System Design",
    explanation: "CDNs store copies of static assets (images, stylesheets, files) in distributed edge servers globally, minimizing response latency for localized users.",
    points: 2000
  },
  {
    id: "medium-12",
    question: "What is the output of evaluate '[] + []' in standard JavaScript?",
    options: ["undefined", "[]", "NaN", "\"\" (empty string)"],
    correctAnswer: 3,
    difficulty: "medium",
    category: "JavaScript",
    explanation: "In JavaScript, the '+' operator triggers string conversion when applied to arrays. Arrays convert to empty strings, leading to \"\" + \"\" which evaluates to an empty string.",
    points: 4000
  },
  {
    id: "medium-13",
    question: "Which algorithm selects a pivot element and partitions array items during execution?",
    options: ["Mergesort", "Quicksort", "Bubble Sort", "Heapsort"],
    correctAnswer: 1,
    difficulty: "medium",
    category: "DSA",
    explanation: "Quicksort is a divide-and-conquer algorithm that partitions arrays around a chosen pivot, recursively sorting left and right sub-arrays.",
    points: 8000
  },
  {
    id: "medium-14",
    question: "What is the primary architectural purpose of a JSON Web Token (JWT)?",
    options: [
      "To encrypt data stored in client localStorage.",
      "To enable stateless, securely signed token authentication.",
      "To optimize database transaction speeds.",
      "To format request data payloads."
    ],
    correctAnswer: 1,
    difficulty: "medium",
    category: "General Tech",
    explanation: "JWTs enable stateless authentication because user state is packed and cryptographically signed inside the token, eliminating the need to query sessions from databases on every request.",
    points: 16000
  },
  {
    id: "medium-15",
    question: "What optimization benefit is provided by utilizing Streams in Node.js?",
    options: [
      "They run code on multiple parallel CPU cores automatically.",
      "They compress file systems data using gzip algorithms.",
      "They read/write data in sequential chunks, avoiding loading entire massive files into RAM.",
      "They clean up inactive closures in Node process loops."
    ],
    correctAnswer: 2,
    difficulty: "medium",
    category: "Node.js",
    explanation: "Streams process data incrementally, conserving memory buffer capacities when dealing with large datasets or network connections.",
    points: 32000
  },
  {
    id: "medium-16",
    question: "Which type of DNS record resolves a domain name directly to its target IPv4 address?",
    options: ["CNAME record", "MX record", "A record", "TXT record"],
    correctAnswer: 2,
    difficulty: "medium",
    category: "General Tech",
    explanation: "An 'A' (Address) record maps a hostname/domain directly to a 32-bit IPv4 address.",
    points: 64000
  },
  {
    id: "medium-17",
    question: "What is the time complexity of finding the shortest path in an unweighted graph using BFS?",
    options: ["O(V * E)", "O(V + E)", "O(V log V)", "O(E log V)"],
    correctAnswer: 1,
    difficulty: "medium",
    category: "DSA",
    explanation: "Breadth-First Search visits all V vertices and E edges once in the worst case, yielding a time complexity of O(V + E).",
    points: 125000
  },
  {
    id: "medium-18",
    question: "What was a main scheduling problem solved by React 18's Fiber architecture?",
    options: [
      "Direct compilation of JSX tags in browsers.",
      "Automated state updates clustering.",
      "Incremental rendering: pausing rendering updates to keep browser main thread fluid.",
      "Removing props-drilling patterns completely."
    ],
    correctAnswer: 2,
    difficulty: "medium",
    category: "React",
    explanation: "React Fiber splits rendering work into smaller tasks and schedules execution, yielding thread priority to high-importance updates (like user typing inputs).",
    points: 250000
  },
  {
    id: "medium-19",
    question: "In Relational Database design, what is a secondary index?",
    options: [
      "A copy of the database data used for disaster recovery situations.",
      "An index structured on non-primary-key fields to optimize non-PK queries.",
      "An index that tracks database users and access levels.",
      "A temporary backup copy of primary table primary keys."
    ],
    correctAnswer: 1,
    difficulty: "medium",
    category: "System Design",
    explanation: "A secondary index contains a copy of some columns and points to primary storage rows, speeding up queries that don't match the primary key filter.",
    points: 500000
  },
  {
    id: "medium-20",
    question: "What is a Pull Request in the context of GitHub workflows?",
    options: [
      "A request to fetch all commits from remote servers to a local branch.",
      "A proposal containing branch code differences, enabling code reviews and discussion before merging.",
      "A database command optimizing Git compression logs.",
      "An automatic build compiler report."
    ],
    correctAnswer: 1,
    difficulty: "medium",
    category: "GitHub",
    explanation: "GitHub Pull Requests facilitate visual code review, conversation, automated tests execution, and branch merging controls.",
    points: 1000000
  },

  // ==================== HARD QUESTIONS (41-50) ====================
  {
    id: "hard-1",
    question: "How does the Temporal Dead Zone (TDZ) function in JavaScript engines?",
    options: [
      "It is a runtime zone where garbage collection cannot free memory.",
      "The phase from entering block scope to when variables declared with let/const are initialized.",
      "An execution state where asynchronous tasks are paused indefinitely.",
      "The duration where DOM node reference accesses trigger silent errors."
    ],
    correctAnswer: 1,
    difficulty: "hard",
    category: "JavaScript",
    explanation: "The Temporal Dead Zone (TDZ) is the period between entering block scope and the variable declaration. Attempting to access a let or const variable before its line of declaration throws a ReferenceError.",
    points: 2000
  },
  {
    id: "hard-2",
    question: "In CAP Theorem, which trade-off must database systems make during a network partition (P)?",
    options: [
      "Choose between horizontal scaling speed and read latency.",
      "Choose between Consistency (C) and Availability (A).",
      "Choose between relational normalization and sharding levels.",
      "Choose between write locks and read speeds."
    ],
    correctAnswer: 1,
    difficulty: "hard",
    category: "System Design",
    explanation: "CAP theorem states that in the event of a network partition (P), database systems must choose between Consistency (returning error or latest write) or Availability (returning stale data but never error).",
    points: 4000
  },
  {
    id: "hard-3",
    question: "How does React concurrent rendering schedule and yield work to browser loops under the hood?",
    options: [
      "By executing script loops inside active web-worker threads.",
      "By using requestIdleCallback loops exclusively.",
      "By dividing execution into fiber increments and checking time thresholds before yielding via MessageChannel macros.",
      "By compiling updates to synchronous native binary hooks."
    ],
    correctAnswer: 2,
    difficulty: "hard",
    category: "React",
    explanation: "React concurrent scheduler splits fiber rendering work and checks remaining frame budgets. It yields control back to browser event loops using MessageChannel postMessage triggers, which run as macro-tasks.",
    points: 8000
  },
  {
    id: "hard-4",
    question: "What is the worst-case time complexity of searching, inserting, or deleting items in a Red-Black Tree?",
    options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
    correctAnswer: 1,
    difficulty: "hard",
    category: "DSA",
    explanation: "Red-Black Trees maintain a balanced binary tree height through node rotations and color coding, ensuring O(log N) heights even in worst cases.",
    points: 16000
  },
  {
    id: "hard-5",
    question: "What distinguishes 'process.nextTick()' callbacks from 'setImmediate()' in the Node.js event loop?",
    options: [
      "'setImmediate' runs in Web Workers, while 'process.nextTick' runs on the main thread.",
      "'process.nextTick' callbacks execute immediately after the current operation finishes (before next event loop tick); 'setImmediate' runs in check phases of event loop ticks.",
      "There is no difference; they are duplicate APIs.",
      "'setImmediate' runs before nextTick in every event loop phase."
    ],
    correctAnswer: 1,
    difficulty: "hard",
    category: "Node.js",
    explanation: "process.nextTick is processed after current execution ends, before the event loop transitions to next ticks or phases. setImmediate fires in the event loop check phase, following standard poll loops.",
    points: 32000
  },
  {
    id: "hard-6",
    question: "What is the primary function of the Git 'reflog' database?",
    options: [
      "To compress git commit metadata databases recursively.",
      "A local record tracking changes to the tip of branches, recording head pointer states (even after commit resets or branch deletions).",
      "To upload project branch histories to remote hosting servers.",
      "To check files syntax before committing revisions."
    ],
    correctAnswer: 1,
    difficulty: "hard",
    category: "Git",
    explanation: "Git reflog keeps a local log of head movements. It acts as a safety net to recover lost commits or reset branches that were deleted or modified.",
    points: 64000
  },
  {
    id: "hard-7",
    question: "What probabilistic properties define System Design Bloom Filters?",
    options: [
      "They guarantee matching lookups, returning exact values.",
      "They indicate set membership: return either 'definitely not in set' or 'probably in set' (possibility of false positives, but zero false negatives).",
      "They partition index values into binary nodes recursively.",
      "They compress text databases strictly without packet loss."
    ],
    correctAnswer: 1,
    difficulty: "hard",
    category: "System Design",
    explanation: "A Bloom filter tests set membership. It is highly space-efficient but probabilistic: it tells you if an item is definitely not in the set, or if it might be, allowing false positives but never false negatives.",
    points: 125000
  },
  {
    id: "hard-8",
    question: "What database scaling methodology distributes tables horizontally by partitioning rows across distinct physical server nodes?",
    options: ["Database Replication", "Database Sharding", "Vertical Scaling", "Index Denormalization"],
    correctAnswer: 1,
    difficulty: "hard",
    category: "System Design",
    explanation: "Database sharding splits table row data across multiple database instances based on a shard key, enabling horizontal read/write scaling.",
    points: 250000
  },
  {
    id: "hard-9",
    question: "How does 'Object.freeze()' differ from 'Object.seal()' operations in JavaScript?",
    options: [
      "'Object.freeze()' is synchronous, while 'Object.seal()' is asynchronous.",
      "'Object.freeze()' makes properties read-only and prevents additions/deletions; 'Object.seal()' allows changing existing values but prevents property additions/deletions.",
      "Object.seal() deletes existing nested objects in prototype lines.",
      "Object.freeze() allows additions but seals the values."
    ],
    correctAnswer: 1,
    difficulty: "hard",
    category: "JavaScript",
    explanation: "Object.freeze() prevents extensions, deletions, configuration updates, and edits (writable: false). Object.seal() prevents extensions/deletions but allows changing existing values.",
    points: 500000
  },
  {
    id: "hard-10",
    question: "In database systems, what durability pattern is served by a Write-Ahead Log (WAL)?",
    options: [
      "It speeds up browser loading caches.",
      "It writes transactions sequentially to disk logs before applying database block changes (ensuring recovery post-crashes).",
      "It stores HTML forms data on client platforms.",
      "It partitions index arrays linearly."
    ],
    correctAnswer: 1,
    difficulty: "hard",
    category: "System Design",
    explanation: "WAL ensures database ACID durability. Modifications are written to sequential transaction logs on persistent storage first, allowing transactions to be replayed or rolled back if server failure occurs before disk write completion.",
    points: 1000000
  }
];

module.exports = questions;
