-- =====================================================================
-- أكاديمية سُبُل - مخطط قاعدة البيانات (Supabase / PostgreSQL)
-- شغّل هذا الملف مرة واحدة في: Supabase Dashboard > SQL Editor
-- كل الجداول محمية بـ Row Level Security: كل مستخدم يرى ويعدّل فقط ما يخص دوره.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) الجداول
-- ---------------------------------------------------------------------

-- ملف المستخدم (واحد لكل حساب في auth.users). يُنشأ فقط عبر Edge Function أو سكربت المدير الأول.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  app_id      text not null unique,            -- المعرّف داخل التطبيق: u-admin / u-T-XXXX ...
  role        text not null check (role in ('admin', 'teacher', 'student', 'parent')),
  name        text not null,
  username    text not null,
  email       text,                            -- بريد التواصل (اختياري)
  auth_email  text not null,                   -- البريد المستخدم فعليًا في تسجيل الدخول
  ref_id      text,                            -- رقم المعلم/الطالب/ولي الأمر
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

create table if not exists public.settings (
  id    int primary key default 1 check (id = 1),
  data  jsonb not null default '{}'::jsonb
);
insert into public.settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

create table if not exists public.teachers (
  id             text primary key,
  name           text not null,
  gender         text not null default 'm',
  subjects       text[] not null default '{}',
  experience     int not null default 0,
  rate           numeric not null default 0,   -- أجر الساعة (خاص)
  bio            text not null default '',
  qualifications text not null default '',
  phone          text not null default '',
  email          text not null default '',
  status         text not null default 'active'
);

create table if not exists public.parents (
  id        text primary key,
  name      text not null,
  phone     text not null default '',
  email     text not null default '',
  relation  text not null default 'الأب'
);

create table if not exists public.students (
  id         text primary key,
  name       text not null,
  gender     text not null default 'm',
  grade      text not null,
  parent_id  text not null references public.parents (id),
  fee        numeric not null default 0,
  status     text not null default 'active',
  joined     date not null default current_date,
  notes      text not null default ''
);

create table if not exists public.assignments (
  student_id  text not null references public.students (id) on delete cascade,
  subject_id  text not null,
  teacher_id  text not null references public.teachers (id) on delete cascade,
  primary key (student_id, subject_id, teacher_id)
);

create table if not exists public.lessons (
  id             text primary key,
  teacher_id     text not null references public.teachers (id) on delete cascade,
  student_id     text not null references public.students (id) on delete cascade,
  subject_id     text not null,
  lesson_date    date not null,
  start_time     text not null,
  end_time       text not null,
  type           text not null default 'inperson',
  status         text not null default 'upcoming',
  notes          text not null default '',
  attendance     text,
  actual_start   text,
  actual_end     text,
  actual_minutes int,
  summary        text not null default '',
  homework       text not null default '',
  perf_note      text not null default '',
  recorded_at    timestamptz
);
create index if not exists lessons_date on public.lessons (lesson_date);
create index if not exists lessons_teacher on public.lessons (teacher_id);
create index if not exists lessons_student on public.lessons (student_id);

create table if not exists public.homework (
  id          text primary key,
  student_id  text not null references public.students (id) on delete cascade,
  teacher_id  text not null references public.teachers (id) on delete cascade,
  subject_id  text not null,
  lesson_id   text references public.lessons (id) on delete cascade,
  title       text not null,
  due_date    date not null,
  created_on  date not null default current_date,
  status      text not null default 'pending'
);

create table if not exists public.reports (
  id          text primary key,
  student_id  text not null references public.students (id) on delete cascade,
  teacher_id  text not null references public.teachers (id) on delete cascade,
  subject_id  text not null,
  lesson_id   text references public.lessons (id) on delete set null,
  report_date date not null default current_date,
  rating      int not null default 4,
  text        text not null
);

create table if not exists public.assessments (
  id          text primary key,
  student_id  text not null references public.students (id) on delete cascade,
  subject_id  text not null,
  title       text not null,
  score       numeric not null,
  max         numeric not null default 100,
  taken_on    date not null
);

create table if not exists public.payments (
  id          text primary key,
  type        text not null check (type in ('student', 'teacher')),
  ref_id      text not null,
  amount      numeric not null check (amount > 0),
  pay_date    date not null,
  method      text not null,
  note        text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists payments_ref on public.payments (type, ref_id);

create table if not exists public.notifications (
  id    text primary key,
  kind  text not null,
  title text not null,
  body  text not null default '',
  at    timestamptz not null default now(),
  link  jsonb
);
create table if not exists public.notification_recipients (
  notification_id text not null references public.notifications (id) on delete cascade,
  recipient       text not null,               -- app_id، أو u-admin لكل المديرين
  primary key (notification_id, recipient)
);
create table if not exists public.notification_reads (
  notification_id text not null references public.notifications (id) on delete cascade,
  user_id         text not null,
  primary key (notification_id, user_id)
);

create table if not exists public.messages (
  id       text primary key default ('M-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
  name     text not null,
  phone    text not null default '',
  email    text not null default '',
  message  text not null,
  at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) دوال مساعدة للصلاحيات (security definer لتجنب التكرار اللانهائي في RLS)
-- ---------------------------------------------------------------------
create or replace function public.app_uid() returns text
language sql stable security definer set search_path = public as
$$ select app_id from public.profiles where id = auth.uid() and active $$;

create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() and active $$;

create or replace function public.app_ref() returns text
language sql stable security definer set search_path = public as
$$ select ref_id from public.profiles where id = auth.uid() and active $$;

create or replace function public.can_see_student(sid text) returns boolean
language sql stable security definer set search_path = public as
$$
  select case public.app_role()
    when 'admin'   then true
    when 'teacher' then exists (select 1 from public.assignments a where a.student_id = sid and a.teacher_id = public.app_ref())
    when 'parent'  then exists (select 1 from public.students s where s.id = sid and s.parent_id = public.app_ref())
    when 'student' then sid = public.app_ref()
    else false
  end
$$;

create or replace function public.can_see_parent(pid text) returns boolean
language sql stable security definer set search_path = public as
$$
  select case public.app_role()
    when 'admin'   then true
    when 'parent'  then pid = public.app_ref()
    when 'student' then exists (select 1 from public.students s where s.id = public.app_ref() and s.parent_id = pid)
    when 'teacher' then exists (
      select 1 from public.students s join public.assignments a on a.student_id = s.id
      where s.parent_id = pid and a.teacher_id = public.app_ref())
    else false
  end
$$;

create or replace function public.can_see_notification(nid text) returns boolean
language sql stable security definer set search_path = public as
$$
  select exists (
    select 1 from public.notification_recipients r
    where r.notification_id = nid
      and (r.recipient = public.app_uid() or (r.recipient = 'u-admin' and public.app_role() = 'admin'))
  )
$$;

-- ---------------------------------------------------------------------
-- 3) عرض عام للمعلمين (بدون الأجر ولا بيانات التواصل) + إحصاءات الصفحة الرئيسية
-- ---------------------------------------------------------------------
create or replace view public.teachers_public as
  select id, name, gender, subjects, experience, bio, qualifications, status from public.teachers;

create or replace function public.public_stats() returns jsonb
language sql stable security definer set search_path = public as
$$
  select jsonb_build_object(
    'students', (select count(*) from public.students),
    'teachers', (select count(*) from public.teachers),
    'lessons',  (select count(*) from public.lessons where status = 'completed'),
    'hours',    (select round(coalesce(sum(actual_minutes), 0) / 60.0) from public.lessons where status = 'completed'))
$$;

-- تحويل اسم المستخدم/البريد إلى بريد الدخول الفعلي (يُستدعى قبل signInWithPassword)
create or replace function public.resolve_login(ident text) returns text
language plpgsql stable security definer set search_path = public as
$$
declare r text; n int;
begin
  ident := lower(trim(ident));
  select auth_email into r from public.profiles
    where active and (lower(username) = ident or lower(auth_email) = ident) limit 1;
  if r is not null then return r; end if;
  select count(*), min(auth_email) into n, r from public.profiles where active and lower(email) = ident;
  if n = 1 then return r; end if;
  return null;
end
$$;

-- ---------------------------------------------------------------------
-- 4) تفعيل RLS وكتابة السياسات
-- ---------------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.settings                enable row level security;
alter table public.teachers                enable row level security;
alter table public.parents                 enable row level security;
alter table public.students                enable row level security;
alter table public.assignments             enable row level security;
alter table public.lessons                 enable row level security;
alter table public.homework                enable row level security;
alter table public.reports                 enable row level security;
alter table public.assessments             enable row level security;
alter table public.payments                enable row level security;
alter table public.notifications           enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.notification_reads      enable row level security;
alter table public.messages                enable row level security;

-- profiles: كل مستخدم يرى حسابه، والمدير يرى الجميع ويعدّل الاسم والحالة
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.app_role() = 'admin');
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- settings: قراءة للجميع (اسم الأكاديمية وبيانات التواصل)، تعديل للمدير
create policy settings_select on public.settings for select to anon, authenticated using (true);
create policy settings_admin_write on public.settings for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- teachers: الجدول الكامل للمدير، والمعلم يرى صفّه فقط (الباقي عبر teachers_public)
create policy teachers_select on public.teachers for select to authenticated
  using (public.app_role() = 'admin' or (public.app_role() = 'teacher' and id = public.app_ref()));
create policy teachers_admin_write on public.teachers for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- parents
create policy parents_select on public.parents for select to authenticated using (public.can_see_parent(id));
create policy parents_admin_write on public.parents for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- students
create policy students_select on public.students for select to authenticated using (public.can_see_student(id));
create policy students_admin_write on public.students for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- assignments
create policy assignments_select on public.assignments for select to authenticated using (public.can_see_student(student_id));
create policy assignments_admin_write on public.assignments for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- lessons: المدير الكل، المعلم حصصه، الطالب/ولي الأمر حصص الطالب
create policy lessons_select on public.lessons for select to authenticated
  using (public.app_role() = 'admin'
      or (public.app_role() = 'teacher' and teacher_id = public.app_ref())
      or (public.app_role() in ('student', 'parent') and public.can_see_student(student_id)));
create policy lessons_admin_write on public.lessons for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy lessons_teacher_insert on public.lessons for insert to authenticated
  with check (public.app_role() = 'teacher' and teacher_id = public.app_ref() and public.can_see_student(student_id));
create policy lessons_teacher_update on public.lessons for update to authenticated
  using (public.app_role() = 'teacher' and teacher_id = public.app_ref())
  with check (public.app_role() = 'teacher' and teacher_id = public.app_ref() and public.can_see_student(student_id));
create policy lessons_teacher_delete on public.lessons for delete to authenticated
  using (public.app_role() = 'teacher' and teacher_id = public.app_ref());

-- homework
create policy homework_select on public.homework for select to authenticated
  using (public.app_role() = 'admin'
      or (public.app_role() = 'teacher' and teacher_id = public.app_ref())
      or (public.app_role() in ('student', 'parent') and public.can_see_student(student_id)));
create policy homework_admin_write on public.homework for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy homework_teacher_write on public.homework for all to authenticated
  using (public.app_role() = 'teacher' and teacher_id = public.app_ref())
  with check (public.app_role() = 'teacher' and teacher_id = public.app_ref() and public.can_see_student(student_id));
create policy homework_student_submit on public.homework for update to authenticated
  using (public.app_role() = 'student' and student_id = public.app_ref())
  with check (public.app_role() = 'student' and student_id = public.app_ref());

create or replace function public.homework_student_guard() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if public.app_role() = 'student' then
    if (to_jsonb(new) - 'status') <> (to_jsonb(old) - 'status') or new.status <> 'submitted' or old.status <> 'pending' then
      raise exception 'الطالب يستطيع فقط تسليم واجب معلّق';
    end if;
  end if;
  return new;
end
$$;
drop trigger if exists homework_student_guard on public.homework;
create trigger homework_student_guard before update on public.homework
  for each row execute function public.homework_student_guard();

-- reports
create policy reports_select on public.reports for select to authenticated
  using (public.app_role() = 'admin'
      or (public.app_role() = 'teacher' and teacher_id = public.app_ref())
      or (public.app_role() in ('student', 'parent') and public.can_see_student(student_id)));
create policy reports_admin_write on public.reports for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy reports_teacher_write on public.reports for all to authenticated
  using (public.app_role() = 'teacher' and teacher_id = public.app_ref())
  with check (public.app_role() = 'teacher' and teacher_id = public.app_ref() and public.can_see_student(student_id));

-- assessments
create policy assessments_select on public.assessments for select to authenticated using (public.can_see_student(student_id));
create policy assessments_admin_write on public.assessments for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- payments: المدير الكل، المعلم دفعاته، ولي الأمر/الطالب دفعات الطالب
create policy payments_select on public.payments for select to authenticated
  using (public.app_role() = 'admin'
      or (type = 'teacher' and public.app_role() = 'teacher' and ref_id = public.app_ref())
      or (type = 'student' and public.app_role() in ('student', 'parent') and public.can_see_student(ref_id)));
create policy payments_admin_write on public.payments for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- notifications
create policy notifications_select on public.notifications for select to authenticated using (public.can_see_notification(id));
create policy notifications_insert on public.notifications for insert to authenticated with check (public.app_uid() is not null);
create policy recipients_select on public.notification_recipients for select to authenticated using (public.can_see_notification(notification_id));
create policy recipients_insert on public.notification_recipients for insert to authenticated with check (public.app_uid() is not null);
create policy reads_select on public.notification_reads for select to authenticated using (user_id = public.app_uid());
create policy reads_insert on public.notification_reads for insert to authenticated
  with check (user_id = public.app_uid() and public.can_see_notification(notification_id));

-- messages (نموذج التواصل في الموقع): أي زائر يرسل، المدير فقط يقرأ
create policy messages_insert on public.messages for insert to anon, authenticated
  with check (char_length(name) between 2 and 120 and char_length(message) between 5 and 3000 and char_length(phone) <= 40 and char_length(email) <= 200);
create policy messages_admin_select on public.messages for select to authenticated using (public.app_role() = 'admin');
create policy messages_admin_delete on public.messages for delete to authenticated using (public.app_role() = 'admin');

-- إشعار تلقائي للمدير عند وصول رسالة جديدة
create or replace function public.notify_admin_message() returns trigger
language plpgsql security definer set search_path = public as
$$
declare nid text := 'N-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
begin
  insert into public.notifications (id, kind, title, body, link)
    values (nid, 'message', 'رسالة جديدة من الموقع', new.name || ': ' || left(new.message, 80), '{"type":"settings"}'::jsonb);
  insert into public.notification_recipients (notification_id, recipient) values (nid, 'u-admin');
  return new;
end
$$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_admin_message();

-- ---------------------------------------------------------------------
-- ملاحظة: لا نستخدم ON CONFLICT مع جداول الإشعارات لأن Postgres يتحقق عندها من سياسة القراءة أيضًا.
-- 5) حفظ التغييرات دفعة واحدة (ذرّيًا) مع احترام RLS
--    التطبيق يرسل {الجدول: {upsert:[...], delete:[...]}} في استدعاء واحد.
-- ---------------------------------------------------------------------
create or replace function public._upsert(t text, rows jsonb) returns void
language plpgsql set search_path = public as
$$
declare cols text; sets text; n_upd int; n_ins int;
begin
  if rows is null or jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) = 0 then return; end if;
  select string_agg(quote_ident(attname), ',' order by attnum),
         string_agg(format('%1$I = r.%1$I', attname), ',' order by attnum) filter (where attname <> 'id')
    into cols, sets
    from pg_attribute
    where attrelid = ('public.' || quote_ident(t))::regclass and attnum > 0 and not attisdropped;
  -- نحدّث الموجود ثم نُدخل الجديد (بدون INSERT ... ON CONFLICT حتى لا يُشترط على كل دور سياسة إدخال)
  execute format(
    'update public.%1$I t set %3$s from jsonb_populate_recordset(null::public.%1$I, $1) r where t.id = r.id',
    t, cols, sets) using rows;
  get diagnostics n_upd = row_count;
  execute format(
    'insert into public.%1$I (%2$s) select %2$s from jsonb_populate_recordset(null::public.%1$I, $1) r where not exists (select 1 from public.%1$I t where t.id = r.id)',
    t, cols) using rows;
  get diagnostics n_ins = row_count;
  -- RLS يتجاهل بصمت التحديثات غير المسموحة، فنحوّلها إلى خطأ صريح
  if n_upd + n_ins <> jsonb_array_length(rows) then
    raise exception 'غير مسموح بتعديل بعض السجلات في %', t using errcode = '42501';
  end if;
end
$$;

create or replace function public._delete(t text, ids jsonb) returns void
language plpgsql set search_path = public as
$$
declare n int;
begin
  if ids is null or jsonb_typeof(ids) <> 'array' or jsonb_array_length(ids) = 0 then return; end if;
  execute format('delete from public.%I where id in (select jsonb_array_elements_text($1))', t) using ids;
  get diagnostics n = row_count;
  if n < jsonb_array_length(ids) then
    -- بعض المعرّفات ربما حُذفت بالتتابع (cascade) فلا نعتبر النقص خطأً إلا إذا بقي سجل فعلًا
    execute format('select count(*) from public.%I where id in (select jsonb_array_elements_text($1))', t) into n using ids;
    if n > 0 then raise exception 'غير مسموح بحذف بعض السجلات في %', t using errcode = '42501'; end if;
  end if;
end
$$;

create or replace function public.apply_changes(p jsonb) returns void
language plpgsql set search_path = public as
$$
declare r jsonb; n jsonb;
begin
  if public.app_uid() is null then raise exception 'غير مسموح'; end if;

  if p ? 'settings' then
    insert into public.settings (id, data) values (1, p->'settings')
      on conflict (id) do update set data = excluded.data;
  end if;

  perform public._upsert('parents',     p->'parents'->'upsert');
  perform public._upsert('teachers',    p->'teachers'->'upsert');
  perform public._upsert('students',    p->'students'->'upsert');
  for r in select * from jsonb_array_elements(coalesce(p->'students'->'upsert', '[]'::jsonb)) loop
    delete from public.assignments where student_id = r->>'id';
    insert into public.assignments (student_id, subject_id, teacher_id)
      select r->>'id', a->>'subject_id', a->>'teacher_id'
      from jsonb_array_elements(coalesce(r->'assignments', '[]'::jsonb)) a
      on conflict do nothing;
  end loop;
  perform public._upsert('lessons',     p->'lessons'->'upsert');
  perform public._upsert('homework',    p->'homework'->'upsert');
  perform public._upsert('reports',     p->'reports'->'upsert');
  perform public._upsert('assessments', p->'assessments'->'upsert');
  perform public._upsert('payments',    p->'payments'->'upsert');

  for n in select * from jsonb_array_elements(coalesce(p->'notifications', '[]'::jsonb)) loop
    insert into public.notifications (id, kind, title, body, at, link)
      values (n->>'id', n->>'kind', n->>'title', coalesce(n->>'body', ''), coalesce((n->>'at')::timestamptz, now()), n->'link');
    insert into public.notification_recipients (notification_id, recipient)
      select distinct n->>'id', x from jsonb_array_elements_text(coalesce(n->'recipients', '[]'::jsonb)) x;
  end loop;

  insert into public.notification_reads (notification_id, user_id)
    select x, public.app_uid() from jsonb_array_elements_text(coalesce(p->'reads', '[]'::jsonb)) x
    on conflict do nothing;

  update public.profiles pr
     set name = u->>'name', active = (u->>'active')::boolean
    from jsonb_array_elements(coalesce(p->'profiles', '[]'::jsonb)) u
   where pr.app_id = u->>'app_id';

  -- الحذف أخيرًا بترتيب عكسي
  perform public._delete('payments',    p->'payments'->'delete');
  perform public._delete('assessments', p->'assessments'->'delete');
  perform public._delete('reports',     p->'reports'->'delete');
  perform public._delete('homework',    p->'homework'->'delete');
  perform public._delete('lessons',     p->'lessons'->'delete');
  perform public._delete('students',    p->'students'->'delete');
  perform public._delete('teachers',    p->'teachers'->'delete');
  perform public._delete('parents',     p->'parents'->'delete');
  perform public._delete('messages',    p->'messages'->'delete');
end
$$;

-- ---------------------------------------------------------------------
-- 6) الصلاحيات على مستوى الجداول (RLS يقيّد الصفوف فوقها)
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.settings, public.teachers_public to anon;
grant insert on public.messages to anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.settings, public.teachers, public.parents, public.students, public.assignments,
  public.lessons, public.homework, public.reports, public.assessments, public.payments,
  public.messages to authenticated;
grant select on public.teachers_public to authenticated;
grant select, insert on public.notifications, public.notification_recipients, public.notification_reads to authenticated;

grant execute on function public.public_stats(), public.resolve_login(text) to anon, authenticated;
grant execute on function public.apply_changes(jsonb), public._upsert(text, jsonb), public._delete(text, jsonb) to authenticated;
grant execute on function public.app_uid(), public.app_role(), public.app_ref(),
  public.can_see_student(text), public.can_see_parent(text), public.can_see_notification(text) to anon, authenticated;
