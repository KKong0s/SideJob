import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';

import { GeoService } from '../../services/geo.service';
import { GeoPickerComponent, WHOLE_PROVINCE } from './geo-picker.component';

const geoStub = {
  provinces: () => [
    { id: 1, regionId: 2, nameTh: 'กรุงเทพมหานคร', nameEn: 'Bangkok' },
    { id: 38, regionId: 1, nameTh: 'เชียงใหม่', nameEn: 'Chiang Mai' },
    { id: 45, regionId: 1, nameTh: 'เชียงราย', nameEn: 'Chiang Rai' },
  ],
  districtsOf: () => [
    { id: 5001, provinceId: 38, nameTh: 'เมืองเชียงใหม่', nameEn: 'Mueang Chiang Mai' },
    { id: 5002, provinceId: 38, nameTh: 'จอมทอง', nameEn: 'Chom Thong' },
    { id: 5003, provinceId: 38, nameTh: 'แม่แจ่ม', nameEn: 'Mae Chaem' },
  ],
  districtLabel: (id: number | null) => (id === 1 ? 'เขต' : 'อำเภอ'),
  provinceName: () => 'เชียงใหม่',
};

describe('GeoPickerComponent', () => {
  let dismiss: ReturnType<typeof vi.fn>;

  function create(props: Partial<GeoPickerComponent>) {
    dismiss = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [GeoPickerComponent],
      providers: [
        { provide: GeoService, useValue: geoStub },
        { provide: ModalController, useValue: { dismiss } },
      ],
    });
    const fixture = TestBed.createComponent(GeoPickerComponent);
    Object.assign(fixture.componentInstance, props);
    fixture.componentInstance.ngOnInit();
    return fixture.componentInstance;
  }

  it('filters provinces as the user types', () => {
    const picker = create({ mode: 'province' });
    expect(picker.results().length).toBe(3);
    picker.query.set('เชียง');
    expect(picker.results().map((p) => p.id)).toEqual([38, 45]);
    picker.query.set('กทม');
    expect(picker.results().map((p) => p.id)).toEqual([1]);
  });

  it('single choice closes with the chosen id; Enter picks the top result', () => {
    const picker = create({ mode: 'province' });
    picker.query.set('ราย');
    picker.pickFirst();
    expect(dismiss).toHaveBeenCalledWith([45], 'confirm');
  });

  it('district titles use the province name and the right label', () => {
    const picker = create({ mode: 'district', provinceId: 38 });
    expect(picker.title).toBe('เลือกอำเภอ · เชียงใหม่');
    picker.query.set('แม่');
    expect(picker.results().map((d) => d.id)).toEqual([5003]);
  });

  it('"ทั้งจังหวัด" and specific districts exclude each other', () => {
    const picker = create({ mode: 'district', provinceId: 38, multiple: true, selected: [5001] });
    picker.toggle(5002);
    expect([...picker.picked()].sort()).toEqual([5001, 5002]);
    picker.toggle(WHOLE_PROVINCE);
    expect([...picker.picked()]).toEqual([WHOLE_PROVINCE]);
    picker.toggle(5003);
    expect([...picker.picked()]).toEqual([5003]);
    picker.confirm();
    expect(dismiss).toHaveBeenCalledWith([5003], 'confirm');
  });

  it('Enter does not auto-pick in multiple mode; cancel returns nothing', () => {
    const picker = create({ mode: 'district', provinceId: 38, multiple: true });
    picker.query.set('จอม');
    picker.pickFirst();
    expect(dismiss).not.toHaveBeenCalled();
    picker.cancel();
    expect(dismiss).toHaveBeenCalledWith(null, 'cancel');
  });
});
