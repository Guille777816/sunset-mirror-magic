-- Agrega slugs legibles a productos (SEO): reemplaza /producto/{uuid} por /producto/{nombre-del-producto}

create extension if not exists unaccent;

alter table public.products add column if not exists slug text;

-- Función que genera un slug "limpio" a partir de marca + modelo + medida
create or replace function public.generate_product_slug(p_brand text, p_model text, p_size text)
returns text
language plpgsql
immutable
as $$
declare
  base text;
begin
  base := lower(unaccent(coalesce(p_brand, '') || '-' || coalesce(p_model, '') || '-' || coalesce(p_size, '')));
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  if base = '' then
    base := 'producto';
  end if;
  return base;
end;
$$;

-- Backfill de productos existentes, resolviendo colisiones con un sufijo numérico
with base as (
  select id, public.generate_product_slug(brand, model, size) as base_slug
  from public.products
),
numbered as (
  select id, base_slug,
    row_number() over (partition by base_slug order by id) as rn
  from base
)
update public.products p
set slug = case when n.rn = 1 then n.base_slug else n.base_slug || '-' || n.rn end
from numbered n
where p.id = n.id;

alter table public.products alter column slug set not null;
alter table public.products add constraint products_slug_key unique (slug);
create index if not exists products_slug_idx on public.products (slug);

-- Trigger: genera/regenera el slug automáticamente al crear o editar un producto
create or replace function public.set_product_slug()
returns trigger
language plpgsql
as $$
declare
  candidate text;
  final_slug text;
  counter int := 1;
begin
  if new.slug is null
     or (tg_op = 'UPDATE' and (new.brand is distinct from old.brand or new.model is distinct from old.model or new.size is distinct from old.size)) then
    candidate := public.generate_product_slug(new.brand, new.model, new.size);
    final_slug := candidate;
    while exists (select 1 from public.products where slug = final_slug and id is distinct from new.id) loop
      counter := counter + 1;
      final_slug := candidate || '-' || counter;
    end loop;
    new.slug := final_slug;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_product_slug on public.products;
create trigger trg_set_product_slug
before insert or update on public.products
for each row
execute function public.set_product_slug();
