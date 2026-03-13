import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/stores/authStore';
import { AuthResponse } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema, type LoginFormData } from '../schemas/loginSchema';
import { User2, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  
  const [usernames, setUsernames] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  // Fetch real users from backend
  useEffect(() => {
    const fetchUsers = async () => {
      setIsFetchingUsers(true);
      try {
        const names = await invoke<string[]>('get_active_usernames');
        setUsernames(names);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setIsFetchingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // Filter results
  const filteredUsers = useMemo(() => {
    if (searchTerm.length < 2) return [];
    return usernames.filter((name) =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, usernames]);

  useEffect(() => {
    setHighlightedIndex(0);
    setShowResults(searchTerm.length >= 2 && !selectedUser);
  }, [searchTerm, selectedUser]);

  const handleSelectUser = (username: string) => {
    setSelectedUser(username);
    setValue('username', username);
    setSearchTerm(username);
    setShowResults(false);
    
    // Focus password with small delay for transition
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 150);
  };

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
        setError(response.message || 'Credenciales incorrectas');
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      setError('Error al conectar con la base de datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      if (showResults && filteredUsers.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredUsers.length);
      }
    } else if (e.key === 'ArrowUp') {
      if (showResults && filteredUsers.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
      }
    } else if (e.key === 'Enter') {
      if (showResults && filteredUsers.length > 0) {
        e.preventDefault();
        handleSelectUser(filteredUsers[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
      if (selectedUser) {
        setSelectedUser(null);
        setSearchTerm('');
        setValue('username', '');
        searchInputRef.current?.focus();
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-[12px] shadow-sm border border-slate-100 p-8">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm p-4">
            <img src="/logo-icon.svg" alt="ChuladaPOS Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ChuladaPOS</h1>
          <p className="text-slate-500 mt-2 font-medium">Ingresa para gestionar tu negocio</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Campo de Búsqueda de Usuario */}
          <div className="space-y-2 relative">
            <Label htmlFor="search" className="text-sm font-semibold text-slate-700">Usuario</Label>
            <div className="relative group">
              <Input
                id="search"
                ref={searchInputRef}
                type="text"
                placeholder="Busca tu usuario..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (selectedUser) setSelectedUser(null);
                }}
                onKeyDown={handleKeyDown}
                className={cn(
                  "pl-10 h-13 rounded-[12px] border-slate-200 focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20 transition-all text-lg",
                  selectedUser && "bg-slate-50 font-medium border-[#8B5CF6]/30"
                )}
                autoComplete="off"
              />
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                searchTerm.length >= 2 ? "text-[#8B5CF6]" : "text-slate-400"
              )} />
              {isFetchingUsers && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
              )}
            </div>

            {/* Lista de Resultados estilo premium */}
            {showResults && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-[12px] shadow-xl max-h-64 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
                {filteredUsers.length > 0 ? (
                  <div className="p-2">
                    {filteredUsers.map((name, index) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSelectUser(name)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-[10px] flex items-center gap-3 transition-colors",
                          highlightedIndex === index ? "bg-[#8B5CF6]/10 text-[#8B5CF6]" : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <User2 className="w-4 h-4 opacity-50" />
                        <span className="font-semibold">{name}</span>
                      </button>
                    ))}
                  </div>
                ) : searchTerm.length >= 2 && (
                  <div className="p-6 text-center">
                    <p className="text-sm text-slate-500 mb-3">No se encontró el usuario</p>
                    <button 
                      type="button"
                      className="text-[#8B5CF6] text-sm font-bold hover:underline bg-[#8B5CF6]/5 px-4 py-2 rounded-full transition-all"
                      onClick={() => {
                        setSelectedUser(searchTerm);
                        setValue('username', searchTerm);
                        setTimeout(() => passwordInputRef.current?.focus(), 150);
                      }}
                    >
                      Usar usuario manual
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Campo de Contraseña con Transición Suave */}
          <div className={cn(
            "space-y-2 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
            selectedUser 
              ? "max-h-32 opacity-100 transform translate-y-0 visible" 
              : "max-h-0 opacity-0 transform -translate-y-4 invisible pointer-events-none"
          )}>
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Contraseña</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              ref={(e) => {
                const { ref } = register('password');
                ref(e);
                passwordInputRef.current = e;
              }}
              placeholder="••••••••"
              className="h-13 rounded-[12px] border-slate-200 focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20 text-lg"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-[12px] animate-in shake-200">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !selectedUser}
            className={cn(
              "w-full h-14 rounded-[12px] text-white font-bold transition-all duration-300 text-lg mt-4",
              selectedUser 
                ? "bg-[#480489] hover:bg-[#3d037a] shadow-lg shadow-[#480489]/20 transform hover:-translate-y-0.5" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Autenticando...</span>
              </div>
            ) : (
              'Entrar al Sistema'
            )}
          </Button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Argael Soft © {new Date().getFullYear()} - v{import.meta.env.VITE_APP_VERSION || '0.1.3'}
          </p>
        </div>
      </div>
    </div>
  );
}
