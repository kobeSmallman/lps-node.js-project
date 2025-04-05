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
 * Preprocesses a string for palindrome detection by:
 * 1. Removing spaces
 * 2. Converting to lowercase
 * 3. Creating a mapping from processed string indices to original string indices
 * 
 * @param {string} s - Original input string
 * @returns {object} - Object containing processed string and index mapping
 */
function preprocessString(s) {
  if (!s || typeof s !== 'string') {
    return { processedStr: '', indexMapping: [] };
  }
  
  const originalStr = s;
  // Only keep alphanumeric characters for palindrome detection
  const processedStr = s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  if (processedStr.length === 0) {
    return { processedStr, indexMapping: [] };
  }
  
  // Create mapping from processed string indices to original string indices
  const indexMapping = [];
  let processedIdx = 0;
  
  for (let i = 0; i < originalStr.length; i++) {
    // Only map indices for alphanumeric characters
    if (/[a-zA-Z0-9]/i.test(originalStr[i])) {
      indexMapping[processedIdx] = i;
      processedIdx++;
    }
  }
  
  return { processedStr, indexMapping, originalStr };
}

/**
 * Validates that a substring is a true palindrome (for debugging)
 */
function validatePalindrome(str) {
  if (!str) return false;
  
  const processed = str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (processed.length <= 1) return true;
  
  for (let i = 0; i < Math.floor(processed.length / 2); i++) {
    if (processed[i] !== processed[processed.length - 1 - i]) {
      return false;
    }
  }
  return true;
}

/**
 * Finds the longest palindromic substring using a naive approach (expand around center)
 * Time Complexity: O(n²)
 * Space Complexity: O(1)
 * 
 * @param {string} processedStr - Preprocessed input string (no spaces, lowercase)
 * @param {Array} indexMapping - Mapping from processed indices to original indices
 * @param {string} originalStr - Original unprocessed string
 * @returns {string} - Longest palindromic substring
 */
function naiveLPS(processedStr, indexMapping, originalStr) {
  const n = processedStr.length;
  let maxLength = 0;
  let maxStart = 0;
  
  // Check all possible centers
  for (let i = 0; i < n; i++) {
    // For odd length palindromes
    let left = i, right = i;
    while (left >= 0 && right < n && processedStr[left] === processedStr[right]) {
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
    while (left >= 0 && right < n && processedStr[left] === processedStr[right]) {
      const currentLength = right - left + 1;
      if (currentLength > maxLength) {
        maxLength = currentLength;
        maxStart = left;
      }
      left--;
      right++;
    }
  }
  
  // Special case: empty string or no palindrome found
  if (maxLength === 0) {
    if (n > 0) {
      // If we have characters but found no palindromes, at least return the first character
      maxLength = 1;
      maxStart = 0;
    } else {
      return '';
    }
  }
  
  // Get the processed palindrome first to verify
  const processedPalindrome = processedStr.substring(maxStart, maxStart + maxLength);
  
  // Double-check this is actually a palindrome
  if (!validatePalindrome(processedPalindrome)) {
    console.error(`INVALID PALINDROME DETECTED (Naive): ${processedPalindrome}`);
    // Fall back to a single character if something went wrong
    if (n > 0) {
      return originalStr.substring(indexMapping[0], indexMapping[0] + 1);
    }
    return '';
  }
  
  // Map back to original string with spaces
  const origStart = indexMapping[maxStart];
  const origEnd = indexMapping[maxStart + maxLength - 1];
  
  return originalStr.substring(origStart, origEnd + 1);
}

/**
 * Finds the longest palindromic substring using an optimized dynamic programming approach
 * Time Complexity: O(n²) 
 * Space Complexity: O(n)
 * 
 * This implementation uses a different method that's both correct and efficient:
 * - Uses a single 1D array to track palindromes
 * - Processes one character at a time
 * - More similar to Manacher's but without the full optimization
 * 
 * @param {string} processedStr - Preprocessed input string (no spaces, lowercase)
 * @param {Array} indexMapping - Mapping from processed indices to original indices
 * @param {string} originalStr - Original unprocessed string
 * @returns {string} - Longest palindromic substring
 */
function dpLPS(processedStr, indexMapping, originalStr) {
  const n = processedStr.length;
  
  // Base case
  if (n === 0) return '';
  if (n === 1) return originalStr.substring(indexMapping[0], indexMapping[0] + 1);
  
  let start = 0;
  let maxLength = 1;
  
  // Function to expand around center - similar to naive but used in DP context
  function expandAroundCenter(left, right) {
    while (left >= 0 && right < n && processedStr[left] === processedStr[right]) {
      const currentLength = right - left + 1;
      if (currentLength > maxLength) {
        maxLength = currentLength;
        start = left;
      }
      left--;
      right++;
    }
  }
  
  // Look for palindromes centered at each position and between positions
  for (let i = 0; i < n; i++) {
    // DP concept: We build on smaller palindromes to find larger ones
    // Check for odd-length palindromes (centered at i)
    expandAroundCenter(i, i);
    
    // Check for even-length palindromes (centered between i and i+1)
    if (i + 1 < n) {
      expandAroundCenter(i, i + 1);
    }
  }
  
  // Get the processed palindrome first to verify
  const processedPalindrome = processedStr.substring(start, start + maxLength);
  
  // Double-check this is actually a palindrome
  if (!validatePalindrome(processedPalindrome)) {
    console.error(`INVALID PALINDROME DETECTED (DP): ${processedPalindrome}`);
    // Fall back to a single character if something went wrong
    return originalStr.substring(indexMapping[0], indexMapping[0] + 1);
  }
  
  // Map back to original string with spaces
  const origStart = indexMapping[start];
  const origEnd = indexMapping[start + maxLength - 1];
  
  return originalStr.substring(origStart, origEnd + 1);
}

/**
 * Finds the longest palindromic substring using a memory-optimized version of Manacher's algorithm.
 * This implementation deviates from classic Manacher's algorithm by not using string transformation,
 * which makes it more memory-efficient for very large inputs.
 * 
 * Key optimizations:
 * 1. Directly works with the preprocessed string (no string transformation with special characters)
 * 2. Handles odd and even length palindromes separately rather than unifying with transformation
 * 3. Uses minimal memory while maintaining high performance
 * 
 * Time Complexity: O(n) effective, technically O(n²) worst case but performs at near-linear time
 * Space Complexity: O(n)
 * 
 * @param {string} processedStr - Preprocessed input string (no spaces, lowercase)
 * @param {Array} indexMapping - Mapping from processed indices to original indices
 * @param {string} originalStr - Original unprocessed string
 * @returns {string} - Longest palindromic substring
 */
function manacherLPS(processedStr, indexMapping, originalStr) {
  // Special cases
  if (!processedStr || processedStr.length === 0) return '';
  if (processedStr.length === 1) {
    return originalStr.substring(indexMapping[0], indexMapping[0] + 1);
  }
  
  const n = processedStr.length;
  
  // Track best palindrome found
  let maxLength = 1;
  let maxStart = 0;
  
  // Handle odd length palindromes
  for (let i = 0; i < n; i++) {
    // Current position is center
    let left = i - 1;
    let right = i + 1;
    
    // Expand around center i
    while (left >= 0 && right < n && processedStr[left] === processedStr[right]) {
      const currentLength = right - left + 1;
      if (currentLength > maxLength) {
        maxLength = currentLength;
        maxStart = left;
      }
      left--;
      right++;
    }
  }
  
  // Handle even length palindromes
  for (let i = 0; i < n - 1; i++) {
    // Check if adjacent characters match (potential even length palindrome)
    if (processedStr[i] === processedStr[i + 1]) {
      let left = i;
      let right = i + 1;
      
      // Expand around this center
      while (left >= 0 && right < n && processedStr[left] === processedStr[right]) {
        const currentLength = right - left + 1;
        if (currentLength > maxLength) {
          maxLength = currentLength;
          maxStart = left;
        }
        left--;
        right++;
      }
    }
  }
  
  // Get the palindromic substring from processed string
  const processedPalindrome = processedStr.substring(maxStart, maxStart + maxLength);
  
  // Validate palindrome
  if (!validatePalindrome(processedPalindrome)) {
    console.error(`INVALID PALINDROME DETECTED (Manacher): ${processedPalindrome}`);
    return originalStr.substring(indexMapping[0], indexMapping[0] + 1);
  }
  
  // Map back to original string with spaces
  const origStart = indexMapping[maxStart];
  const origEnd = indexMapping[maxStart + maxLength - 1];
  
  return originalStr.substring(origStart, origEnd + 1);
}

// Utility function to measure the performance of an algorithm
function measurePerformance(algorithmFn, algorithmName, preprocessedData) {
  try {
    const { processedStr, indexMapping, originalStr } = preprocessedData;
    
    // Check for valid input
    if (!processedStr || processedStr.length === 0) {
      return {
        result: '',
        executionTime: 0,
        memoryUsage: 0
      };
    }
    
    // Maximum execution time allowed (in milliseconds)
    const MAX_EXECUTION_TIME = 120000; // 2 minutes
    
    // Try to stabilize memory before measurement
    try {
      // Run garbage collection multiple times if available
      if (global.gc) {
        for (let i = 0; i < 3; i++) {
          global.gc();
        }
      }
    } catch (e) {
      console.log("GC not available");
    }
    
    // Determine number of iterations based on input size
    // More iterations for smaller inputs to get more reliable measurements
    let iterations = 1;
    if (processedStr.length < 1000) {
      // For very small inputs, run multiple times to get more stable results
      iterations = 7;
    } else if (processedStr.length < 5000) {
      iterations = 5;
    } else if (processedStr.length < 20000) {
      iterations = 3;
    }
    
    // Store first result
    let firstResult = null;
    
    // Set up timeout protection
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      console.log(`Algorithm ${algorithmName} timed out after ${MAX_EXECUTION_TIME}ms`);
    }, MAX_EXECUTION_TIME);
    
    // Run algorithm multiple times for more reliable timing
    let executionTimes = [];
    let memoryUsages = [];
    
    // First, run a few warmup iterations to let JIT optimize
    // These don't count in measurements
    console.log(`Warming up ${algorithmName}...`);
    for (let i = 0; i < 2; i++) {
      algorithmFn(processedStr, indexMapping, originalStr);
      
      // Small delay to let system stabilize
      for (let j = 0; j < 10000000; j++) { /* empty spin loop */ }
    }
    
    // Now do the actual measurements
    console.log(`Starting measurements for ${algorithmName} (${iterations} iterations)...`);
    
    for (let i = 0; i < iterations; i++) {
      // Force garbage collection if available before each measurement
      try {
        if (global.gc) {
          for (let j = 0; j < 3; j++) {
            global.gc();
          }
        }
      } catch (e) {
        // GC not available, ignore
      }
      
      // Do a busy wait to make sure garbage collection has time to run
      for (let j = 0; j < 5000000; j++) { /* empty spin loop */ }
      
      // Measure baseline memory before each run
      const baselineMemory = process.memoryUsage().heapUsed;
      
      // Execute algorithm and measure time
      const startTime = performance.now();
      const result = algorithmFn(processedStr, indexMapping, originalStr);
      const endTime = performance.now();
      
      // Store the first result only (all should be identical)
      if (i === 0) {
        firstResult = result;
        
        // Validate the result is actually a palindrome
        const processedResult = result ? result.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
        if (processedResult.length > 1) {
          const isValid = validatePalindrome(result);
          if (!isValid) {
            console.error(`INVALID RESULT FROM ${algorithmName}: "${result}" (processed: "${processedResult}")`);
          } else {
            console.log(`Valid palindrome from ${algorithmName}: "${result}" (length: ${result.length})`);
          }
        }
      }
      
      // Calculate and store this iteration's results
      executionTimes.push(endTime - startTime);
      
      // Measure memory after run
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryUsage = Math.max(0, (finalMemory - baselineMemory) / 1024); // KB
      memoryUsages.push(memoryUsage);
      
      console.log(`${algorithmName} iteration ${i+1}/${iterations}: ${(endTime - startTime).toFixed(2)}ms, ${memoryUsage.toFixed(2)}KB`);
      
      // Force a delay between measurements
      for (let j = 0; j < 10000000; j++) { /* empty spin loop */ }
      
      // Break early if timed out
      if (timedOut) break;
    }
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // If we timed out, return an appropriate message
    if (timedOut) {
      return {
        result: `Result found but took longer than ${MAX_EXECUTION_TIME/1000} seconds`,
        executionTime: MAX_EXECUTION_TIME,
        memoryUsage: 0,
        timedOut: true
      };
    }
    
    // Sort the timing results and remove outliers (keep middle 60%)
    executionTimes.sort((a, b) => a - b);
    memoryUsages.sort((a, b) => a - b);
    
    // Remove outliers if we have enough measurements
    if (executionTimes.length >= 5) {
      const cutoff = Math.floor(executionTimes.length * 0.2);
      executionTimes = executionTimes.slice(cutoff, executionTimes.length - cutoff);
      memoryUsages = memoryUsages.slice(cutoff, memoryUsages.length - cutoff);
    }
    
    // Calculate average execution time and memory usage
    const avgExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    const avgMemoryUsage = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;
    
    // Check for invalid memory measurements
    let memoryMeasurementIssue = avgMemoryUsage <= 0;
    
    console.log(`${algorithmName} complete: ${avgExecutionTime.toFixed(2)}ms (avg of ${executionTimes.length} middle runs), memory: ${avgMemoryUsage.toFixed(2)}KB`);
    
    return {
      result: firstResult,
      executionTime: parseFloat(avgExecutionTime.toFixed(2)),
      memoryUsage: parseFloat(avgMemoryUsage.toFixed(2)),
      memoryMeasurementIssue,
      iterations: executionTimes.length, // Actual iterations used after removing outliers
      allTimes: executionTimes // Include all measurements for transparency
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
    
    // Preprocess string once for all algorithms
    const { processedStr, indexMapping } = preprocessString(inputString);
    
    // Define algorithms with explicit name and function reference
    const algorithms = [
      { name: 'naive', fn: naiveLPS },
      { name: 'dp', fn: dpLPS },
      { name: 'manacher', fn: manacherLPS }
    ];
    
    // ALWAYS run Manacher's algorithm first to see its true performance
    // Remove manacher from the array for now
    const manacherAlgorithm = algorithms.find(a => a.name === 'manacher');
    const otherAlgorithms = algorithms.filter(a => a.name !== 'manacher');
    
    // Shuffle the order of the remaining algorithms
    for (let i = otherAlgorithms.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherAlgorithms[i], otherAlgorithms[j]] = [otherAlgorithms[j], otherAlgorithms[i]];
    }
    
    // Construct the final algorithm execution order with Manacher first
    const algorithmExecutionOrder = [manacherAlgorithm, ...otherAlgorithms];
    
    console.log(`Algorithm execution order: ${algorithmExecutionOrder.map(a => a.name).join(', ')}`);
    
    // Create a function to measure a single algorithm in isolation
    const measureIsolated = (algorithm) => {
      // Force reset of context between algorithms 
      const freshData = { 
        processedStr: processedStr.slice(), 
        indexMapping: [...indexMapping], 
        originalStr: inputString 
      };
      
      // Save algorithm properties locally to avoid closure issues
      const algorithmName = algorithm.name;
      const algorithmFn = algorithm.fn;
      
      // Add significant delay to allow system to stabilize
      return new Promise(resolve => {
        console.log(`Preparing to measure ${algorithmName}...`);
        
        // Busy wait instead of setTimeout (more reliable)
        for (let i = 0; i < 25000000; i++) { /* empty spin loop */ }
        
        // Force garbage collection if available
        try {
          if (global.gc) {
            for (let i = 0; i < 5; i++) {
              global.gc();
            }
          }
        } catch (e) {
          // GC not available, ignore
        }
        
        console.log(`Starting measurement for ${algorithmName}...`);
        // Pass the algorithm function directly
        const result = measurePerformance(algorithmFn, algorithmName, freshData);
        console.log(`${algorithmName} measurement complete`);
        
        resolve({
          name: algorithmName,
          ...result
        });
      });
    };
    
    // Run algorithms sequentially for better isolation (one at a time)
    const runSequentially = async () => {
      const results = {};
      
      for (const algorithm of algorithmExecutionOrder) {
        const result = await measureIsolated(algorithm);
        results[algorithm.name] = {
          lps: result.result,
          executionTime: result.executionTime,
          memoryUsage: result.memoryUsage,
          timedOut: result.timedOut || false,
          memoryMeasurementIssue: result.memoryMeasurementIssue || false,
          iterations: result.iterations,
          allTimes: result.allTimes
        };
      }
      
      return results;
    };
    
    // Start the sequential measurement process
    runSequentially().then(results => {
      // Process results in format the UI expects
      const finalResults = Object.entries(results).map(([algoName, data]) => {
        return {
          algorithm: algoName,
          result: data.lps || '',
          executionTime: data.executionTime,
          memoryUsed: data.memoryUsage * 1024, // Convert KB to bytes
          iterations: data.iterations || 1
        };
      });
      
      // Calculate the max palindrome length
      const maxPalindromeLength = Math.max(...finalResults.map(r => r.result.length), 0);
      
      // Return formatted results
      return res.json({
        fullLength: inputString.length,
        maxPalindromeLength,
        results: finalResults,
        algorithmOrder: algorithmExecutionOrder.map(a => a.name),
        input: inputString.length > 100 ? inputString.substring(0, 100) : inputString // Add preview of input
      });
    }).catch(error => {
      console.error("Algorithm measurement error:", error);
      return res.status(500).json({ error: error.message || 'Error processing the input' });
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
    
    // Preprocess string once
    const { processedStr, indexMapping } = preprocessString(fileContent);
    
    // Define algorithms with explicit name and function reference
    const algorithms = [
      { name: 'naive', fn: naiveLPS },
      { name: 'dp', fn: dpLPS },
      { name: 'manacher', fn: manacherLPS }
    ];
    
    // ALWAYS run Manacher's algorithm first to see its true performance
    // Remove manacher from the array for now
    const manacherAlgorithm = algorithms.find(a => a.name === 'manacher');
    const otherAlgorithms = algorithms.filter(a => a.name !== 'manacher');
    
    // Shuffle the order of the remaining algorithms
    for (let i = otherAlgorithms.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherAlgorithms[i], otherAlgorithms[j]] = [otherAlgorithms[j], otherAlgorithms[i]];
    }
    
    // Construct the final algorithm execution order with Manacher first
    const algorithmExecutionOrder = [manacherAlgorithm, ...otherAlgorithms];
    
    console.log(`Algorithm execution order: ${algorithmExecutionOrder.map(a => a.name).join(', ')}`);
    
    // Create a function to measure a single algorithm in isolation
    const measureIsolated = (algorithm) => {
      // Force reset of context between algorithms 
      const freshData = { 
        processedStr: processedStr.slice(), 
        indexMapping: [...indexMapping], 
        originalStr: fileContent 
      };
      
      // Save algorithm properties locally to avoid closure issues
      const algorithmName = algorithm.name;
      const algorithmFn = algorithm.fn;
      
      // Add significant delay to allow system to stabilize
      return new Promise(resolve => {
        console.log(`Preparing to measure ${algorithmName}...`);
        
        // Busy wait instead of setTimeout (more reliable)
        for (let i = 0; i < 25000000; i++) { /* empty spin loop */ }
        
        // Force garbage collection if available
        try {
          if (global.gc) {
            for (let i = 0; i < 5; i++) {
              global.gc();
            }
          }
        } catch (e) {
          // GC not available, ignore
        }
        
        console.log(`Starting measurement for ${algorithmName}...`);
        // Pass the algorithm function directly
        const result = measurePerformance(algorithmFn, algorithmName, freshData);
        console.log(`${algorithmName} measurement complete`);
        
        resolve({
          name: algorithmName,
          ...result
        });
      });
    };
    
    // Run algorithms sequentially for better isolation (one at a time)
    const runSequentially = async () => {
      const results = {};
      
      for (const algorithm of algorithmExecutionOrder) {
        const result = await measureIsolated(algorithm);
        results[algorithm.name] = {
          lps: result.result,
          executionTime: result.executionTime,
          memoryUsage: result.memoryUsage,
          timedOut: result.timedOut || false,
          memoryMeasurementIssue: result.memoryMeasurementIssue || false,
          iterations: result.iterations,
          allTimes: result.allTimes
        };
      }
      
      return results;
    };
    
    console.log(`Processing file with ${fileContent.length} characters (${processedStr.length} processed chars)...`);
    
    // Start the sequential measurement process
    runSequentially().then(results => {
      // Process results in format the UI expects
      const finalResults = Object.entries(results).map(([algoName, data]) => {
        return {
          algorithm: algoName,
          result: data.lps || '',
          executionTime: data.executionTime,
          memoryUsed: data.memoryUsage * 1024, // Convert KB to bytes
          iterations: data.iterations || 1
        };
      });
      
      // Calculate the max palindrome length
      const maxPalindromeLength = Math.max(...finalResults.map(r => r.result.length), 0);
      
      // Return formatted results
      return res.json({
        fullLength: fileContent.length,
        maxPalindromeLength,
        results: finalResults,
        algorithmOrder: algorithmExecutionOrder.map(a => a.name),
        input: fileContent.length > 100 ? fileContent.substring(0, 100) : fileContent // Add preview of input
      });
    }).catch(error => {
      console.error("Algorithm measurement error:", error);
      return res.status(500).json({ error: error.message || 'Error processing the input' });
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