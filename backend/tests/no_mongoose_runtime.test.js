const fs = require('fs');
const path = require('path');

describe('No Mongoose Runtime Dependency Verification', () => {
  const runtimeDirs = [
    path.join(__dirname, '../routes'),
    path.join(__dirname, '../controllers'),
    path.join(__dirname, '../services'),
    path.join(__dirname, '../middleware'),
    path.join(__dirname, '../jobs'),
    path.join(__dirname, '../config'),
  ];

  const runtimeFiles = [
    path.join(__dirname, '../server.js'),
  ];

  function getAllFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, fileList);
      } else if (fullPath.endsWith('.js')) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const allTargetFiles = [
    ...runtimeFiles,
    ...runtimeDirs.flatMap((dir) => getAllFiles(dir)),
  ];

  test('All runtime files must have ZERO imports of mongoose', () => {
    const violations = [];

    for (const file of allTargetFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (/require\s*\(\s*['"]mongoose['"]\s*\)/i.test(content)) {
        violations.push(path.relative(path.join(__dirname, '..'), file));
      }
    }

    expect(violations).toEqual([]);
  });

  test('All runtime files must have ZERO imports of legacy models directory', () => {
    const violations = [];

    for (const file of allTargetFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (/require\s*\(\s*['"][^'"]*models\/[^'"]*['"]\s*\)/i.test(content)) {
        violations.push(path.relative(path.join(__dirname, '..'), file));
      }
    }

    expect(violations).toEqual([]);
  });

  test('Authoritative database connection in config/db.js points strictly to Prisma PostgreSQL', () => {
    const dbConfig = fs.readFileSync(path.join(__dirname, '../config/db.js'), 'utf8');
    expect(dbConfig).toContain("prisma.$connect()");
    expect(dbConfig).not.toContain("mongoose.connect");
  });
});
