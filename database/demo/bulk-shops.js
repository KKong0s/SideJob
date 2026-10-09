/**
 * 100 extra demo shops (store001..store100@demo.sidejob.local, password Demo@1234) spread over all 77 provinces:
 * shops 1-77 get one province each, shops 78-100 a random province. A seeded random generator keeps the data
 * the same on every run. 85 shops are verified with 1-3 open jobs (at least one such shop in every province);
 * 8 are pending, 4 rejected and 3 have no document yet.
 * Used by build-seed-demo.js.
 */
const fs = require('fs');
const path = require('path');

// Deterministic random numbers (mulberry32)
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const geoDir = path.join(__dirname, '..', 'thai-geo');
const load = (name) => JSON.parse(fs.readFileSync(path.join(geoDir, `${name}.json`), 'utf8')).filter((r) => !r.deleted_at);
const provinces = load('provinces');
const districts = load('districts');

const WORDS = ['สุขใจ', 'รุ่งเรือง', 'ใบเตย', 'ทองคำ', 'ดาวเรือง', 'ร่มเย็น', 'มีสุข', 'ชมจันทร์', 'ฟ้าใส', 'บ้านสวน', 'ลมเย็น', 'ต้นข้าว', 'เรือนไทย', 'พอเพียง', 'มะลิ', 'ริมน้ำ'];
const ROADS = ['สุขุมวิท', 'พหลโยธิน', 'มิตรภาพ', 'เพชรเกษม', 'ราชดำเนิน', 'ประชาอุทิศ', 'เทศบาล 1', 'สายกลาง', 'โชคชัย', 'นิมิตใหม่'];

// Business types: name patterns ({w} = word, {p} = province) and job templates
// job: [category, title, description, wage min, wage max, unit, start, end, schedule hint]
const TYPES = [
  {
    names: ['คาเฟ่{w} {p}', '{w} คอฟฟี่', 'บ้านกาแฟ{w}'],
    desc: 'ร้านกาแฟและเบเกอรี่ บรรยากาศสบาย ๆ',
    jobs: [
      [1, 'บาริสต้า Part-time', 'ชงกาแฟ ดูแลลูกค้าหน้าร้าน มีสอนงาน', 50, 70, 'hour', '08:00', '16:00', 'weekend'],
      [1, 'พนักงานเสิร์ฟ', 'รับออเดอร์ เสิร์ฟ เก็บโต๊ะ', 45, 60, 'hour', '10:00', '18:00', 'weekend'],
    ],
  },
  {
    names: ['ครัว{w}', 'ร้านอาหาร{w} {p}', '{w} ซีฟู้ด'],
    desc: 'ร้านอาหารไทยและอาหารตามสั่ง ลูกค้าเยอะช่วงเที่ยงและเย็น',
    jobs: [
      [1, 'พนักงานเสิร์ฟ ช่วงเย็น', 'เสิร์ฟอาหาร เก็บโต๊ะ มีอาหาร 1 มื้อ', 50, 65, 'hour', '17:00', '22:00', 'weekly'],
      [1, 'ผู้ช่วยครัว', 'หั่นผัก เตรียมวัตถุดิบ ล้างจาน', 400, 500, 'day', '09:00', '17:00', 'weekly'],
    ],
  },
  {
    names: ['มินิมาร์ท{w}', 'ร้านค้า{w} {p}', 'ซูเปอร์{w}'],
    desc: 'ร้านค้าปลีกในชุมชน เปิดทุกวัน',
    jobs: [
      [2, 'พนักงานแคชเชียร์', 'คิดเงิน เติมสินค้า ดูแลหน้าร้าน', 45, 60, 'hour', '14:00', '22:00', 'weekly'],
      [5, 'จัดเรียงสินค้าเข้าสต็อก', 'รับสินค้า นับสต็อก จัดชั้นวาง', 400, 500, 'day', '07:00', '15:00', 'dates'],
    ],
  },
  {
    names: ['{w} ขนส่ง', '{p} เอ็กซ์เพรส', '{w} โลจิสติกส์'],
    desc: 'บริการขนส่งพัสดุและคลังสินค้าในจังหวัด',
    jobs: [
      [5, 'พนักงานแพ็กสินค้า', 'แพ็กพัสดุตามออเดอร์ มี OT', 45, 55, 'hour', '08:00', '12:00', 'weekday'],
      [3, 'ขับรถส่งของ (มีใบขับขี่)', 'ส่งพัสดุในตัวเมือง ใช้รถบริษัท', 550, 700, 'day', '08:00', '17:00', 'weekly'],
    ],
  },
  {
    names: ['{w} อีเวนต์', '{p} ออแกไนซ์', 'ทีมงาน{w}'],
    desc: 'รับจัดอีเวนต์ งานแต่ง และบูธแสดงสินค้า',
    jobs: [
      [4, 'พีซีแนะนำสินค้า', 'ยืนบูธแนะนำสินค้า แต่งกายสุภาพ', 700, 900, 'day', '10:00', '20:00', 'dates'],
      [4, 'ทีมจัดสถานที่งานแต่ง', 'ยกของ จัดโต๊ะ ตกแต่งสถานที่', 600, 800, 'job', '07:00', '21:00', 'dates'],
    ],
  },
  {
    names: ['{w} คลีนนิ่ง', '{p} แม่บ้านมืออาชีพ', 'คลีนแอนด์แคร์ {w}'],
    desc: 'บริการทำความสะอาดบ้าน คอนโด และสำนักงาน',
    jobs: [[6, 'แม่บ้านทำความสะอาด', 'ทำความสะอาดตามนัด มีอุปกรณ์ให้', 300, 400, 'job', '09:00', '13:00', 'weekly']],
  },
  {
    names: ['สถาบันกวดวิชา{w}', '{p} ติวเตอร์', 'บ้านเรียน{w}'],
    desc: 'สถาบันกวดวิชาระดับประถมถึงมัธยม',
    jobs: [[7, 'ติวเตอร์คณิต-วิทย์', 'สอนกลุ่มเล็ก มีชีทให้', 250, 400, 'hour', '09:00', '12:00', 'weekend']],
  },
  {
    names: ['{w} การบัญชี', 'สำนักงาน{w}', '{p} เซอร์วิส'],
    desc: 'สำนักงานบัญชีและบริการเอกสาร',
    jobs: [[8, 'ผู้ช่วยงานธุรการ', 'กรอกข้อมูล รับโทรศัพท์ จัดเอกสาร', 400, 500, 'day', '09:00', '17:00', 'weekday']],
  },
  {
    names: ['{w} ช็อปออนไลน์', 'ร้าน{w} ออนไลน์', '{p} มาร์เก็ต'],
    desc: 'ร้านขายของออนไลน์ ส่งทั่วประเทศ',
    jobs: [
      [9, 'แอดมินเพจ (ทำที่บ้าน)', 'ตอบแชทลูกค้า โพสต์สินค้า วันละ 2 ชม.', 2500, 4000, 'job', '19:00', '21:00', 'everyday'],
      [5, 'แพ็กของส่งลูกค้า', 'แพ็กสินค้าและติดใบปะหน้า', 45, 55, 'hour', '13:00', '17:00', 'weekday'],
    ],
  },
  {
    names: ['{w} รีสอร์ท', 'โรงแรม{w} {p}', 'บ้านพัก{w}'],
    desc: 'ที่พักสำหรับนักท่องเที่ยว บรรยากาศเงียบสงบ',
    jobs: [
      [8, 'พนักงานต้อนรับส่วนหน้า', 'เช็กอิน-เอาต์ แนะนำสถานที่', 450, 550, 'day', '07:00', '15:00', 'weekend'],
      [6, 'แม่บ้านห้องพัก', 'ทำความสะอาดห้องพัก เปลี่ยนผ้าปู', 400, 480, 'day', '09:00', '17:00', 'weekend'],
    ],
  },
];

const REJECT_REASONS = ['เอกสารไม่ชัด กรุณาถ่ายใหม่ให้เห็นทั้งหน้า', 'ชื่อในเอกสารไม่ตรงกับชื่อร้าน', 'เอกสารหมดอายุแล้ว'];
const SCHEDULES = {
  weekend: ['sat,sun'],
  weekday: ['mon,tue,wed,thu,fri'],
  everyday: ['mon,tue,wed,thu,fri,sat,sun'],
  weekly: ['mon,wed,fri', 'tue,thu,sat', 'fri,sat,sun', 'mon,tue,wed,thu,fri,sat'],
};

module.exports = function bulkShops({ sql, q, stamp, day, weekdaysBetween, passwordHash, domain }) {
  const rand = rng(20261009);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const int = (min, max) => min + Math.floor(rand() * (max - min + 1));

  // Every province once (shuffled), then 23 more at random
  const order = [...provinces].sort(() => rand() - 0.5);
  while (order.length < 100) order.push(pick(provinces));

  order.forEach((province, i) => {
    const n = String(i + 1).padStart(3, '0');
    const key = `b${n}`;
    const type = pick(TYPES);
    const district = pick(districts.filter((d) => d.province_id === province.id));
    const name = pick(type.names).replace('{w}', pick(WORDS)).replace('{p}', province.name.th).slice(0, 150);
    const address = `${int(1, 299)}/${int(1, 99)} หมู่ ${int(1, 12)} ถนน${pick(ROADS)}`;
    const phone = '08' + String(int(10000000, 99999999));
    // The first 77 (one per province) are verified, so every province has open jobs.
    // Of the 23 extra shops: 8 pending, 4 rejected, 3 without a document, the rest verified.
    const extra = i - provinces.length;
    const status = extra < 0 ? 'verified' : extra < 8 ? 'pending' : extra < 12 ? 'rejected' : extra < 15 ? 'unsubmitted' : 'verified';
    const ageDays = int(2, 30);
    const doc = status === 'unsubmitted' ? null : `b0000000000000000000000000000${n}.pdf`;

    sql(`INSERT INTO users (email, password_hash, role, status, profile_completed, pdpa_accepted_at, created_at, last_login_at)
  VALUES (${q(`store${n}@${domain}`)}, ${q(passwordHash)}, 'shop', 'active', 1, ${q(stamp(ageDays * 24))}, ${q(stamp(ageDays * 24))}, ${q(stamp(int(1, 48)))});`);
    sql(`SET @u_${key} = LAST_INSERT_ID();`);
    sql(`INSERT INTO shops (owner_user_id, name, description, address, province_id, district_id, phone, verify_doc_file, verify_status, reject_reason, verify_submitted_at, verified_at, created_at)
  VALUES (@u_${key}, ${q(name)}, ${q(type.desc)}, ${q(address)}, ${province.id}, ${district.id}, ${q(phone)}, ${q(doc)}, ${q(status)},
          ${q(status === 'rejected' ? pick(REJECT_REASONS) : null)}, ${q(doc ? stamp(ageDays * 24 - 2) : null)},
          ${q(status === 'verified' ? stamp(Math.max(1, ageDays - 1) * 24) : null)}, ${q(stamp(ageDays * 24))});`);
    sql(`SET @s_${key} = LAST_INSERT_ID();`);

    if (status !== 'verified') return;
    const jobs = [...type.jobs].sort(() => rand() - 0.5).slice(0, int(1, Math.min(3, type.jobs.length + 1)));
    // A type with one template may post it twice with different days
    if (jobs.length < 2 && rand() < 0.4) jobs.push(type.jobs[0]);
    for (const [category, title, description, wageMin, wageMax, unit, start, end, hint] of jobs) {
      const wage = unit === 'hour' ? int(wageMin, wageMax) : Math.round(int(wageMin, wageMax) / 10) * 10;
      let scheduleType = 'weekly';
      let startDate = null;
      let endDate = null;
      let workDays;
      if (hint === 'dates') {
        scheduleType = 'dates';
        const from = int(1, 20);
        startDate = day(from);
        endDate = day(from + int(0, 3));
        workDays = weekdaysBetween(startDate, endDate);
      } else {
        workDays = pick(SCHEDULES[hint]);
      }
      sql(`INSERT INTO jobs (shop_id, category_id, title, description, province_id, district_id, wage, wage_unit, schedule_type, start_date, end_date, work_days, start_time, end_time, min_age, expires_on, status, created_at)
  VALUES (@s_${key}, ${category}, ${q(title)}, ${q(description)}, ${province.id}, ${district.id}, ${wage}, ${q(unit)}, ${q(scheduleType)},
          ${q(startDate)}, ${q(endDate)}, ${q(workDays)}, ${q(start)}, ${q(end)}, ${rand() < 0.15 ? 20 : 'NULL'}, ${q(day(int(5, 55)))}, 'open',
          ${q(stamp(int(1, Math.max(1, ageDays - 1)) * 24 - int(0, 20)))});`);
    }
  });
};
