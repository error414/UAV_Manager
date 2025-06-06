/**
 * Returns line-by-line diff between two texts
 * @param {string} text1 - Content of the first file
 * @param {string} text2 - Content of the second file
 * @returns {Array} Array of difference objects with line information
 */
export const generateDiff = (text1, text2) => {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const result = [];
  
  const maxLines = Math.max(lines1.length, lines2.length);
  
  for (let i = 0; i < maxLines; i++) {
    const line1 = i < lines1.length ? lines1[i] : null;
    const line2 = i < lines2.length ? lines2[i] : null;
    
    if (line1 === line2) {
      result.push({ type: 'unchanged', line1, line2, lineNumber: i + 1 });
    } else {
      result.push({ 
        type: line1 === null ? 'added' : line2 === null ? 'removed' : 'changed',
        line1,
        line2,
        lineNumber: i + 1
      });
    }
  }
  
  return result;
};

/**
 * Prepares comparison data for two files
 * @param {Object} file1 - First file object with name and file URL
 * @param {Object} file2 - Second file object with name and file URL
 * @param {string} text1 - Content of the first file
 * @param {string} text2 - Content of the second file
 * @returns {Object} Data object with file information and diff lines
 */
export const prepareComparisonData = (file1, file2, text1, text2) => {
  return {
    file1: {
      name: file1.name,
      content: text1,
      lines: text1.split('\n')
    },
    file2: {
      name: file2.name,
      content: text2,
      lines: text2.split('\n')
    },
    diffLines: generateDiff(text1, text2)
  };
};

/**
 * Fetches and compares two config files by ID
 * 
 * @param {Array} selectedConfigs - Array of selected config IDs
 * @param {Array} configFiles - Array of all available config files
 * @param {Function} setError - Function to set error message
 * @returns {Promise<Object|null>} - Returns comparison data or null if comparison failed
 */
export const compareConfigFiles = async (selectedConfigs, configFiles, setError) => {
  if (selectedConfigs.length !== 2) return null;
  
  try {
    const file1 = configFiles.find(c => c.config_id === selectedConfigs[0]);
    const file2 = configFiles.find(c => c.config_id === selectedConfigs[1]);
    
    if (!file1 || !file2 || !file1.file || !file2.file) {
      setError("Cannot compare files: one or both files are missing");
      return null;
    }
    
    const [response1, response2] = await Promise.all([
      fetch(file1.file),
      fetch(file2.file)
    ]);
    
    if (!response1.ok || !response2.ok) {
      setError("Failed to fetch files for comparison");
      return null;
    }
    
    const [text1, text2] = await Promise.all([
      response1.text(),
      response2.text()
    ]);
    
    return prepareComparisonData(file1, file2, text1, text2);
  } catch (error) {
    setError("Error comparing files: " + error.message);
    return null;
  }
};
