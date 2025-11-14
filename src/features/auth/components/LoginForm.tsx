import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/stores/authStore';
import { AuthResponse } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema, type LoginFormData } from '../schemas/loginSchema';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const username = watch('username');
  const password = watch('password');
  const isFormFilled = username?.length > 0 && password?.length > 0;

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await invoke<AuthResponse>('authenticate_user', {
        username: data.username,
        password: data.password,
      });

      if (response.success && response.user) {
        login(response.user);
        onSuccess?.();
      } else {
        setError(response.message);
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      setError('Error al conectar con la base de datos. Intenta de nuevo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isValid && isFormFilled) {
      handleSubmit(onSubmit)();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Bienvenido</h1>
          <p className="mt-2 text-sm text-slate-600">
            Inicia sesión para continuar
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base">Usuario</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                {...register('username')}
                className={`rounded-xl ${
                  errors.username ? 'border-red-500' : ''
                }`}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                onKeyDown={handleKeyDown}
                className={`rounded-xl ${
                  errors.password ? 'border-red-500' : ''
                }`}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!isValid || !isFormFilled || isLoading}
            className="w-full rounded-xl bg-[#480489] hover:bg-[#480489]/90 text-base"
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </div>
      </div>
    </div>
  );
}
