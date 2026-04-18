import { diffLines } from 'diff';

/**
 * Returns line-by-line diff between two texts using LCS algorithm
 * (same approach as Total Commander file comparison)
 */
export const generateDiff = (text1, text2) => {
  const diffResult = diffLines(text1, text2);
  const result = [];

  let lineNumber1 = 1;
  let lineNumber2 = 1;

  // First pass: collect all lines with their types
  const left = [];
  const right = [];

  for (const part of diffResult) {
    const lines = part.value.split('\n');
    // diffLines ends parts with \n, so last element is always empty string
    if (lines[lines.length - 1] === '') lines.pop();

    if (!part.added && !part.removed) {
      // Unchanged lines – appear on both sides
      for (const line of lines) {
        left.push({ type: 'unchanged', content: line, lineNumber: lineNumber1++ });
        right.push({ type: 'unchanged', content: line, lineNumber: lineNumber2++ });
      }
    } else if (part.removed) {
      for (const line of lines) {
        left.push({ type: 'removed', content: line, lineNumber: lineNumber1++ });
      }
    } else if (part.added) {
      for (const line of lines) {
        right.push({ type: 'added', content: line, lineNumber: lineNumber2++ });
      }
    }
  }

  // Second pass: pair up removed/added lines so they appear on the same row
  let li = 0;
  let ri = 0;

  while (li < left.length || ri < right.length) {
    const l = left[li];
    const r = right[ri];

    if (!l) {
      // Only right side has lines left
      result.push({ type: 'added', line1: null, line2: r.content, lineNumber1: null, lineNumber2: r.lineNumber });
      ri++;
    } else if (!r) {
      // Only left side has lines left
      result.push({ type: 'removed', line1: l.content, line2: null, lineNumber1: l.lineNumber, lineNumber2: null });
      li++;
    } else if (l.type === 'unchanged' && r.type === 'unchanged') {
      result.push({ type: 'unchanged', line1: l.content, line2: r.content, lineNumber1: l.lineNumber, lineNumber2: r.lineNumber });
      li++; ri++;
    } else if (l.type === 'removed' && r.type === 'added') {
      // Pair removed + added as a "changed" line
      result.push({ type: 'changed', line1: l.content, line2: r.content, lineNumber1: l.lineNumber, lineNumber2: r.lineNumber });
      li++; ri++;
    } else if (l.type === 'removed') {
      result.push({ type: 'removed', line1: l.content, line2: null, lineNumber1: l.lineNumber, lineNumber2: null });
      li++;
    } else {
      result.push({ type: 'added', line1: null, line2: r.content, lineNumber1: null, lineNumber2: r.lineNumber });
      ri++;
    }
  }

  return result;
};

export const prepareComparisonData = (file1, file2, text1, text2) => {
  return {
    file1: { name: file1.name, content: text1, lines: text1.split('\n') },
    file2: { name: file2.name, content: text2, lines: text2.split('\n') },
    diffLines: generateDiff(text1, text2)
  };
};

export const compareConfigFiles = async (selectedConfigs, configFiles, setError) => {
  if (selectedConfigs.length !== 2) return null;

  try {
    const file1 = configFiles.find(c => c.config_id === selectedConfigs[0]);
    const file2 = configFiles.find(c => c.config_id === selectedConfigs[1]);

    if (!file1 || !file2 || !file1.file || !file2.file) {
      setError("Cannot compare files: one or both files are missing");
      return null;
    }

    const [response1, response2] = await Promise.all([fetch(file1.file), fetch(file2.file)]);

    if (!response1.ok || !response2.ok) {
      setError("Failed to fetch files for comparison");
      return null;
    }

    const [text1, text2] = await Promise.all([response1.text(), response2.text()]);

    return prepareComparisonData(file1, file2, text1, text2);
  } catch (error) {
    setError("Error comparing files: " + error.message);
    return null;
  }
};