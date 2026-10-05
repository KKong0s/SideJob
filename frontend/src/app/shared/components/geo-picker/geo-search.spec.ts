import { searchPlaces } from './geo-search';

const provinces = [
  { id: 1, nameTh: 'กรุงเทพมหานคร', nameEn: 'Bangkok' },
  { id: 38, nameTh: 'เชียงใหม่', nameEn: 'Chiang Mai' },
  { id: 45, nameTh: 'เชียงราย', nameEn: 'Chiang Rai' },
  { id: 64, nameTh: 'กระบี่', nameEn: 'Krabi' },
  { id: 77, nameTh: 'บึงกาฬ', nameEn: 'Bueng Kan' },
];
const ids = (query: string) => searchPlaces(provinces, query).map((p) => p.id);

describe('searchPlaces', () => {
  it('returns everything for an empty query', () => {
    expect(ids('  ')).toEqual([1, 38, 45, 64, 77]);
  });

  it('matches part of a Thai name', () => {
    expect(ids('เชียง')).toEqual([38, 45]);
    expect(ids('ใหม่')).toEqual([38]);
  });

  it('ignores Thai prefixes and spaces', () => {
    expect(ids('จ.เชียงใหม่')).toEqual([38]);
    expect(ids('จังหวัด กระบี่')).toEqual([64]);
  });

  it('matches English names case-insensitively, ignoring spaces', () => {
    expect(ids('chiangmai')).toEqual([38]);
    expect(ids('KRA')).toEqual([64]);
  });

  it('knows common Bangkok aliases', () => {
    expect(ids('กทม')).toEqual([1]);
    expect(ids('bkk')).toEqual([1]);
  });

  it('puts names that start with the query first', () => {
    // "กร" starts กรุงเทพ and กระบี่; no other name merely contains it here
    expect(ids('กร')).toEqual([1, 64]);
    // "ราย" only appears inside เชียงราย
    expect(ids('ราย')).toEqual([45]);
  });

  it('returns nothing when there is no match', () => {
    expect(ids('ปารีส')).toEqual([]);
  });
});
