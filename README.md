# Longest Palindromic Substring (LPS) Algorithm Analyzer

This application implements and analyzes three different algorithms for finding the longest palindromic substring:

1. **Naive Approach**: Checks all possible substrings with O(n³) time complexity and O(1) space complexity.
2. **Dynamic Programming**: Uses a DP table to track palindromes with O(n²) time complexity and O(n²) space complexity.
3. **Optimized Manacher's Algorithm**: A memory-efficient version of Manacher's with O(n) effective time complexity and O(n) space complexity.

The application allows users to input strings and compare algorithm performance metrics including execution time and memory usage.

## Optimized Manacher's Algorithm

Our implementation of Manacher's algorithm has been optimized for memory efficiency, particularly for large inputs. Rather than using the traditional approach of transforming the input string (which doubles its size), we:

- Process odd and even length palindromes separately
- Work directly with the original processed string
- Avoid unnecessary array allocations

This approach is significantly more memory-efficient while maintaining excellent performance, which is crucial for processing very large inputs.

## Performance Metrics

The application measures and displays:
- Execution time in milliseconds
- Memory usage in KB/MB
- Length of the longest palindrome found
- Number of iterations/executions

## Setup

### Prerequisites
- Node.js v14 or higher

### Installation
1. Clone this repository
2. Navigate to the project directory
3. No npm installation needed - dependencies are bundled

### Running the Application
1. Start the server with `node --expose-gc server.js`
2. Open a web browser and navigate to `http://localhost:3000`

## Usage

1. Enter a string in the input field
2. Click "Find Longest Palindromic Substring"
3. View algorithm performance metrics and the palindrome found
4. Toggle between different algorithm implementations

**Note:** When accessing the application directly via file protocol, you may encounter CORS issues with certain browsers. It's recommended to use the Node.js server to serve the application.

## Project Structure

- `server.js`: Main server file with algorithm implementations
- `public/`: Frontend files
  - `index.html`: Main application UI
  - `about.html`: Documentation and algorithm explanations
  - `style.css`: Styling for the application
  - `script.js`: Client-side JavaScript

## Future Improvements

- Add visualization for the palindrome finding process
- Implement more algorithm variants
- Add comprehensive unit tests
- Optimize for even larger inputs

## License

ISC License

## Creator

Kobe Smallman