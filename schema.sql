// =================
// schema.sql
// =================
/* filename=schema.sql */
-- Usuarios (solo admins por ahora)
create table if not exists users (
id integer primary key autoincrement,
email text not null unique,
password_hash text not null,
role text not null default 'admin',
created_at text not null default (datetime('now'))
);


-- Noticias
create table if not exists news (
id integer primary key autoincrement,
date text not null, -- ISO yyyy-mm-dd
title text not null,
url text,
tag text check(tag in ('release','acuerdo','aviso')) default 'release',
published integer default 1, -- 1 true, 0 false
created_at text not null default (datetime('now')),
updated_at text not null default (datetime('now'))
);


create trigger if not exists trg_news_updated
after update on news
begin
update news set updated_at = datetime('now') where id = NEW.id;
end;