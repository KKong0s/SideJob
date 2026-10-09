#!/usr/bin/env node
/**
 * Prints SQL for the demo data (shops, jobs, seekers, applications, reviews, reports, notifications).
 * Dates are computed from today (Asia/Bangkok) so the demo always looks fresh.
 * Run through database/demo/seed-demo.sh, which removes old demo data first.
 *
 * Every demo account uses the password Demo@1234; emails end with @demo.sidejob.local.
 */
const PASSWORD_HASH = '$2b$10$hcfLUWPUfDi5eUT61zSDSexr4UCgKhCr4srEcUKTs9k5DKvHvZ5AG'; // Demo@1234
const DOMAIN = 'demo.sidejob.local';

// --- date helpers (Bangkok) --------------------------------------------------
const DAY = 86400000;
const nowBkk = () => new Date(Date.now() + 7 * 3600 * 1000);
const iso = (d) => d.toISOString().slice(0, 10);
const day = (offset) => iso(new Date(nowBkk().getTime() + offset * DAY));
const stamp = (hoursAgo) => new Date(nowBkk().getTime() - hoursAgo * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
function weekdaysBetween(a, b) {
  const set = new Set();
  for (let d = new Date(a + 'T00:00:00Z'), i = 0; d <= new Date(b + 'T00:00:00Z') && i < 7; d = new Date(d.getTime() + DAY), i++) {
    set.add(WEEKDAYS[(d.getUTCDay() + 6) % 7]);
  }
  return WEEKDAYS.filter((w) => set.has(w)).join(',');
}

const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`);
const out = [];
const sql = (s) => out.push(s);

// --- shops -------------------------------------------------------------------
// [key, shop name, description, address, province, district, phone, verify status, reject reason]
const shops = [
  ['s01', 'คาเฟ่ใบชา สยาม', 'คาเฟ่ชาและขนมโฮมเมด ใกล้ BTS สยาม บรรยากาศเป็นกันเอง', '99/1 ซอยสยามสแควร์ 3 แขวงปทุมวัน', 1, 1007, '021234501', 'verified'],
  ['s02', 'ข้าวมันไก่เฮียเล้ง', 'ร้านข้าวมันไก่เจ้าดังย่านบางรัก เปิดมากว่า 30 ปี', '45 ถนนเจริญกรุง แขวงบางรัก', 1, 1004, '021234502', 'verified'],
  ['s03', 'มินิมาร์ทสุขใจ', 'ร้านสะดวกซื้อ 24 ชั่วโมง ใกล้ตลาดบางกะปิ', '200 ถนนลาดพร้าว แขวงคลองจั่น', 1, 1006, '021234503', 'verified'],
  ['s04', 'บ้านกาแฟดอยช้าง นิมมาน', 'ร้านกาแฟคั่วเองจากดอยช้าง สาขานิมมานเหมินท์', '12 ถนนนิมมานเหมินท์ ซอย 9', 38, 5001, '053123404', 'verified'],
  ['s05', 'ล้านนา อีเวนต์ แอนด์ ออแกไนซ์', 'รับจัดงานอีเวนต์ งานแต่ง งานบูธ ทั่วเชียงใหม่', '88 ถนนห้วยแก้ว', 38, 5001, '053123405', 'verified'],
  ['s06', 'กะตะ บีช รีสอร์ท', 'รีสอร์ทริมหาดกะตะ 60 ห้อง', '5 ถนนกะตะ ตำบลกะรน', 66, 8302, '076123406', 'verified'],
  ['s07', 'ขอนแก่น เอ็กซ์เพรส โลจิสติกส์', 'คลังสินค้าและบริการขนส่งพัสดุภาคอีสาน', '333 ถนนมิตรภาพ', 28, 4001, '043123407', 'verified'],
  ['s08', 'บางละมุง ซีฟู้ด', 'ร้านอาหารทะเลสดริมทะเล ใกล้พัทยาเหนือ', '19 ถนนเลียบชายหาด', 11, 2004, '038123408', 'verified'],
  ['s09', 'หาดใหญ่ สมาร์ท ติวเตอร์', 'สถาบันกวดวิชา ม.ต้น–ม.ปลาย', '7 ถนนนิพัทธ์อุทิศ 3', 70, 9011, '074123409', 'verified'],
  ['s10', 'โคราช คลีน แอนด์ แคร์', 'บริการทำความสะอาดบ้าน คอนโด และสำนักงาน', '50 ถนนมิตรภาพ', 19, 3001, '044123410', 'verified'],
  ['s11', 'เบเกอรี่บ้านนนท์', 'ขนมปังและเค้กอบสดทุกวัน', '9 ถนนรัตนาธิเบศร์', 3, 1201, '025123411', 'pending'],
  ['s12', 'สมุย ไดฟ์ ช็อป', 'ร้านอุปกรณ์ดำน้ำและทัวร์ดำน้ำเกาะเต่า', '21 หาดเฉวง', 67, 8404, '077123412', 'pending'],
  ['s13', 'อุดร แฟชั่นมอลล์', 'ร้านเสื้อผ้าแฟชั่นในห้าง', '1 ถนนประจักษ์ศิลปาคม', 29, 4101, '042123413', 'rejected', 'เอกสารไม่ชัด กรุณาส่งหนังสือรับรองบริษัทฉบับล่าสุด'],
  ['s14', 'ร้านน้ำปั่นแม่ริม', 'ร้านน้ำผลไม้ปั่นริมทาง', '4 ถนนเชียงใหม่-ฝาง', 38, 5007, '053123414', 'unsubmitted'],
];

// --- seekers -----------------------------------------------------------------
// [key, full name, birth date, phone, skills, bio, areas [[province, district|null]]]
const seekers = [
  ['p01', 'สมชาย ใจดี', '2001-04-12', '0811111101', 'ชงกาแฟ, บริการลูกค้า, ภาษาอังกฤษพื้นฐาน', 'นักศึกษาปี 3 อยากหางานเสาร์-อาทิตย์', [[1, 1007], [1, 1004]]],
  ['p02', 'มาลี สวยงาม', '1999-09-30', '0811111102', 'แคชเชียร์, จัดสต็อก', 'ทำงานร้านสะดวกซื้อมา 2 ปี', [[1, null]]],
  ['p03', 'อนุชา คนขยัน', '2000-01-20', '0811111103', 'ขับรถยนต์, ยกของ, แพ็กสินค้า', 'มีใบขับขี่ ขยัน ตรงต่อเวลา', [[28, null], [19, 3001]]],
  ['p04', 'ปิยะนุช ล้านนา', '2002-06-05', '0811111104', 'บาริสต้า, MC งานอีเวนต์', 'ชอบงานบริการ พูดเก่ง', [[38, 5001]]],
  ['p05', 'ธนากร ทะเลใส', '1998-11-11', '0811111105', 'ภาษาอังกฤษ, งานโรงแรม, ว่ายน้ำ', 'เคยทำงานรีสอร์ทที่กระบี่', [[66, null], [11, 2004]]],
  ['p06', 'กมลวรรณ เก่งคณิต', '2003-02-14', '0811111106', 'สอนคณิตศาสตร์, วิทยาศาสตร์', 'นักศึกษาวิศวะ ชอบสอนน้อง', [[70, 9011]]],
];

// --- jobs --------------------------------------------------------------------
// [key, shop, category, title, description, wage, unit, schedule, start, end, minAge, expires offset, status, created hours ago, district override]
// schedule: ['weekly', 'sat,sun'] or ['dates', startOffset, endOffset]
const jobs = [
  ['j01', 's01', 1, 'พนักงานเสิร์ฟ / บาริสต้า ช่วงเสาร์-อาทิตย์', 'ชงเครื่องดื่ม รับออเดอร์ ดูแลลูกค้า\nมีสอนงานให้ ไม่จำเป็นต้องมีประสบการณ์\nได้ทิปแยก + อาหาร 1 มื้อ', 60, 'hour', ['weekly', 'sat,sun'], '10:00', '18:00', null, 25, 'open', 2],
  ['j02', 's01', 1, 'ผู้ช่วยทำขนม ช่วงเช้า', 'ช่วยอบขนมและจัดตู้ขนมก่อนร้านเปิด', 70, 'hour', ['weekly', 'mon,tue,wed,thu,fri'], '06:00', '10:00', 18, 20, 'open', 30],
  ['j03', 's02', 1, 'พนักงานล้างจาน + เก็บโต๊ะ ช่วงกลางวัน', 'งานเร่งช่วงพักเที่ยง ทำงานเป็นทีม มีอาหารให้', 450, 'day', ['weekly', 'mon,tue,wed,thu,fri,sat'], '10:30', '15:00', null, 28, 'open', 5],
  ['j04', 's03', 2, 'พนักงานแคชเชียร์ กะดึก', 'คิดเงิน เติมสินค้า ดูแลความสะอาดหน้าร้าน (มีกล้องวงจรปิดและพนักงานอยู่ด้วย 2 คน)', 65, 'hour', ['weekly', 'fri,sat,sun'], '22:00', '06:00', 20, 15, 'open', 12],
  ['j05', 's03', 5, 'จัดเรียงสินค้าเข้าสต็อก (งานวันเดียว)', 'นับและจัดเรียงสินค้าก่อนเปิดสาขาใหม่', 600, 'day', ['dates', 4, 4], '08:00', '17:00', null, 3, 'open', 20],
  ['j06', 's04', 1, 'บาริสต้า Part-time นิมมาน', 'ชงกาแฟสด เน้นลาเต้อาร์ต (มีสอน) ลูกค้าต่างชาติเยอะ พูดอังกฤษได้จะดีมาก', 55, 'hour', ['weekly', 'sat,sun'], '08:00', '16:00', null, 30, 'open', 1],
  ['j07', 's04', 1, 'ผู้ช่วยคั่วกาแฟ', 'ช่วยคั่วและแพ็กเมล็ดกาแฟ งานในโรงคั่วหลังร้าน', 400, 'day', ['weekly', 'tue,thu'], '09:00', '17:00', null, 22, 'open', 50],
  ['j08', 's05', 4, 'พีซีบูธงานแฟร์ 3 วัน', 'แนะนำสินค้าในบูธงานแฟร์ เสื้อทีมให้ แต่งกายสุภาพ', 800, 'day', ['dates', 7, 9], '10:00', '20:00', 18, 6, 'open', 8],
  ['j09', 's05', 4, 'ทีมงานจัดสถานที่งานแต่ง', 'ยกของ จัดโต๊ะ ตกแต่งสถานที่ ต้องแข็งแรง', 700, 'job', ['dates', 12, 12], '07:00', '22:00', null, 10, 'open', 26],
  ['j10', 's06', 8, 'พนักงานต้อนรับส่วนหน้า (ภาษาอังกฤษ)', 'เช็กอิน/เช็กเอาต์แขก แนะนำทัวร์ ใช้ภาษาอังกฤษสื่อสาร', 500, 'day', ['weekly', 'fri,sat,sun'], '07:00', '15:00', 20, 30, 'open', 3],
  ['j11', 's06', 6, 'แม่บ้านทำความสะอาดห้องพัก', 'ทำความสะอาดห้องพักและเปลี่ยนผ้าปูที่นอน', 450, 'day', ['weekly', 'sat,sun'], '09:00', '17:00', null, 18, 'open', 70],
  ['j12', 's07', 5, 'พนักงานแพ็กสินค้า กะเช้า', 'แพ็กพัสดุตามออเดอร์ออนไลน์ ยืนทำงาน มี OT', 50, 'hour', ['weekly', 'mon,tue,wed,thu,fri'], '08:00', '12:00', null, 27, 'open', 9],
  ['j13', 's07', 3, 'คนขับรถส่งของ (มีใบขับขี่ ท.1 ขึ้นไป)', 'ขับรถกระบะส่งพัสดุในตัวเมืองขอนแก่น ไม่ต้องใช้รถตัวเอง', 650, 'day', ['weekly', 'sat'], '08:00', '17:00', 21, 24, 'open', 40],
  ['j14', 's08', 1, 'พนักงานเสิร์ฟร้านอาหารทะเล', 'รับออเดอร์ เสิร์ฟอาหาร ลูกค้าต่างชาติเยอะ', 60, 'hour', ['weekly', 'fri,sat,sun'], '16:00', '23:00', null, 21, 'open', 15],
  ['j15', 's09', 7, 'ติวเตอร์คณิตศาสตร์ ม.ต้น', 'สอนกลุ่มเล็ก 4-6 คน มีชีทให้ ต้องเป็นนักศึกษาหรือจบวิศวะ/วิทย์', 300, 'hour', ['weekly', 'sat,sun'], '09:00', '12:00', null, 29, 'open', 4],
  ['j16', 's09', 8, 'ผู้ช่วยธุรการรับสมัครนักเรียน', 'ตอบแชท รับโทรศัพท์ กรอกข้อมูลนักเรียน', 400, 'day', ['dates', 2, 15], '09:00', '17:00', null, 12, 'open', 36],
  ['j17', 's10', 6, 'แม่บ้านทำความสะอาดคอนโด', 'ทำความสะอาดห้องลูกค้าตามนัด มีอุปกรณ์ให้ มีค่าเดินทาง', 350, 'job', ['weekly', 'mon,wed,fri'], '09:00', '13:00', null, 26, 'open', 18],
  ['j18', 's10', 6, 'ทีมทำความสะอาดออฟฟิศ หลังเลิกงาน', 'ทำความสะอาดสำนักงานหลังเลิกงาน', 70, 'hour', ['weekly', 'mon,tue,wed,thu,fri'], '18:00', '21:00', null, 2, 'open', 100],
  ['j19', 's01', 4, 'โปรโมทเมนูใหม่หน้าห้าง', 'แจกชิมเครื่องดื่มเมนูใหม่หน้าห้างสยาม', 900, 'day', ['dates', -20, -18], '11:00', '19:00', null, -10, 'closed', 600],
  ['j20', 's02', 1, 'พนักงานช่วยครัว (ปิดรับแล้ว)', 'หั่นผัก เตรียมวัตถุดิบ', 420, 'day', ['weekly', 'sat,sun'], '07:00', '14:00', null, -2, 'closed', 900],
  ['j21', 's04', 9, 'แอดมินเพจร้านกาแฟ (ทำที่บ้าน)', 'ตอบแชทลูกค้า โพสต์คอนเทนต์ วันละ 2 ชั่วโมง', 3000, 'job', ['weekly', 'mon,tue,wed,thu,fri,sat,sun'], '19:00', '21:00', null, 30, 'open', 6],
  ['j22', 's08', 10, 'ผู้ช่วยแกะหอย (รายชิ้นงาน)', 'แกะหอยนางรมและเตรียมอาหารทะเลช่วงเย็น', 300, 'job', ['weekly', 'sat'], '15:00', '19:00', null, 14, 'open', 60],
];

// --- applications ------------------------------------------------------------
// [key, job, seeker, status, applied hours ago, decided hours ago, completed hours ago]
const apps = [
  ['a01', 'j01', 'p01', 'pending', 1],
  ['a02', 'j04', 'p02', 'accepted', 20, 10],
  ['a03', 'j06', 'p04', 'pending', 0.5],
  ['a04', 'j08', 'p04', 'accepted', 6, 3],
  ['a05', 'j12', 'p03', 'rejected', 8, 4],
  ['a06', 'j13', 'p03', 'pending', 30],
  ['a07', 'j10', 'p05', 'accepted', 2.5, 1],
  ['a08', 'j15', 'p06', 'pending', 3],
  ['a09', 'j19', 'p01', 'completed', 590, 580, 400],
  ['a10', 'j20', 'p02', 'completed', 880, 870, 100],
  ['a11', 'j20', 'p01', 'rejected', 880, 860],
  ['a12', 'j03', 'p02', 'cancelled', 4],
  ['a13', 'j17', 'p03', 'completed', 400, 390, 48],
];

// [application, reviewer side, rating, comment, hours ago]
const reviews = [
  ['a09', 'seeker', 5, 'ร้านน่ารัก จ่ายตรงเวลา ได้ทิปด้วย', 390],
  ['a09', 'shop', 5, 'สมชายขยัน พูดเก่ง ลูกค้าชอบ', 395],
  ['a10', 'seeker', 4, 'งานหนักนิดหน่อยแต่เฮียใจดี มีข้าวให้กิน', 90],
  ['a10', 'shop', 4, 'มาตรงเวลา ทำงานเรียบร้อย', 95],
  ['a13', 'shop', 3, 'ทำงานดี แต่มาสายไป 20 นาที', 40],
];

// --- emit SQL ----------------------------------------------------------------
sql('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;');
sql("SET time_zone = '+07:00';");
sql('START TRANSACTION;');

for (const [key, name, desc, address, province, district, phone, status, reason] of shops) {
  const email = `shop${key.slice(1)}@${DOMAIN}`;
  sql(`INSERT INTO users (email, password_hash, role, status, profile_completed, pdpa_accepted_at, created_at, last_login_at)
  VALUES (${q(email)}, ${q(PASSWORD_HASH)}, 'shop', 'active', 1, ${q(stamp(1200))}, ${q(stamp(1200))}, ${q(stamp(24))});`);
  sql(`SET @u_${key} = LAST_INSERT_ID();`);
  const doc = status === 'unsubmitted' ? null : '000000000000000000000000000000' + key.slice(1) + '.pdf';
  sql(`INSERT INTO shops (owner_user_id, name, description, address, province_id, district_id, phone, verify_doc_file, verify_status, reject_reason, verify_submitted_at, verified_at, created_at)
  VALUES (@u_${key}, ${q(name)}, ${q(desc)}, ${q(address)}, ${province}, ${district}, ${q(phone)}, ${q(doc)}, ${q(status)}, ${q(reason ?? null)},
          ${q(doc ? stamp(status === 'pending' ? 20 : 1100) : null)}, ${q(status === 'verified' ? stamp(1000) : null)}, ${q(stamp(1200))});`);
  sql(`SET @s_${key} = LAST_INSERT_ID();`);
}

for (const [key, name, birth, phone, skills, bio, areas] of seekers) {
  const email = `seeker${key.slice(1)}@${DOMAIN}`;
  sql(`INSERT INTO users (email, password_hash, role, status, profile_completed, pdpa_accepted_at, created_at, last_login_at)
  VALUES (${q(email)}, ${q(PASSWORD_HASH)}, 'seeker', 'active', 1, ${q(stamp(900))}, ${q(stamp(900))}, ${q(stamp(5))});`);
  sql(`SET @u_${key} = LAST_INSERT_ID();`);
  sql(`INSERT INTO seeker_profiles (user_id, full_name, birth_date, phone, skills, bio)
  VALUES (@u_${key}, ${q(name)}, ${q(birth)}, ${q(phone)}, ${q(skills)}, ${q(bio)});`);
  sql(`INSERT INTO seeker_areas (user_id, province_id, district_id) VALUES ${areas.map(([p, d]) => `(@u_${key}, ${p}, ${q(d)})`).join(', ')};`);
}

const shopOf = Object.fromEntries(shops.map((s) => [s[0], s]));
const jobTitle = {};
const jobShop = {};
for (const [key, shop, cat, title, desc, wage, unit, sched, start, end, minAge, expires, status, createdAgo, districtOverride] of jobs) {
  const s = shopOf[shop];
  const province = s[4];
  const district = districtOverride ?? s[5];
  let startDate = null;
  let endDate = null;
  let workDays;
  if (sched[0] === 'dates') {
    startDate = day(sched[1]);
    endDate = day(sched[2]);
    workDays = weekdaysBetween(startDate, endDate);
  } else {
    workDays = sched[1];
  }
  jobTitle[key] = title;
  jobShop[key] = shop;
  sql(`INSERT INTO jobs (shop_id, category_id, title, description, province_id, district_id, wage, wage_unit, schedule_type, start_date, end_date, work_days, start_time, end_time, min_age, expires_on, status, created_at)
  VALUES (@s_${shop}, ${cat}, ${q(title)}, ${q(desc)}, ${province}, ${district}, ${wage}, ${q(unit)}, ${q(sched[0])}, ${q(startDate)}, ${q(endDate)}, ${q(workDays)}, ${q(start)}, ${q(end)}, ${q(minAge)}, ${q(day(expires))}, ${q(status)}, ${q(stamp(createdAgo))});`);
  sql(`SET @j_${key} = LAST_INSERT_ID();`);
}

const appJob = {};
const appSeeker = {};
for (const [key, job, seeker, status, appliedAgo, decidedAgo, completedAgo] of apps) {
  appJob[key] = job;
  appSeeker[key] = seeker;
  sql(`INSERT INTO applications (job_id, seeker_user_id, status, applied_at, decided_at, cancelled_at, completed_at)
  VALUES (@j_${job}, @u_${seeker}, ${q(status)}, ${q(stamp(appliedAgo))}, ${q(decidedAgo ? stamp(decidedAgo) : null)},
          ${q(status === 'cancelled' ? stamp(appliedAgo - 1) : null)}, ${q(completedAgo ? stamp(completedAgo) : null)});`);
  sql(`SET @a_${key} = LAST_INSERT_ID();`);
}

for (const [app, side, rating, comment, ago] of reviews) {
  const seeker = `@u_${appSeeker[app]}`;
  const owner = `@u_${jobShop[appJob[app]]}`;
  const [reviewer, reviewee] = side === 'seeker' ? [seeker, owner] : [owner, seeker];
  sql(`INSERT INTO reviews (application_id, reviewer_user_id, reviewee_user_id, rating, comment, created_at)
  VALUES (@a_${app}, ${reviewer}, ${reviewee}, ${rating}, ${q(comment)}, ${q(stamp(ago))});`);
  if (app === 'a13') sql('SET @r_report = LAST_INSERT_ID();');
}

saved('p01', ['j06', 'j15', 'j01']);
saved('p04', ['j08', 'j21']);
function saved(seeker, list) {
  sql(`INSERT INTO saved_jobs (user_id, job_id) VALUES ${list.map((j) => `(@u_${seeker}, @j_${j})`).join(', ')};`);
}

// Chats: every accepted / completed application has a conversation (opened when the shop accepted)
// [application, [[sender side, text, hours ago]]]; the seeker has not read the shop's newest message yet
const chats = [
  ['a02', [
    ['shop', 'สวัสดีครับคุณมาลี ร้านรับเข้าทำงานกะดึกแล้วนะครับ', 9.5],
    ['seeker', 'ขอบคุณค่ะ เริ่มคืนวันศุกร์นี้เลยไหมคะ', 9],
    ['shop', 'ใช่ครับ มาก่อนสี่ทุ่มสัก 15 นาที ใส่เสื้อสีเข้ม เดี๋ยวมีเสื้อร้านให้', 8.5],
  ]],
  ['a04', [
    ['shop', 'ยินดีต้อนรับค่ะ งานแฟร์ที่เซ็นทรัลเฟสติวัล ชั้น 1 นะคะ', 2.8],
    ['seeker', 'รับทราบค่ะ ต้องเตรียมอะไรไปบ้างคะ', 2.5],
    ['shop', 'แค่กางเกงสีดำกับรองเท้าผ้าใบค่ะ เสื้อทีมเตรียมให้แล้ว', 2],
  ]],
  ['a07', [
    ['seeker', 'สวัสดีครับ ผมธนากร เคยทำ front office มาก่อน เริ่มงานได้เลยครับ', 0.8],
    ['shop', 'ดีมากเลยค่ะ เข้ามาเซ็นเอกสารวันศุกร์ 9 โมงนะคะ', 0.5],
  ]],
  ['a13', [
    ['shop', 'ขอบคุณที่มาช่วยนะครับ งานเรียบร้อยดีมาก', 47],
    ['seeker', 'ขอบคุณครับ ถ้ามีงานอีกเรียกได้เลยครับ', 46],
  ]],
];
const chatted = new Set(chats.map((c) => c[0]));
for (const [key, , , status, , decidedAgo] of apps) {
  if (!['accepted', 'completed'].includes(status)) continue;
  const owner = `@u_${jobShop[appJob[key]]}`;
  sql(`INSERT INTO conversations (application_id, seeker_user_id, shop_user_id, created_at)
  VALUES (@a_${key}, @u_${appSeeker[key]}, ${owner}, ${q(stamp(decidedAgo))});`);
  sql(`SET @c_${key} = LAST_INSERT_ID();`);
  if (!chatted.has(key)) continue;
  const lines = chats.find((c) => c[0] === key)[1];
  let lastSeekerMsg = '0';
  lines.forEach(([side, text, ago], i) => {
    const sender = side === 'seeker' ? `@u_${appSeeker[key]}` : owner;
    sql(`INSERT INTO chat_messages (conversation_id, sender_user_id, body, created_at) VALUES (@c_${key}, ${sender}, ${q(text)}, ${q(stamp(ago))});`);
    sql(`SET @m_${key}_${i} = LAST_INSERT_ID();`);
    if (side === 'seeker') lastSeekerMsg = `@m_${key}_${i}`;
  });
  const last = `@m_${key}_${lines.length - 1}`;
  sql(`UPDATE conversations SET last_message_id = ${last}, last_message_at = ${q(stamp(lines[lines.length - 1][2]))},
    shop_last_read_id = ${last}, seeker_last_read_id = ${lastSeekerMsg} WHERE id = @c_${key};`);
}

// Open reports for the admin queue
sql(`INSERT INTO reports (reporter_user_id, target_type, target_id, reason, created_at)
  VALUES (@u_p05, 'job', @j_j21, 'ค่าจ้างต่ำเกินจริง อาจเป็นงานหลอกให้ทำฟรี', ${q(stamp(5))}),
         (@u_p03, 'review', @r_report, 'ร้านเขียนรีวิวไม่ตรงความจริง ผมไม่ได้มาสาย', ${q(stamp(30))});`);

// A few notifications so the bell has something to show
const notes = [
  ['s01', 'application.new', 'สมชาย ใจดี สมัครงาน "พนักงานเสิร์ฟ / บาริสต้า ช่วงเสาร์-อาทิตย์"', '/shop/applicants/', 'a01', 1],
  ['s04', 'application.new', 'ปิยะนุช ล้านนา สมัครงาน "บาริสต้า Part-time นิมมาน"', '/shop/applicants/', 'a03', 0.5],
  ['p02', 'application.accepted', 'ร้าน มินิมาร์ทสุขใจ รับคุณเข้าทำงาน "พนักงานแคชเชียร์ กะดึก" แล้ว ดูช่องทางติดต่อร้านได้เลย', '/seeker/applications/', 'a02', 10],
  ['p04', 'application.accepted', 'ร้าน ล้านนา อีเวนต์ แอนด์ ออแกไนซ์ รับคุณเข้าทำงาน "พีซีบูธงานแฟร์ 3 วัน" แล้ว', '/seeker/applications/', 'a04', 3],
  ['p03', 'application.rejected', 'ร้าน ขอนแก่น เอ็กซ์เพรส โลจิสติกส์ ไม่ได้เลือกใบสมัครงาน "พนักงานแพ็กสินค้า กะเช้า" ของคุณ', '/seeker/applications/', 'a05', 4],
  ['p03', 'review.received', 'ร้าน โคราช คลีน แอนด์ แคร์ ให้คะแนนคุณ 3 ดาว', '/seeker/profile', null, 40],
];
for (const [who, type, message, link, app, ago] of notes) {
  const linkSql = app ? `CONCAT(${q(link)}, @a_${app})` : q(link);
  sql(`INSERT INTO notifications (user_id, type, message, link, created_at) VALUES (@u_${who}, ${q(type)}, ${q(message)}, ${linkSql}, ${q(stamp(ago))});`);
}

// 100 more shops covering all 77 provinces (store001..store100)
require('./bulk-shops')({ sql, q, stamp, day, weekdaysBetween, passwordHash: PASSWORD_HASH, domain: DOMAIN });

sql('COMMIT;');
process.stdout.write(out.join('\n') + '\n');
