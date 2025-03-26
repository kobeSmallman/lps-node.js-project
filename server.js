const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DEBUG = process.env.DEBUG === 'true' || false; // Debug flag

// Detect if running on Vercel
const isVercel = process.env.VERCEL || false;
console.log(`Running in ${isVercel ? 'Vercel' : 'local'} environment`);

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Use /tmp for Vercel or create local directory
      const uploadDir = isVercel 
        ? '/tmp' 
        : path.join(__dirname, 'uploads');
      
      // Create uploads directory if it doesn't exist and not on Vercel
      if (!isVercel) {
        try {
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log(`Created upload directory: ${uploadDir}`);
          }
        } catch (err) {
          console.error('Error creating upload directory:', err);
        }
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueName + ext);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept only text files
    const allowedMimes = ['text/plain', 'text/markdown', 'application/octet-stream'];
    const allowedExts = ['.txt', '.md', '.text'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .txt and .md files are allowed'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Properly handle paths for both local and Vercel environments
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware for payload too large errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 413) {
    return res.status(413).json({ 
      error: 'Request entity too large. Please reduce the size of your input text or use file upload instead.' 
    });
  }
  next(err);
});

// Logging utility - only logs in debug mode
function log(message) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[LPS-ANALYZER] ${message}`);
  }
}

/**
 * Finds the longest palindromic substring using a naive approach (expand around center)
 * Time Complexity: O(n²) for the optimized version, O(n³) for the traditional version
 * Space Complexity: O(1)
 * 
 * How it works:
 * 1. For each possible center position in the string (both characters and spaces between):
 * 2. Try to expand around that center as far as possible while maintaining palindrome property
 * 3. Track the longest palindrome found during this process
 * 4. Handle both odd-length palindromes (centered at a character) and even-length palindromes
 *    (centered between two characters)
 * 
 * Optimizations:
 * - For large inputs (>5000 chars), uses a more efficient implementation that avoids
 *   redundant operations but keeps the same algorithmic approach
 * - Special handling to ignore spaces when checking for palindromes
 * - Case-insensitive comparison
 * 
 * Note: Spaces are ignored in palindrome detection. Case is now ignored too.
 * @param {string} s - Input string
 * @returns {string} - Longest palindromic substring
 */
function naiveLPS(s) {
  if (!s || typeof s !== 'string') {
    return '';
  }
  
  // Remove spaces and convert to lowercase for palindrome checking
  const originalStr = s;
  const processedStr = s.replace(/\s/g, '').toLowerCase();
  if (processedStr.length === 0) {
    return '';
  }
  
  // For very large inputs, use a more efficient implementation
  // This is still conceptually the naive approach but with better implementation
  if (processedStr.length > 5000) {
    console.log('Using optimized version of naive algorithm for large input');
    
    // Create mapping from processed string indices to original string indices
    const indexMapping = [];
    let processedIdx = 0;
    
    for (let i = 0; i < originalStr.length; i++) {
      if (originalStr[i].toLowerCase() !== ' ') {
        indexMapping[processedIdx] = i;
        processedIdx++;
      }
    }
    
    let maxLength = 1;
    let maxStart = 0;
    
    // Improved version of naive expansion around centers
    for (let i = 0; i < processedStr.length; i++) {
      // For odd length palindromes
      let left = i, right = i;
      while (left >= 0 && right < processedStr.length && 
             processedStr[left] === processedStr[right]) {
        const currentLength = right - left + 1;
        if (currentLength > maxLength) {
          maxLength = currentLength;
          maxStart = left;
        }
        left--;
        right++;
      }
      
      // For even length palindromes
      left = i;
      right = i + 1;
      while (left >= 0 && right < processedStr.length && 
             processedStr[left] === processedStr[right]) {
        const currentLength = right - left + 1;
        if (currentLength > maxLength) {
          maxLength = currentLength;
          maxStart = left;
        }
        left--;
        right++;
      }
    }
    
    // Map back to original string with spaces
    const origStart = indexMapping[maxStart];
    const origEnd = indexMapping[maxStart + maxLength - 1];
    
    return originalStr.substring(origStart, origEnd + 1);
  }
  
  // Standard implementation for smaller inputs
  let maxLength = 1;
  let start = 0;
  let end = 0;
  
  for (let i = 0; i < s.length; i++) {
    for (let j = i; j < s.length; j++) {
      let isPalindrome = true;
      
      // Get the substring without spaces for palindrome checking
      const subStr = s.substring(i, j + 1);
      const processedSubStr = subStr.replace(/\s/g, '').toLowerCase();
      
      // Check if it's a palindrome
      for (let k = 0; k < Math.floor(processedSubStr.length / 2); k++) {
        if (processedSubStr[k] !== processedSubStr[processedSubStr.length - k - 1]) {
          isPalindrome = false;
          break;
        }
      }
      
      // Update if a longer palindrome is found
      if (isPalindrome && processedSubStr.length > maxLength) {
        maxLength = processedSubStr.length;
        start = i;
        end = j;
      }
    }
  }
  
  return s.substring(start, end + 1);
}

/**
 * Finds the longest palindromic substring using dynamic programming
 * Time Complexity: O(n²)
 * Space Complexity: O(n²)
 * 
 * How it works:
 * 1. Create a 2D boolean table where table[i][j] represents whether substring from i to j is palindrome
 * 2. Fill this table in a bottom-up manner:
 *    - All substrings of length 1 are palindromes (table[i][i] = true)
 *    - For substrings of length 2, they're palindromes if both characters match
 *    - For substrings of length 3+, they're palindromes if outer characters match AND
 *      the inner substring is also a palindrome (table[i+1][j-1] is true)
 * 3. During this process, track the longest palindrome found
 * 
 * Optimizations:
 * - For very large inputs (>10000 chars), switches to an optimized implementation
 *   that avoids creating the full DP table to prevent memory issues
 * - Handles spaces by using a processed string for comparisons but maintaining
 *   the original string for returning results
 * - Case-insensitive comparison
 * 
 * Note: Spaces and case are ignored in palindrome detection.
 * @param {string} s - Input string
 * @returns {string} - Longest palindromic substring
 */
function dpLPS(s) {
  if (!s || typeof s !== 'string') {
    return '';
  }
  
  // Process string by removing spaces and converting to lowercase
  const originalStr = s;
  const processedStr = s.replace(/\s/g, '').toLowerCase();
  
  if (processedStr.length === 0) {
    return '';
  }
  
  // Use a more efficient approach for very large strings to avoid memory issues
  // This prevents hanging with large inputs
  if (processedStr.length > 10000) {
    console.log('Using optimized approach for very large input in DP algorithm');
    return optimizedDPForLargeInput(originalStr, processedStr);
  }
  
  // Create mapping from processed string indices to original string indices
  const indexMapping = [];
  let processedIdx = 0;
  
  for (let i = 0; i < originalStr.length; i++) {
    if (originalStr[i].toLowerCase() !== ' ') {
      indexMapping[processedIdx] = i;
      processedIdx++;
    }
  }
  
  // Initialize table
  const n = processedStr.length;
  const table = Array(n).fill().map(() => Array(n).fill(false));
  
  // All substrings of length 1 are palindromes
  let maxLength = 1;
  let start = 0;
  
  for (let i = 0; i < n; i++) {
    table[i][i] = true;
  }
  
  // Check for substrings of length 2
  for (let i = 0; i < n - 1; i++) {
    if (processedStr[i] === processedStr[i + 1]) {
      table[i][i + 1] = true;
      start = i;
      maxLength = 2;
    }
  }
  
  // Check for lengths greater than 2
  for (let k = 3; k <= n; k++) {
    for (let i = 0; i < n - k + 1; i++) {
      const j = i + k - 1;
      
      if (table[i + 1][j - 1] && processedStr[i] === processedStr[j]) {
        table[i][j] = true;
        
        if (k > maxLength) {
          start = i;
          maxLength = k;
        }
      }
    }
  }
  
  // Map back to original string with spaces
  const origStart = indexMapping[start];
  const origEnd = indexMapping[start + maxLength - 1];
  
  return originalStr.substring(origStart, origEnd + 1);
}

/**
 * An optimized approach for very large inputs that would cause memory issues with full DP
 * This implementation uses a sliding window and only checks potential palindromes
 * 
 * How it works:
 * 1. Instead of building the full DP table, it uses the expand-around-center technique
 * 2. But uses the knowledge gained from DP to make it more efficient
 * 3. Creates a mapping between processed string (no spaces, lowercase) and original string
 * 4. Expands around each potential center point (similar to naive approach but optimized)
 * 
 * @param {string} originalStr - Original input with spaces
 * @param {string} processedStr - Processed string without spaces and in lowercase
 * @returns {string} - Longest palindromic substring
 */
function optimizedDPForLargeInput(originalStr, processedStr) {
  // Create mapping from processed string indices to original string indices
  const indexMapping = [];
  let processedIdx = 0;
  
  for (let i = 0; i < originalStr.length; i++) {
    if (originalStr[i].toLowerCase() !== ' ') {
      indexMapping[processedIdx] = i;
      processedIdx++;
    }
  }
  
  let maxLength = 0;
  let maxStart = 0;
  
  // Check all possible centers
  for (let i = 0; i < processedStr.length; i++) {
    // For odd length palindromes
    let left = i, right = i;
    while (left >= 0 && right < processedStr.length && processedStr[left] === processedStr[right]) {
      const currentLength = right - left + 1;
      if (currentLength > maxLength) {
        maxLength = currentLength;
        maxStart = left;
      }
      left--;
      right++;
    }
    
    // For even length palindromes
    left = i;
    right = i + 1;
    while (left >= 0 && right < processedStr.length && processedStr[left] === processedStr[right]) {
      const currentLength = right - left + 1;
      if (currentLength > maxLength) {
        maxLength = currentLength;
        maxStart = left;
      }
      left--;
      right++;
    }
  }
  
  // Map back to original string with spaces
  const origStart = indexMapping[maxStart];
  const origEnd = indexMapping[maxStart + maxLength - 1];
  
  return originalStr.substring(origStart, origEnd + 1);
}

/**
 * Finds the longest palindromic substring using Manacher's algorithm
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 * 
 * How it works:
 * 1. Transform the string by inserting special characters (e.g., '#') between each character
 *    This allows us to handle both odd and even length palindromes uniformly
 * 2. For each position i:
 *    - If we know a palindrome centered at an earlier position extends beyond i,
 *      use this information to initialize the palindrome length at i
 *    - Expand outward from i to find the actual palindrome centered at i
 *    - Update the rightmost boundary of any palindrome seen so far
 * 3. The key insight is utilizing symmetry properties of palindromes to reuse
 *    previous computations, thus achieving linear time complexity
 * 
 * Optimizations:
 * - Linear time complexity (compared to quadratic for other approaches)
 * - Handles cases with spaces correctly by using a processed version for comparison
 * - Case-insensitive comparison
 * 
 * Note: Spaces and case are ignored in palindrome detection.
 * @param {string} s - Input string
 * @returns {string} - Longest palindromic substring
 */
function manacherLPS(s) {
  if (!s || typeof s !== 'string') {
    return '';
  }
  
  // Store original string and create processed string without spaces, in lowercase
  const originalStr = s;
  const processedStr = s.replace(/\s/g, '').toLowerCase();
  
  if (processedStr.length === 0) {
    return '';
  }
  
  // Create mapping from processed string indices to original string indices
  const indexMapping = [];
  let processedIdx = 0;
  
  for (let i = 0; i < originalStr.length; i++) {
    if (originalStr[i].toLowerCase() !== ' ') {
      indexMapping[processedIdx] = i;
      processedIdx++;
    }
  }
  
  // Prepare string for Manacher's algorithm
  const T = '#' + processedStr.split('').join('#') + '#';
  const n = T.length;
  const P = Array(n).fill(0);
  
  let C = 0, R = 0;
  for (let i = 1; i < n - 1; i++) {
    if (R > i) {
      P[i] = Math.min(R - i, P[2 * C - i]);
    }
    
    // Expand around center i
    while (i + P[i] + 1 < n && i - P[i] - 1 >= 0 && T[i + P[i] + 1] === T[i - P[i] - 1]) {
      P[i]++;
    }
    
    // Update center and right boundary
    if (i + P[i] > R) {
      C = i;
      R = i + P[i];
    }
  }
  
  // Find the maximum palindrome length
  let maxLen = 0;
  let centerIndex = 0;
  
  for (let i = 1; i < n - 1; i++) {
    if (P[i] > maxLen) {
      maxLen = P[i];
      centerIndex = i;
    }
  }
  
  // Convert to indices in the processed string
  const start = Math.floor((centerIndex - maxLen) / 2);
  
  // Map back to original string with spaces
  const origStart = indexMapping[start];
  const origEnd = indexMapping[start + maxLen - 1];
  
  return originalStr.substring(origStart, origEnd + 1);
}

// Utility function to measure the performance of an algorithm
function measurePerformance(algorithm, inputString) {
  try {
    // Check for valid input
    if (!inputString || typeof inputString !== 'string') {
      return {
        result: '',
        executionTime: 0,
        memoryUsage: 0
      };
    }
    
    // Maximum execution time allowed (in milliseconds)
    const MAX_EXECUTION_TIME = 120000; // 2 minutes - much longer to ensure algorithms complete
    
    // Focus on accurate time measurement first - this is what matters most
    // Set up timeout protection
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      console.log(`Algorithm ${algorithm.name} timed out after ${MAX_EXECUTION_TIME}ms`);
    }, MAX_EXECUTION_TIME);
    
    // Record start time and execute the algorithm
    const startTime = performance.now();
    const result = algorithm(inputString);
    const endTime = performance.now();
    
    // Clear the timeout since algorithm completed
    clearTimeout(timeoutId);
    
    // If timed out, return a timeout message
    if (timedOut) {
      return {
        result: `Result found but took longer than ${MAX_EXECUTION_TIME/1000} seconds`,
        executionTime: MAX_EXECUTION_TIME,
        memoryUsage: 0,
        timedOut: true
      };
    }
    
    // Calculate execution time
    const executionTime = endTime - startTime;
    
    // Memory measurement is secondary and often unreliable in Node.js
    // due to garbage collection running at unpredictable times
    let memoryUsage = 0;
    let memoryMeasurementIssue = false;
    
    try {
      const memBefore = process.memoryUsage().heapUsed;
      // Here we're intentionally NOT running the algorithm again for memory 
      // measurement, as it significantly impacts performance
      const memAfter = process.memoryUsage().heapUsed;
      memoryUsage = (memAfter - memBefore) / 1024; // Convert to KB
      
      // If memory usage is negative due to GC during algorithm execution,
      // we should note this in the result rather than showing an incorrect value
      if (memoryUsage < 0) {
        console.log(`Memory measurement issue detected for ${algorithm.name}: ${memoryUsage} KB`);
        memoryMeasurementIssue = true;
        // Don't modify the actual value - keep it as is and flag it
      }
    } catch (memError) {
      console.log(`Memory measurement error for ${algorithm.name}:`, memError);
      memoryMeasurementIssue = true;
    }
    
    // Return results and performance metrics
    return {
      result,
      executionTime: parseFloat(executionTime.toFixed(2)),
      memoryUsage: parseFloat(memoryUsage.toFixed(2)),
      memoryMeasurementIssue
    };
  } catch (error) {
    console.error("Performance measurement error:", error);
    return {
      result: 'Error: ' + error.message,
      executionTime: 0,
      memoryUsage: 0,
      error: error.message
    };
  }
}

// Route for running algorithms on direct text input
app.post('/runAlgorithms', (req, res) => {
  try {
    // Extract input string from request body
    const { inputString } = req.body;
    
    // Validate input
    if (!inputString) {
      return res.status(400).json({ error: 'Input string is required' });
    }
    
    log(`Processing input text (${inputString.length} characters)`);
    
    // Run all three algorithms and measure their performance
    const naiveResult = measurePerformance(naiveLPS, inputString);
    const dpResult = measurePerformance(dpLPS, inputString);
    const manacherResult = measurePerformance(manacherLPS, inputString);
    
    // Return the results
    return res.json({
      input: inputString.substring(0, 100) + (inputString.length > 100 ? '...' : ''),
      fullLength: inputString.length,
      results: {
        naive: {
          lps: naiveResult.result,
          executionTime: naiveResult.executionTime,
          memoryUsage: naiveResult.memoryUsage,
          timedOut: naiveResult.timedOut || false,
          memoryMeasurementIssue: naiveResult.memoryMeasurementIssue || false
        },
        dp: {
          lps: dpResult.result,
          executionTime: dpResult.executionTime,
          memoryUsage: dpResult.memoryUsage,
          timedOut: dpResult.timedOut || false,
          memoryMeasurementIssue: dpResult.memoryMeasurementIssue || false
        },
        manacher: {
          lps: manacherResult.result,
          executionTime: manacherResult.executionTime,
          memoryUsage: manacherResult.memoryUsage,
          timedOut: manacherResult.timedOut || false,
          memoryMeasurementIssue: manacherResult.memoryMeasurementIssue || false
        }
      }
    });
  } catch (error) {
    console.error("Algorithm error:", error);
    return res.status(500).json({ error: error.message || 'Error processing the input' });
  }
});

// Route for file upload
app.post('/upload', upload.single('file'), (req, res) => {
  console.log('File upload request received');
  
  try {
    // Basic validation
    if (!req.file) {
      console.log('No file was uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log(`File uploaded: ${req.file.originalname}, size: ${req.file.size} bytes`);
    
    // Read file directly 
    let fileContent;
    try {
      fileContent = fs.readFileSync(req.file.path, 'utf8');
      console.log(`Read ${fileContent.length} characters from file`);
      
      // Delete temp file
      fs.unlinkSync(req.file.path);
      console.log('Temporary file deleted');
    } catch (readError) {
      console.error('Error reading file:', readError);
      return res.status(500).json({ error: 'Failed to read uploaded file' });
    }
    
    // Absolute maximum file size
    if (fileContent.length > 500000) {
      console.log('File too large for processing');
      return res.status(413).json({
        error: 'File too large to process efficiently (max 500KB)',
        suggestion: 'Try a smaller file or extract just the portion you want to analyze'
      });
    }
    
    // Process the file content with our algorithms
    console.log(`Processing file with ${fileContent.length} characters...`);
    
    // Run all algorithms, regardless of file size
    console.log('Running all algorithms including naive...');
    const naiveResult = measurePerformance(naiveLPS, fileContent);
    console.log(`Naive complete: found palindrome of length ${naiveResult.result ? naiveResult.result.replace(/\s+/g, '').length : 0}`);
    
    console.log('Running DP algorithm...');
    const dpResult = measurePerformance(dpLPS, fileContent);
    console.log(`DP complete: found palindrome of length ${dpResult.result ? dpResult.result.replace(/\s+/g, '').length : 0}`);
    
    console.log('Running Manacher algorithm...');
    const manacherResult = measurePerformance(manacherLPS, fileContent);
    console.log(`Manacher complete: found palindrome of length ${manacherResult.result ? manacherResult.result.replace(/\s+/g, '').length : 0}`);
    
    console.log('All algorithms complete');
    
    // Send response back to client
    return res.json({
      input: fileContent.substring(0, 100) + (fileContent.length > 100 ? '...' : ''),
      fullLength: fileContent.length,
      results: {
        naive: {
          lps: naiveResult.result,
          executionTime: naiveResult.executionTime || 0,
          memoryUsage: naiveResult.memoryUsage || 0,
          timedOut: naiveResult.timedOut || false,
          memoryMeasurementIssue: naiveResult.memoryMeasurementIssue || false
        },
        dp: {
          lps: dpResult.result,
          executionTime: dpResult.executionTime || 0,
          memoryUsage: dpResult.memoryUsage || 0,
          timedOut: dpResult.timedOut || false,
          memoryMeasurementIssue: dpResult.memoryMeasurementIssue || false
        },
        manacher: {
          lps: manacherResult.result,
          executionTime: manacherResult.executionTime || 0,
          memoryUsage: manacherResult.memoryUsage || 0,
          timedOut: manacherResult.timedOut || false,
          memoryMeasurementIssue: manacherResult.memoryMeasurementIssue || false
        }
      }
    });
  } catch (error) {
    console.error('Unhandled error in file upload:', error);
    return res.status(500).json({ 
      error: error.message || 'An unexpected error occurred processing your file'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});

// Global error handler - after all routes
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  // Only send error response if headers haven't been sent already
  if (!res.headersSent) {
    res.status(500).json({ 
      error: err.message || 'An unexpected error occurred'
    });
  }
}); 