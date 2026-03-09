import * as fs from 'fs';
import * as path from 'path';

const files = [
  'InputCell.ts',
  'OutputCell.ts',
  'TransformCell.ts',
  'FilterCell.ts',
  'AggregateCell.ts',
  'ValidateCell.ts',
  'AnalysisCell.ts',
  'PredictionCell.ts',
  'DecisionCell.ts',
  'ExplainCell.ts',
];

files.forEach(file => {
  const filePath = path.join('src', 'spreadsheet', 'cells', file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let insertIndex = -1;
  let className = file.replace('.ts', '');

  // Find the last method (before the final closing brace)
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim().startsWith('export class') || lines[i].trim().startsWith('export interface')) {
      // Skip non-class files
      if (!foundExport && !lines[i].includes(`class ${className}`)) {
        console.log(`Skipping ${file} - no class found`);
        return;
      }

      // Found the class, look for its last closing brace
      let classEndIndex = -1;
      for (let j = i; j >= 0; j--) {
        if (lines[j].trim() === '}') {
          classEndIndex = j;
          break;
        }
      }
    }
  }

  if (classEndIndex === -1) {
    console.log(`Could not find class end for ${file}`);
    return;
  }

  // Find if createProcessingLogic already exists
  const hasMethod = content.includes('protected createProcessingLogic()');

  if (hasMethod) {
    console.log(`${file} already has createProcessingLogic`);
    return;
  }

  // Get the class name from file
  const classMatch = content.match(/export class (\w+) extends LogCell/);
  const cellClass = classMatch ? classMatch[1] : null;

  if (!cellClass) {
    console.log(`Could not find class name in ${file}`);
    return;
  }

  // Determine the cell type from the class name
  const cellType = cellClass.replace('Cell', '').toLowerCase();

  // Add the method before the final closing brace
  const methodToAdd = `
  /**
   * Create the processing logic for this cell
   */
  protected createProcessingLogic(): any {
    return {
      type: '${cellType}',
      cellClass: '${cellClass}',
    };
  }
`;

  const newContent =
    lines.slice(0, classEndIndex).join('\n') +
    methodToAdd + '\n' +
    lines.slice(classEndIndex).join('\n');
  }

  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log(`Added createProcessingLogic to ${file}`);
});
