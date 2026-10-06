import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';

import { GeoService } from '../../services/geo.service';
import { AreaPickerComponent } from './area-picker.component';

const provinces = [
  { id: 1, regionId: 2, nameTh: 'กรุงเทพมหานคร', nameEn: 'Bangkok' },
  { id: 38, regionId: 1, nameTh: 'เชียงใหม่', nameEn: 'Chiang Mai' },
  { id: 45, regionId: 1, nameTh: 'เชียงราย', nameEn: 'Chiang Rai' },
];
const districts = [
  { id: 1001, provinceId: 1, nameTh: 'พระนคร', nameEn: 'Phra Nakhon' },
  { id: 5001, provinceId: 38, nameTh: 'เมืองเชียงใหม่', nameEn: 'Mueang Chiang Mai' },
  { id: 5002, provinceId: 38, nameTh: 'จอมทอง', nameEn: 'Chom Thong' },
];
const geoStub = {
  regions: () => [
    { id: 1, nameTh: 'ภาคเหนือ', nameEn: 'Northern' },
    { id: 2, nameTh: 'ภาคกลาง', nameEn: 'Central' },
  ],
  provinces: () => provinces,
  districtsOf: (id: number | null) => districts.filter((d) => d.provinceId === id),
  districtLabel: (id: number | null) => (id === 1 ? 'เขต' : 'อำเภอ'),
  provinceName: (id: number) => provinces.find((p) => p.id === id)?.nameTh ?? '',
};

describe('AreaPickerComponent', () => {
  let dismiss: ReturnType<typeof vi.fn>;

  function create(props: Partial<AreaPickerComponent> = {}) {
    dismiss = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [AreaPickerComponent],
      providers: [
        { provide: GeoService, useValue: geoStub },
        { provide: ModalController, useValue: { dismiss } },
      ],
    });
    const fixture = TestBed.createComponent(AreaPickerComponent);
    Object.assign(fixture.componentInstance, props);
    fixture.componentInstance.ngOnInit();
    return fixture.componentInstance;
  }

  it('walks region -> province -> district and returns several districts', () => {
    const picker = create();
    picker.openRegion(1);
    expect(picker.provincesOfRegion().map((p) => p.id)).toEqual([38, 45]);
    picker.openProvince(provinces[1]);
    expect(picker.step()).toBe('district');
    picker.toggle(5001);
    picker.toggle(5002);
    picker.confirm();
    expect(dismiss).toHaveBeenCalledWith({ provinceId: 38, districtIds: [5001, 5002] }, 'confirm');
  });

  it('"ทั้งจังหวัด" clears the districts', () => {
    const picker = create({ selection: { provinceId: 38, districtIds: [5001] } });
    expect(picker.step()).toBe('district');
    picker.wholeProvince();
    picker.confirm();
    expect(dismiss).toHaveBeenCalledWith({ provinceId: 38, districtIds: [] }, 'confirm');
  });

  it('typing a province or district name skips the steps', () => {
    const picker = create();
    picker.query.set('กทม');
    expect(picker.results()!.provinces.map((p) => p.id)).toEqual([1]);
    picker.query.set('จอมทอง');
    const district = picker.results()!.districts[0];
    picker.openDistrictResult(district);
    expect(picker.provinceId()).toBe(38);
    expect([...picker.picked()]).toEqual([5002]);
    expect(picker.query()).toBe('');
  });

  it('uses "เขต" for Bangkok and sums counts per region', () => {
    const picker = create({ counts: { total: 7, provinces: { 1: 4, 38: 2, 45: 1 }, districts: { 1001: 4 } } });
    picker.openProvince(provinces[0]);
    expect(picker.districtUnit()).toBe('เขต');
    expect(picker.regionCount(1)).toBe(3);
    expect(picker.districtCount(1001)).toBe(4);
  });

  it('whole country returns provinceId null', () => {
    const picker = create();
    picker.wholeCountry();
    expect(dismiss).toHaveBeenCalledWith({ provinceId: null, districtIds: [] }, 'confirm');
  });
});
