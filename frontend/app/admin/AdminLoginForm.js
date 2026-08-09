'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '@/lib/api';

const AdminLoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if both fields are filled
    setIsFormValid(username.trim() !== '' && password.trim() !== '');
  }, [username, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    setIsLoading(true);
    setError('');

    try {
      const data = await loginUser({
        username: username.trim(),
        password: password.trim()
      });
      console.log('Server Response:', data);

      // Store the JWT token in localStorage
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        console.log('Token stored in localStorage:', data.access_token);
      } else if (data.token) {
        localStorage.setItem('token', data.token);
        console.log('Token stored in localStorage:', data.token);
      }

      // If login is successful, redirect to admin dashboard
      router.push('/cpanel');
    } catch (error) {
      console.error('Login Error:', error);
      setError(error.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-8">
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="bg-blue-100 p-4 rounded-full">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-black">Campus Navigator Admin Login</h1>
          <p className="text-gray-500">Sign in to access the Control Panel</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-gray-700">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className={`w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg transition-all duration-200 ease-in-out transform ${
            isFormValid ? 'hover:bg-blue-700 hover:scale-[1.02]' : 'opacity-50 cursor-not-allowed'
          } focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Signing in...
            </div>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="text-center text-sm text-gray-500">
        <p>For security reasons, please contact the system administrator if you need access</p>
      </div>
    </div>
  );
};

export default AdminLoginForm; 