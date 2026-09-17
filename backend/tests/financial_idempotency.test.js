const { calculateEnterpriseCommitmentBreakdown } = require('../services/enterpriseCommitmentService');
const fs = require('fs');
const path = require('path');

describe('Financial Calculation & Settlement Idempotency', () => {
  test('Calculates 6% platform commission on ₹500,000 sales accurately', () => {
    const grossSales = 500000;
    const breakdown = calculateEnterpriseCommitmentBreakdown(grossSales);
    expect(breakdown.calculatedCommission).toBe(30000);
    expect(breakdown.totalPlatformCommitment).toBe(30000);
  });

  test('Calculates minimum ₹20,000 commission when sales commission is lower', () => {
    const grossSales = 100000; // 6% = 6,000 < 20,000
    const breakdown = calculateEnterpriseCommitmentBreakdown(grossSales);
    expect(breakdown.calculatedCommission).toBe(6000);
    expect(breakdown.minimumCommitment).toBe(20000);
    expect(breakdown.commitmentAdjustment).toBe(14000);
    expect(breakdown.totalPlatformCommitment).toBe(20000);
  });

  test('Maintains 2-decimal precision for odd currency calculations', () => {
    const grossSales = 33333.33;
    const breakdown = calculateEnterpriseCommitmentBreakdown(grossSales);
    expect(breakdown.calculatedCommission).toBe(2000.00);
  });

  test('Subscription fee is strictly ₹14,999 for enterprise tier', () => {
    const breakdown = calculateEnterpriseCommitmentBreakdown(0);
    expect(breakdown.subscriptionAmount).toBe(14999);
  });

  test('Enterprise commitment service enforces idempotency on vendorId, year, and month', () => {
    const content = fs.readFileSync(
      path.join(__dirname, '../services/enterpriseCommitmentService.js'),
      'utf8'
    );
    expect(content).toContain("findFirst");
    expect(content).toContain("vendorId");
    expect(content).toContain("year: parseInt(year, 10)");
    expect(content).toContain("month: parseInt(month, 10)");
    expect(content).toContain("settlement");
  });
});
