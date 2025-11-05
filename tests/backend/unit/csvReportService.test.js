import { describe, it, expect } from '@jest/globals';
import { createCSV } from '../../../little_farms/backend/services/csvReportService.js';

describe('CSV Report Service Tests', () => {
  // ============================================================================
  // createCSV
  // ============================================================================
  describe('createCSV', () => {
    it('should create CSV from array of objects', () => {
      const data = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'Los Angeles' }
      ];

      const csv = createCSV(data);

      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
      expect(csv).toContain('name');
      expect(csv).toContain('age');
      expect(csv).toContain('city');
      expect(csv).toContain('John');
      expect(csv).toContain('Jane');
    });

    it('should include all fields from all objects', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', city: 'Los Angeles' }
      ];

      const csv = createCSV(data);

      // Should include all unique fields: name, age, city
      expect(csv).toContain('name');
      expect(csv).toContain('age');
      expect(csv).toContain('city');
    });

    it('should handle empty arrays', () => {
      const data = [];
      const csv = createCSV(data);

      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
    });

    it('should handle single object', () => {
      const data = [
        { name: 'John', age: 30, city: 'New York' }
      ];

      const csv = createCSV(data);

      expect(csv).toBeDefined();
      expect(csv).toContain('name');
      expect(csv).toContain('John');
    });

    it('should handle objects with different fields', () => {
      const data = [
        { field1: 'value1', field2: 'value2' },
        { field3: 'value3', field4: 'value4' }
      ];

      const csv = createCSV(data);

      expect(csv).toContain('field1');
      expect(csv).toContain('field2');
      expect(csv).toContain('field3');
      expect(csv).toContain('field4');
    });

    it('should handle task completion report data structure', () => {
      const data = [
        {
          'Task Name': 'Task 1',
          'Owner of Task': 'John Doe',
          'Project Name': 'Project A',
          'Status': 'done',
          'Completion date': '2024-01-15'
        },
        {
          'Task Name': 'Task 2',
          'Owner of Task': 'Jane Smith',
          'Project Name': 'Project B',
          'Status': 'In Progress',
          'Completion date': ''
        }
      ];

      const csv = createCSV(data);

      expect(csv).toContain('Task Name');
      expect(csv).toContain('Owner of Task');
      expect(csv).toContain('Project Name');
      expect(csv).toContain('Status');
      expect(csv).toContain('Completion date');
      expect(csv).toContain('Task 1');
      expect(csv).toContain('Task 2');
    });

    it('should handle logged time report data structure', () => {
      const data = [
        {
          'Project Name': 'Project A',
          'Task Name': 'Task 1',
          'Staff Name': 'John Doe',
          'Department': 'IT',
          'No. of Hours': '8'
        }
      ];

      const csv = createCSV(data);

      expect(csv).toContain('Project Name');
      expect(csv).toContain('Task Name');
      expect(csv).toContain('Staff Name');
      expect(csv).toContain('Department');
      expect(csv).toContain('No. of Hours');
    });

    it('should handle empty values', () => {
      const data = [
        { name: 'John', age: '', city: 'New York' },
        { name: 'Jane', age: 25, city: '' }
      ];

      const csv = createCSV(data);

      expect(csv).toBeDefined();
      expect(csv).toContain('name');
      expect(csv).toContain('age');
      expect(csv).toContain('city');
    });

    it('should handle special characters in data', () => {
      const data = [
        { name: 'John, Jr.', description: 'Task with "quotes" and, commas' },
        { name: 'Jane; Smith', description: 'Description with; semicolons' }
      ];

      const csv = createCSV(data);

      expect(csv).toBeDefined();
      expect(csv).toContain('John');
      expect(csv).toContain('Jane');
    });

    it('should handle numeric values', () => {
      const data = [
        { name: 'John', age: 30, score: 95.5 },
        { name: 'Jane', age: 25, score: 88.0 }
      ];

      const csv = createCSV(data);

      expect(csv).toContain('age');
      expect(csv).toContain('score');
      expect(csv).toContain('30');
      expect(csv).toContain('95.5');
    });

    it('should handle boolean values', () => {
      const data = [
        { name: 'John', active: true, verified: false }
      ];

      const csv = createCSV(data);

      expect(csv).toContain('active');
      expect(csv).toContain('verified');
    });

    it('should handle null values', () => {
      const data = [
        { name: 'John', age: null, city: 'New York' }
      ];

      const csv = createCSV(data);

      expect(csv).toBeDefined();
      expect(csv).toContain('name');
      expect(csv).toContain('age');
    });

    it('should handle undefined values', () => {
      const data = [
        { name: 'John', age: undefined, city: 'New York' }
      ];

      const csv = createCSV(data);

      expect(csv).toBeDefined();
      expect(csv).toContain('name');
      expect(csv).toContain('age');
    });

    it('should produce valid CSV format with headers', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];

      const csv = createCSV(data);
      const lines = csv.split('\n');

      // Should have header row and data rows
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0]).toContain('name');
      expect(lines[0]).toContain('age');
    });
  });
});

