// ==========================
// app/login/page.jsx
// ==========================
"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault(); 
    setMsg('');
    
    try {
      // 1. Le pasamos el mail y la contraseña directamente a los servidores de Firebase
      await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Si las credenciales son correctas, Firebase guarda la sesión y te manda al panel
      router.push('/admin'); 

    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      // Firebase devuelve distintos errores (mail no existe, contraseña mal, etc)
      setMsg('Credenciales inválidas. Revisá tu email y contraseña.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Acceso Administrador</h1>
        
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="admin@ejemplo.com"
              type="email"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input 
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-slate-900 hover:bg-black text-white font-bold rounded-lg py-3 transition-colors mt-4"
          >
            Ingresar al Panel
          </button>
          
          {msg && (
            <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg text-center mt-4 border border-red-100">
              {msg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}