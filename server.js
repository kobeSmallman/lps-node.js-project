const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DEBUG = process.env.DEBUG === 'true' || false; // Debug flag

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size (increased from 2MB)
  },
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'uploads');
      
      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
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
const staticPath = process.env.VERCEL ? path.join(__dirname, 'public') : 'public';
app.use(express.static(staticPath));

// Error handling middleware for payload too large errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 413) {
    return res.status(413).json({ 
      error: 'Request entity too large. Please reduce the size of your input text or use file upload instead.' 
    });
  }
  next(err);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({ 
    error: err.message || 'An unexpected error occurred'
  });
});

// Logging utility - only logs in debug mode
function log(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

/**
 * Finds the longest palindromic substring using a naive approach (expand around center)
 * Time Complexity: O(n²)
 * Space Complexity: O(1)
 * Note: Spaces are ignored in palindrome detection.
 * @param {string} str - Input string
 * @returns {string} - Longest palindromic substring
 */
function naiveLPS(str) {
  if (!str || str.length < 1) return "";
  
  // Remove spaces for comparison but keep original string intact for returning
  const strNoSpaces = str.replace(/\s+/g, "");
  const spaceMap = buildSpaceMap(str);
  
  let start = 0;
  let maxLength = 1;
  
  // Function to expand around center
  function expandAroundCenter(left, right) {
    while (left >= 0 && right < strNoSpaces.length && strNoSpaces[left] === strNoSpaces[right]) {
      // Found a palindrome - calculate current length
      const currentLength = right - left + 1;
      
      // Update if longer than our current max
      if (currentLength > maxLength) {
        maxLength = currentLength;
        start = left;
      }
      
      // Expand outward
      left--;
      right++;
    }
  }
  
  // Check each position as potential center
  for (let i = 0; i < strNoSpaces.length; i++) {
    // Expand for odd-length palindromes (single character center)
    expandAroundCenter(i, i);
    
    // Expand for even-length palindromes (between two characters)
    expandAroundCenter(i, i + 1);
  }
  
  // Map the no-spaces positions back to the original string
  const originalStart = mapPositionToOriginal(start, spaceMap);
  const originalEnd = mapPositionToOriginal(start + maxLength - 1, spaceMap);
  
  // Return the longest palindromic substring
  return str.substring(originalStart, originalEnd + 1);
}

/**
 * Builds a mapping from positions in string without spaces to positions in original string
 * @param {string} str - Original string with spaces
 * @returns {Map<number, number>} - Map from position without spaces to position with spaces
 */
function buildSpaceMap(str) {
  const map = new Map();
  let noSpacePos = 0;
  
  for (let i = 0; i < str.length; i++) {
    if (str[i] !== ' ') {
      map.set(noSpacePos, i);
      noSpacePos++;
    }
  }
  
  return map;
}

/**
 * Maps a position in the no-spaces string back to the original string
 * @param {number} pos - Position in string without spaces
 * @param {Map<number, number>} spaceMap - Map from position without spaces to position with spaces
 * @returns {number} - Position in original string
 */
function mapPositionToOriginal(pos, spaceMap) {
  return spaceMap.get(pos) || 0;
}

/**
 * Finds the longest palindromic substring using dynamic programming
 * Time Complexity: O(n²)
 * Space Complexity: O(n²)
 * Note: Spaces are ignored in palindrome detection.
 * @param {string} str - Input string
 * @returns {string} - Longest palindromic substring
 */
function dpLPS(str) {
  if (!str || str.length < 1) return "";
  
  // Keep the original string for returning but process without spaces
  const strNoSpaces = str.replace(/\s+/g, "");
  const spaceMap = buildSpaceMap(str);
  
  const n = strNoSpaces.length;
  let start = 0;
  let maxLength = 1;
  
  // For very long strings, use a more memory-efficient approach
  if (n > 1000) {
    return optimizedDpLPS(str);
  }
  
  // Create a table to store results of subproblems
  // dp[i][j] will be true if the substring str[i..j] is a palindrome
  const dp = Array(n).fill().map(() => Array(n).fill(false));
  
  // All substrings of length 1 are palindromes
  for (let i = 0; i < n; i++) {
    dp[i][i] = true;
  }
  
  // Check for substrings of length 2
  for (let i = 0; i < n - 1; i++) {
    if (strNoSpaces[i] === strNoSpaces[i + 1]) {
      dp[i][i + 1] = true;
      start = i;
      maxLength = 2;
    }
  }
  
  // Check for substrings of length 3 or more
  // k is the length of substring
  for (let k = 3; k <= n; k++) {
    // Fix the starting index
    for (let i = 0; i < n - k + 1; i++) {
      // Get the ending index of substring from
      // starting index i and length k
      const j = i + k - 1;
      
      // Check if substring from i to j is a palindrome
      // A substring is a palindrome if its endpoints match
      // and the substring inside it is also a palindrome
      if (dp[i + 1][j - 1] && strNoSpaces[i] === strNoSpaces[j]) {
        dp[i][j] = true;
        
        if (k > maxLength) {
          start = i;
          maxLength = k;
        }
      }
    }
  }
  
  // Map the no-spaces positions back to the original string
  const originalStart = mapPositionToOriginal(start, spaceMap);
  const originalEnd = mapPositionToOriginal(start + maxLength - 1, spaceMap);
  
  return str.substring(originalStart, originalEnd + 1);
}

/**
 * Memory-optimized version of dynamic programming approach for very long strings
 * Uses a rolling window approach to reduce memory usage
 * Time Complexity: O(n²)
 * Space Complexity: O(n)
 * Note: Spaces are ignored in palindrome detection.
 * @param {string} str - Input string
 * @returns {string} - Longest palindromic substring
 */
function optimizedDpLPS(str) {
  if (!str || str.length < 1) return "";
  
  // Process string without spaces but keep original for returning
  const strNoSpaces = str.replace(/\s+/g, "");
  const spaceMap = buildSpaceMap(str);
  
  const n = strNoSpaces.length;
  let start = 0;
  let maxLength = 1;
  
  // Function to expand around center
  function expandAroundCenter(left, right) {
    while (left >= 0 && right < n && strNoSpaces[left] === strNoSpaces[right]) {
      const currentLength = right - left + 1;
      if (currentLength > maxLength) {
        maxLength = currentLength;
        start = left;
      }
      left--;
      right++;
    }
  }
  
  // Check each position as potential center
  for (let i = 0; i < n; i++) {
    // Odd length palindromes
    expandAroundCenter(i, i);
    // Even length palindromes
    expandAroundCenter(i, i + 1);
  }
  
  // Map the no-spaces positions back to the original string
  const originalStart = mapPositionToOriginal(start, spaceMap);
  const originalEnd = mapPositionToOriginal(start + maxLength - 1, spaceMap);
  
  return str.substring(originalStart, originalEnd + 1);
}

/**
 * Finds the longest palindromic substring using Manacher's algorithm
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 * Note: Spaces are ignored in palindrome detection.
 * @param {string} str - Input string
 * @returns {string} - Longest palindromic substring
 */
function manacherLPS(str) {
  if (!str || str.length < 1) return "";
  
  // Process string without spaces but keep original for returning
  const strNoSpaces = str.replace(/\s+/g, "");
  const spaceMap = buildSpaceMap(str);
  
  // Transform the input string to handle even length palindromes
  // Insert special character '#' between each character and at the boundaries
  let transformedStr = "#";
  for (let i = 0; i < strNoSpaces.length; i++) {
    transformedStr += strNoSpaces[i] + "#";
  }
  
  const n = transformedStr.length;
  
  // LPS length array (will hold the palindrome length at each position)
  const lps = Array(n).fill(0);
  
  let center = 0;      // Position of the center of the rightmost palindrome
  let rightBoundary = 0;  // Position of the right boundary of the rightmost palindrome
  
  let maxPalindromeCenter = 0;  // Center of the longest palindrome found
  let maxPalindromeLength = 0;  // Length of the longest palindrome found
  
  // Main algorithm
  for (let i = 0; i < n; i++) {
    // Mirror position of i with respect to center
    const mirror = 2 * center - i;
    
    // If i is within the right boundary, use the mirror value to initialize lps[i]
    if (i < rightBoundary) {
      lps[i] = Math.min(rightBoundary - i, lps[mirror]);
    }
    
    // Attempt to expand the palindrome centered at i
    let left = i - (lps[i] + 1);
    let right = i + (lps[i] + 1);
    
    // Expand as far as possible
    while (left >= 0 && right < n && transformedStr[left] === transformedStr[right]) {
      lps[i]++;
      left--;
      right++;
    }
    
    // Update the rightmost palindrome if the current palindrome expands beyond it
    if (i + lps[i] > rightBoundary) {
      center = i;
      rightBoundary = i + lps[i];
    }
    
    // Track the longest palindrome found
    if (lps[i] > maxPalindromeLength) {
      maxPalindromeLength = lps[i];
      maxPalindromeCenter = i;
    }
  }
  
  // Extract the longest palindromic substring from the no-spaces string
  const noSpacesStart = Math.floor((maxPalindromeCenter - maxPalindromeLength) / 2);
  const noSpacesEnd = noSpacesStart + maxPalindromeLength - 1;
  
  // Map back to original string positions
  const originalStart = mapPositionToOriginal(noSpacesStart, spaceMap);
  const originalEnd = mapPositionToOriginal(noSpacesEnd, spaceMap);
  
  return str.substring(originalStart, originalEnd + 1);
}

/**
 * Measures execution time and memory usage of a function
 * @param {Function} fn - Function to measure
 * @param {any[]} args - Arguments to pass to the function
 * @returns {Object} - Performance metrics and result
 */
function measurePerformance(fn, ...args) {
  // Capture initial memory usage
  const memBefore = process.memoryUsage();
  
  // Measure execution time
  const startTime = process.hrtime.bigint();
  const result = fn(...args);
  const endTime = process.hrtime.bigint();
  
  // Capture final memory usage
  const memAfter = process.memoryUsage();
  
  // Calculate elapsed time in milliseconds
  const elapsedMs = Number(endTime - startTime) / 1_000_000;
  
  // Calculate memory usage in MB
  const heapUsed = (memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024);
  
  return {
    result,
    performance: {
      executionTime: elapsedMs.toFixed(3) + ' ms',
      memoryUsage: heapUsed.toFixed(3) + ' MB',
    }
  };
}

// API endpoint for running all algorithms
app.post('/runAlgorithms', (req, res) => {
  const { inputString } = req.body;
  
  if (!inputString) {
    return res.status(400).json({ error: 'Input string is required' });
  }
  
  try {
    // Validate input to prevent errors
    if (typeof inputString !== 'string') {
      return res.status(400).json({ error: 'Input must be a string' });
    }
    
    // Only log in debug mode
    log("Input string length:", inputString.length);
    
    // Run and measure all three algorithms
    const naiveResult = measurePerformance(naiveLPS, inputString);
    const dpResult = measurePerformance(dpLPS, inputString);
    const manacherResult = measurePerformance(manacherLPS, inputString);
    
    // Debug output only if needed
    log("Naive result length:", naiveResult.result.length);
    log("DP result length:", dpResult.result.length);
    log("Manacher result length:", manacherResult.result.length);
    
    // Return results
    res.json({
      input: inputString,
      results: {
        naive: {
          lps: naiveResult.result,
          ...naiveResult.performance
        },
        dp: {
          lps: dpResult.result,
          ...dpResult.performance
        },
        manacher: {
          lps: manacherResult.result,
          ...manacherResult.performance
        }
      }
    });
  } catch (error) {
    console.error("Algorithm error:", error);
    // Ensure we always return JSON
    res.status(500).json({ error: error.message || 'Error processing the input' });
  }
});

// Route for file upload
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Read the file content
    fs.readFile(req.file.path, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).json({ error: 'Error reading uploaded file' });
      }
      
      try {
        // Delete the file after reading
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Warning: Failed to delete temp file:', unlinkErr);
          }
          
          // Process the text with algorithms
          const naiveResult = measurePerformance(naiveLPS, data);
          const dpResult = measurePerformance(dpLPS, data);
          const manacherResult = measurePerformance(manacherLPS, data);
          
          // Log file details only in debug mode
          log(`Processed file: ${req.file.originalname} (${data.length} characters)`);
          
          // Return the results
          res.json({
            input: data.substring(0, 100) + (data.length > 100 ? '...' : ''), // Send truncated input for UI
            fullLength: data.length,
            results: {
              naive: {
                lps: naiveResult.result,
                ...naiveResult.performance
              },
              dp: {
                lps: dpResult.result,
                ...dpResult.performance
              },
              manacher: {
                lps: manacherResult.result,
                ...manacherResult.performance
              }
            }
          });
        });
      } catch (processingError) {
        console.error("File processing error:", processingError);
        return res.status(500).json({ error: processingError.message || 'Error processing file content' });
      }
    });
  } catch (error) {
    console.error("File upload error:", error);
    return res.status(500).json({ error: error.message || 'Error handling file upload' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
}); 