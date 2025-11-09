// ==========================
// app/login/page.jsx
// ==========================
/* filename=app/login/page.jsx */
"use client";
import React from 'react';


export default function Login(){
const [email, setEmail] = React.useState('');
const [password, setPassword] = React.useState('');
const [msg, setMsg] = React.useState('');


const submit = async (e)=>{
e.preventDefault(); setMsg('');
const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
if(r.ok) window.location.href = '/admin'; else setMsg('Credenciales inválidas');
};


return (
<div className="max-w-sm mx-auto p-6">
<h1 className="text-xl font-semibold">Ingresar</h1>
<form onSubmit={submit} className="mt-4 space-y-2">
<input className="w-full border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/>
<input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña"/>
<button className="w-full bg-slate-800 text-white rounded py-2">Entrar</button>
{msg && <p className="text-sm mt-2 text-rose-700">{msg}</p>}
</form>
</div>
);
}