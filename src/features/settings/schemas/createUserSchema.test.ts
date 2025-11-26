import { describe, it, expect } from 'vitest';
import { createUserSchema } from './createUserSchema';

describe('createUserSchema', () => {
  it('should validate a correct user payload', () => {
    const validUser = {
      full_name: 'John Doe',
      username: 'johndoe',
      password: 'password123',
      confirm_password: 'password123',
      role_id: 'role-123',
      is_active: true,
    };

    const result = createUserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should fail if passwords do not match', () => {
    const invalidUser = {
      full_name: 'John Doe',
      username: 'johndoe',
      password: 'password123',
      confirm_password: 'password456',
      role_id: 'role-123',
      is_active: true,
    };

    const result = createUserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Las contraseñas no coinciden');
    }
  });

  it('should fail if username contains invalid characters', () => {
    const invalidUser = {
      full_name: 'John Doe',
      username: 'John Doe', // Spaces and uppercase not allowed
      password: 'password123',
      confirm_password: 'password123',
      role_id: 'role-123',
      is_active: true,
    };

    const result = createUserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Solo letras minúsculas, números y guion bajo');
    }
  });

  it('should fail if password is too short', () => {
    const invalidUser = {
      full_name: 'John Doe',
      username: 'johndoe',
      password: '123',
      confirm_password: '123',
      role_id: 'role-123',
      is_active: true,
    };

    const result = createUserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Contraseña debe tener al menos 4 caracteres');
    }
  });

  it('should fail if required fields are missing', () => {
    const invalidUser = {
      // Missing full_name, username, etc.
      is_active: true,
    };

    const result = createUserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });
});
