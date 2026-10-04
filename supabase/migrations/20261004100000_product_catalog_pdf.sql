-- Catálogo PDF por producto: columna catalog_url + bucket público "product-catalogs" (solo PDF).

alter table public.products add column if not exists catalog_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-catalogs', 'product-catalogs', true, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = true,
      file_size_limit = 20971520,
      allowed_mime_types = array['application/pdf'];

drop policy if exists "Public read product-catalogs" on storage.objects;
create policy "Public read product-catalogs" on storage.objects
  for select using (bucket_id = 'product-catalogs');

drop policy if exists "Admin insert product-catalogs" on storage.objects;
create policy "Admin insert product-catalogs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-catalogs' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admin update product-catalogs" on storage.objects;
create policy "Admin update product-catalogs" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-catalogs' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admin delete product-catalogs" on storage.objects;
create policy "Admin delete product-catalogs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-catalogs' and public.has_role(auth.uid(), 'admin'));
