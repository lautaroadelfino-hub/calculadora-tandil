// ==========================
// app/admin/page.jsx
// ==========================
/* filename=app/admin/page.jsx */
"use client";
import React from 'react';


const empty = { date:"", title:"", url:"", tag:"release", published:true };


export default function Admin(){
const [user, setUser] = React.useState(null);
const [csrf, setCsrf] = React.useState('');
const [form, setForm] = React.useState(empty);
const [items, setItems] = React.useState([]);
const [loading, setLoading] = React.useState(true);


React.useEffect(()=>{
fetch('/api/auth/session').then(r=>r.json()).then(d=>{
if(d.user) { setUser(d.user); setCsrf(d.csrfToken); }
else window.location.href='/login';
});
load();
},[]);


const load = async()=>{
setLoading(true);
const r = await fetch('/api/news?limit=50', { cache:'no-store' });
setItems(await r.json());
setLoading(false);
};


const save = async(e)=>{
e.preventDefault();
const r = await fetch('/api/news', { method:'POST', headers:{ 'Content-Type':'application/json', 'x-csrf': csrf }, body: JSON.stringify({ ...form, date: form.date || undefined }) });
if(r.ok){ setForm(empty); load(); }
};


const del = async(id)=>{
if(!confirm('¿Eliminar?')) return;
const r = await fetch(`/api/news/${id}`, { method:'DELETE', headers:{ 'x-csrf': csrf } });
if(r.ok) load();
};


return (
<div className="max-w-3xl mx-auto p-6 space-y-6">
<header className="flex items-center justify-between">
<h1 className="text-xl font-semibold">Panel de noticias</h1>
<form method="post" action="/api/auth/logout"><button className="text-sm underline">Salir</button></form>
</header>


<form onSubmit={save} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 border rounded-xl bg-white/80">
<input type="date" value={form.date} onChange={(e)=>setForm({...form, date:e.target.value})} className="md:col-span-2 border rounded px-3 py-2"/>
}