# Longest Palindromic Substring (LPS) Algorithm Analyzer

This project provides a comparative analysis of three different algorithms for finding the Longest Palindromic Substring (LPS) in a given string.

## Algorithms Implemented

1. **Naive Approach** (O(n³))
   - Checks all possible substrings and verifies if each is a palindrome
   - Time Complexity: O(n³)
   - Space Complexity: O(1)

2. **Dynamic Programming** (O(n²))
   - Uses a boolean table to store palindrome state
   - Time Complexity: O(n²)
   - Space Complexity: O(n²)

3. **Manacher's Algorithm** (O(n))
   - Utilizes symmetry properties to reduce comparisons
   - Time Complexity: O(n)
   - Space Complexity: O(n)

## Performance Metrics

The application measures and displays:
- **Execution Time**: Using `process.hrtime.bigint()` for high-precision timing
- **Memory Usage**: Using `process.memoryUsage()` to track heap memory consumption

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher recommended)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/kobeSmallman/lps-node.js-project.git
   cd lps-node.js-project
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Running the Application

1. Start the server:
   ```
   node server.js
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Enter a string in the provided text area.
2. Click the "Run Algorithms" button to analyze the string.
3. View the results, which include:
   - The longest palindromic substring found by each algorithm
   - Execution time for each algorithm
   - Memory usage for each algorithm

## Note on CORS

If you're opening the index.html file directly via the file:// protocol, you may encounter CORS issues when trying to make requests to the server. To avoid this:

1. Always access the application through the server at http://localhost:3000
2. If you need to run the frontend separately, consider using a static file server or configuring CORS appropriately in server.js

## Project Structure

```
lps-node.js-project/
├── node_modules/       # Dependencies
├── public/             # Static files
│   └── index.html      # Frontend UI
├── server.js           # Node.js server with algorithm implementations
├── package.json        # Project metadata and dependencies
├── package-lock.json   # Dependency lock file
└── README.md           # Project documentation
```

## Future Improvements

- Implement full algorithm implementations (currently using stubs)
- Add unit tests for each algorithm
- Add visualization of palindrome finding process
- Support for larger inputs with worker threads

## License

ISC

---

Created by Kobe Smallman