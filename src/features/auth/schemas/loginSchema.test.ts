import { describe, it, expect } from 'vitest';
import { loginSchema } from './loginSchema';

describe('Login Schema Validation', () => {
  describe('Valid credentials', () => {
    it('should accept valid username and password', () => {
      const validData = {
        username: 'admin',
        password: '1234',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept username with exactly 3 characters', () => {
      const validData = {
        username: 'abc',
        password: '1234',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept password with exactly 4 characters', () => {
      const validData = {
        username: 'admin',
        password: '1234',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid username', () => {
    it('should reject empty username', () => {
      const invalidData = {
        username: '',
        password: '1234',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Usuario debe tener al menos 3 caracteres');
      }
    });

    it('should reject username with less than 3 characters', () => {
      const invalidData = {
        username: 'ab',
        password: '1234',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Usuario debe tener al menos 3 caracteres');
      }
    });
  });

  describe('Invalid password', () => {
    it('should reject empty password', () => {
      const invalidData = {
        username: 'admin',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Contraseña debe tener al menos 4 caracteres');
      }
    });

    it('should reject password with less than 4 characters', () => {
      const invalidData = {
        username: 'admin',
        password: '123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Contraseña debe tener al menos 4 caracteres');
      }
    });
  });

  describe('Multiple validation errors', () => {
    it('should reject both empty username and password', () => {
      const invalidData = {
        username: '',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2);
      }
    });

    it('should reject both short username and password', () => {
      const invalidData = {
        username: 'ab',
        password: '123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2);
      }
    });
  });
});