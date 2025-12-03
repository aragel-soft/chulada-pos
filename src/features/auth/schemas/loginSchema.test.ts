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

    it('should accept short username and password (1 char)', () => {
      const validData = {
        username: 'a',
        password: '1',
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
        expect(result.error.issues[0].message).toBe('El usuario es requerido');
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
        expect(result.error.issues[0].message).toBe('La contraseña es requerida');
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
  });
});