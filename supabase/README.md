# تشغيل أكاديمية سُبُل بقاعدة بيانات حقيقية (Supabase)

بدون إعداد يعمل الموقع في وضع التجربة. الخطوات التالية تحوّله إلى موقع حقيقي بحسابات وبيانات مشتركة.

## 1) إنشاء المشروع
1. أنشئ مشروعًا في supabase.com.
2. من **SQL Editor** الصق محتوى `supabase/schema.sql` وشغّله مرة واحدة.

## 2) إنشاء المدير الأول (المالك)
1. من **Authentication > Users > Add user** أضف مستخدمًا (بريد وكلمة مرور)، وفعّل Auto Confirm.
2. من SQL Editor شغّل (بدّل البريد):
```sql
insert into public.profiles (id, app_id, role, name, username, email, auth_email, ref_id, active)
select id, 'u-admin', 'admin', 'المدير', 'admin', email, email, null, true
from auth.users where email = 'admin@example.com';
```
بعدها تدخل باسم المستخدم `admin` (أو بالبريد) وكلمة المرور اللي اخترتها.

## 3) نشر دالة إدارة الحسابات
```bash
npm i -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy admin-users
```
الدالة تستخدم مفتاح `service_role` تلقائيًا من داخل Supabase ولا يصل للمتصفح.
(اختياري) `supabase secrets set AUTH_EMAIL_DOMAIN=yourdomain.com` لتغيير نطاق البريد الداخلي.

## 4) تشغيل الموقع
```bash
cp .env.example .env     # ثم ضع القيمتين
pnpm install
pnpm dev                 # تجربة محلية
pnpm build               # الناتج في dist/
```
ارفع مجلد `dist/` على Netlify أو Vercel أو Cloudflare Pages، وضع المتغيّرين `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY` في إعدادات المنصة قبل البناء.
المفتاح `anon` عام بطبيعته؛ الحماية الفعلية من سياسات RLS في قاعدة البيانات.

## كيف تُنشأ الحسابات
المدير يضيف معلمًا/طالبًا/ولي أمر من التطبيق، فيظهر له اسم المستخدم وكلمة مرور عشوائية **مرة واحدة** يسلّمها لصاحب الحساب.
"إعادة تعيين" في الإعدادات > المستخدمون تنشئ كلمة مرور جديدة. التعطيل يمنع الدخول فورًا.

## الاختبارات
`pnpm exec vitest run` يشغّل المخطط على Postgres حقيقي (PGlite) ويتحقق أن كل دور يرى ويعدّل ما يخصه فقط.
