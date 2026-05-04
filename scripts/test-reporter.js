import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const resultsPath = path.join(process.cwd(), 'test-results.md');
const jsonResultsPath = path.join(process.cwd(), 'tests/results.json');

try {
  console.log('🧪 Scuttling through the test reef...');
  
  // Run tests and output JSON
  try {
    execSync('npx vitest run --reporter=json --outputFile=' + jsonResultsPath, { stdio: 'inherit' });
  } catch (err) {
    // Tests failed, but we still want to report
  }

  if (!fs.existsSync(jsonResultsPath)) {
    console.error('❌ Failed to generate test results JSON.');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(jsonResultsPath, 'utf-8'));
  const now = new Date().toLocaleString();

  let markdown = `# 🦞 Lobsterpedia Test Results\n\n`;
  markdown += `**Last Scan**: ${now}\n`;
  markdown += `**Status**: ${results.success ? '✅ PASSED' : '❌ FAILED'}\n\n`;

  markdown += `## 📊 Summary\n`;
  markdown += `- **Test Files**: ${results.numTotalTestSuites}\n`;
  markdown += `- **Total Tests**: ${results.numTotalTests}\n`;
  markdown += `- **Passed**: ${results.numPassedTests}\n`;
  markdown += `- **Failed**: ${results.numFailedTests}\n`;
  markdown += `- **Duration**: ${(results.startTime - Date.now()) / -1000}s\n\n`;

  markdown += `## 🧬 Detailed Results\n`;
  markdown += `| Suite | Result | Passed/Total | Duration |\n`;
  markdown += `| :--- | :--- | :--- | :--- |\n`;

  results.testResults.forEach(suite => {
    const relativePath = path.relative(process.cwd(), suite.name);
    const status = suite.status === 'passed' ? '✅' : '❌';
    const passed = suite.assertionResults.filter(r => r.status === 'passed').length;
    const total = suite.assertionResults.length;
    const duration = (suite.endTime - suite.startTime) / 1000;
    markdown += `| ${relativePath} | ${status} | ${passed}/${total} | ${duration}s |\n`;
  });

  if (results.numFailedTests > 0) {
    markdown += `\n## ⚠️ Failures\n`;
    results.testResults.forEach(suite => {
      suite.assertionResults.forEach(test => {
        if (test.status === 'failed') {
          markdown += `### ❌ ${test.fullName}\n`;
          markdown += `\`\`\`text\n${test.failureMessages.join('\n')}\n\`\`\`\n`;
        }
      });
    });
  }

  markdown += `\n---\n**Maintained by CrustAgent©™**\n`;

  fs.writeFileSync(resultsPath, markdown);
  console.log(`✅ Report generated at ${resultsPath}`);

  // Cleanup JSON
  fs.unlinkSync(jsonResultsPath);

} catch (err) {
  console.error('Failed to generate test report:', err);
  process.exit(1);
}
