# تسليم الواجهة الأمامية: منصة أكاديمية سُبُل

ملف للمهندس اللي هيكمّل الباك إند. الواجهة جاهزة وشغّالة، والباك إند الحقيقي (حسابات وبيانات مشتركة) هو اللي ناقص.

## 1) التشغيل

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # الناتج في dist/
pnpm exec vitest run
```

بدون أي إعداد، التطبيق بيشتغل في **وضع التجربة**: البيانات في `localStorage` والمتصفح هو القاعدة.
حسابات التجربة (كلمة المرور `demo1234` للكل): `admin` و`teacher1` و`student1` و`parent1`.

التقنيات: React + Vite + Tailwind v4، واجهة عربية RTL، تنقّل بـ hash (`#/app/...`) من غير سيرفر، خط Cairo.

## 2) المعمارية في سطرين

```
الصفحات (src/pages) ──> store.js: act('اسم_الإجراء', ...args)
                          └─ engine.js : قواعد العمل، دوال بتعدّل نسخة من db في الذاكرة
                          └─ backend/  : اللي بيحفظ ويقرأ فعليًا  <-- هنا شغلك
```

- **`src/lib/engine.js`**: كل قواعد العمل (إضافة معلم/طالب، حفظ حصة، كشف التعارض، تسجيل حصة منتهية وإنشاء الواجب والتقرير والإشعارات، المدفوعات...). دوال نقية بتاخد `db` وبتعدّله.
- **`src/lib/calc.js`**: الحسابات (المستحقات، أرصدة الطلاب، الإشعارات لكل مستخدم).
- **`src/lib/store.js`**: بيحدّث الشاشة فورًا، وبعدها بيحفظ في الخلفية بالترتيب. لو الباك إند رفض التغيير، بيرجّع الشاشة لآخر حالة صحيحة وبيطلق حدث `subul:error`.
- **`src/lib/backend/index.js`**: بيختار الـ backend. دلوقتي: `local` (التجربة) أو `cloud` (Supabase) لو متغيّرات البيئة موجودة وقت البناء.

## 3) واجهة الـ backend (اللي لازم تنفّذها)

أي backend جديد هو ملف بيصدّر كائن بالدوال دي، وأمثلته الجاهزة `backend/local.js` و`backend/cloud.js`:

| الدالة | الوظيفة |
|---|---|
| `init()` | يرجّع `{ session }` للمستخدم المسجّل دخوله (أو null) |
| `load(session)` | يرجّع كائن `db` كامل بشكل البيانات في القسم 4، **مفلتر حسب صلاحيات المستخدم**. من غير جلسة يرجّع بيانات الموقع العام فقط (الإعدادات، المعلمين العامين، الإحصائيات) |
| `login(identifier, password, remember)` | الدخول باسم مستخدم أو إيميل. يرجّع الجلسة، ويرمي خطأ برسالة عربية لو البيانات غلط أو الحساب معطّل |
| `logout()` | خروج |
| `save(before, after, session)` | بيستلم الحالة قبل وبعد. التحويل لصفوف والـ diff موجودين جاهزين في `src/lib/rows.js` (`diffDb`)، فتقدر تستخدمه أو تبعت الـ diff لـ API |
| `createUsers(users)` | إنشاء حسابات دخول جديدة. يرجّع بيانات الدخول (اسم المستخدم وكلمة المرور) عشان تظهر للمدير مرة واحدة |
| `deleteUsers(appIds)` | حذف حسابات |
| `resetPassword(db, appId)` | كلمة مرور جديدة، ترجع للمدير |
| `sendMessage(m)` | رسالة نموذج التواصل من الموقع العام (من غير تسجيل دخول) |
| `subscribeExternal(cb)` | (اختياري) تحديثات حية من مستخدمين تانيين |

ملاحظة: `store.js` بيعمل polling خفيف في وضع cloud، فلو الـ API بتاعك مش realtime ده كفاية مبدئيًا.

## 4) نموذج البيانات

شكل كل مجموعة (أمثلة حقيقية من `src/lib/seed.js`). المعرّفات نصوص بادئتها نوع السجل.

| المجموعة | الحقول الأساسية |
|---|---|
| `settings` (سجل واحد) | `academyName, englishName, tagline, subTagline, phone, email, address, logo, currency, billing, billAbsent, payTeacherAbsent, defaultDuration, durations[], notifPrefs{}` |
| `subjects` (ثابتة في الكود) | `id, name, color` |
| `users` | `id, role (admin/teacher/student/parent), name, username, email, refId, active` |
| `teachers` | `id (T-…), name, gender, subjects[], experience, rate, bio, qualifications, phone, email, status` |
| `parents` | `id (P-…), name, phone, email, relation` |
| `students` | `id (S-…), name, gender, grade, parentId, fee, status, joined, notes, assignments[{subjectId, teacherId}]` |
| `lessons` | `id (L-…), teacherId, studentId, subjectId, date, start, end, type, status, notes, attendance, actualStart, actualEnd, actualMinutes, summary, homework, perfNote, recordedAt` |
| `homework` | `id (H-…), studentId, teacherId, subjectId, lessonId, title, dueDate, createdAt, status` |
| `reports` | `id (R-…), studentId, teacherId, subjectId, date, rating, text, lessonId` |
| `assessments` | `id (A-…), studentId, subjectId, title, score, max, date` |
| `payments` | `id (PAY-…), type (student/teacher), refId, amount, date, method, note, createdAt` |
| `notifications` | `id (N-…), userIds[], kind, title, body, at, link{type,id}, readBy[]` |
| `messages` | رسائل نموذج التواصل |

ملاحظات:
- ارتباط حساب الدخول بالسجل عن طريق `users.refId` (معلم/طالب/ولي أمر). المدير بدون `refId`. وإشعارات المدير بتروح لمعرّف `u-admin` (صندوق مشترك لكل المديرين).
- معرّفات الإشعارات للمستخدمين بالشكل `u-<refId>`.

## 5) الصلاحيات

- **مدير:** كل شيء.
- **معلم:** طلابه المسندين له وحصصه وواجباته وتقاريره ومستحقاته.
- **ولي أمر:** أبناؤه فقط (حصص، واجبات، تقارير، مدفوعات).
- **طالب:** بياناته هو فقط.
- **زائر (بدون دخول):** الإعدادات العامة وقائمة المعلمين العامة والإحصائيات وإرسال رسالة تواصل.

الواجهة بتخفي الصفحات حسب الدور، لكن **الإخفاء في الواجهة مش حماية**. الحماية الحقيقية لازم تتنفّذ على السيرفر. المرجع الكامل والمختبر للسياسات هو `supabase/schema.sql` (قسم RLS)، تقدر تنقل نفس القواعد لأي باك إند تاني.

## 6) نقطتين لازم تنتبه لهم

1. **قواعد العمل بتشتغل في المتصفح.** كشف تعارض المواعيد، وإنشاء الواجب والتقرير والإشعارات عند تسجيل حصة، وحساب المستحقات، كلها في `engine.js` و`calc.js`. أي عميل يقدر يتخطّاها. لو عايز أمان حقيقي لازم تعيد التحقق منها على السيرفر (أو في triggers/functions في قاعدة البيانات)، خصوصًا: التعارض، وصلاحية من يسجّل حصة لأي طالب، والمدفوعات.
2. **كلمات المرور.** `seed.js` فيه كلمة مرور تجريبية، وبتتستخدم في وضع التجربة بس. في الباك إند الحقيقي لازم تتخزّن مُشفّرة بواسطة نظام الهوية (مش في جدول `users` ولا في الواجهة).

## 7) مرجع جاهز: تنفيذ Supabase (اختياري)

فيه تنفيذ كامل في `supabase/`:
- `schema.sql`: الجداول والصلاحيات (RLS) والدوال، **متختبر على Postgres محلي (PGlite)** في `tests/cloud.test.js` (يتأكد إن كل دور بيشوف ويعدّل اللي يخصه فقط).
- `functions/admin-users/index.ts`: Edge Function لإنشاء الحسابات وحذفها وإعادة كلمة المرور (للمدير فقط).
- `src/lib/backend/cloud.js` و`src/lib/rows.js`: ربط الواجهة به.
- `supabase/README.md`: خطوات الإعداد.
- لتفعيله: انسخ `.env.example` إلى `.env` وضع `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY`.

**تحذير صريح:** اختبار القاعدة والصلاحيات تم محليًا فقط. التوصيل بمشروع Supabase حقيقي (تسجيل الدخول، الـ Edge Function، نشر الموقع) **لسه ما اتأكدش من تشغيله فعليًا**؛ ظهر خطأ تحميل عند أول تجربة ولم يُشخَّص بعد. لو هتستخدم Supabase ابدأ بتجربة الدخول بحساب المدير وتشخيص ده.

لو هتستخدم باك إند تاني (Node/Laravel/Django...) تجاهل مجلد `supabase/` وملف `cloud.js`، واكتب backend جديد بنفس واجهة القسم 3.

## 8) قائمة اللي ناقص (مقترح للأولوية)

1. باك إند حقيقي: هوية ودخول وتخزين وصلاحيات (القسمين 3 و5).
2. إعادة التحقق من قواعد العمل على السيرفر (القسم 6).
3. نسخ احتياطي لقاعدة البيانات، واستضافة بنطاق خاص.
4. غير موجود أصلًا في الواجهة: الدفع الإلكتروني، تطبيق موبايل، واتساب أو بريد تلقائي، رفع ملفات.
5. استبدال بيانات `settings` الافتراضية (رقم وبريد وعنوان تجريبيين) ببيانات الأكاديمية الحقيقية.
