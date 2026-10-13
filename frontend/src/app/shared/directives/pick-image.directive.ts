import { Directive, inject, input } from '@angular/core';
import { ActionSheetController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, imagesOutline } from 'ionicons/icons';

import { isNativeApp } from '../utils/platform';

// Photos are scaled down on the phone so they stay well under the 5 MB upload limit
const PHOTO_OPTIONS = { quality: 85, targetWidth: 1600, targetHeight: 1600, correctOrientation: true };

/**
 * Put on the button that opens a hidden `<input type="file">` for images:
 * `<ion-button [appPickImage]="imageInput">`.
 * In a browser it simply opens the file picker. In the phone app it asks "camera or album",
 * uses Capacitor Camera, then hands the photos to the same input and fires its `change` event,
 * so the page's existing upload handler runs unchanged.
 */
@Directive({
  selector: '[appPickImage]',
  host: { '(click)': 'pick()' },
})
export class PickImageDirective {
  private readonly actionSheets = inject(ActionSheetController);
  private readonly toasts = inject(ToastController);

  readonly input = input.required<HTMLInputElement>({ alias: 'appPickImage' });

  constructor() {
    addIcons({ cameraOutline, imagesOutline });
  }

  async pick(): Promise<void> {
    const el = this.input();
    if (!isNativeApp()) {
      el.click();
      return;
    }

    const sheet = await this.actionSheets.create({
      header: 'เพิ่มรูป',
      buttons: [
        { text: 'ถ่ายรูป', icon: 'camera-outline', data: 'camera' },
        { text: 'เลือกจากอัลบั้ม', icon: 'images-outline', data: 'album' },
        { text: 'ยกเลิก', role: 'cancel' },
      ],
    });
    await sheet.present();
    const { data } = await sheet.onDidDismiss<'camera' | 'album'>();
    if (data !== 'camera' && data !== 'album') return;

    let files: File[];
    try {
      files = await nativePhotos(data, el.multiple);
    } catch (err) {
      if (!isCancel(err)) {
        const t = await this.toasts.create({
          message: 'เปิดกล้องหรืออัลบั้มไม่ได้ กรุณาตรวจสอบการอนุญาตของแอป',
          color: 'danger',
          duration: 3000,
          position: 'top',
        });
        await t.present();
      }
      return;
    }
    if (!files.length) return;

    const transfer = new DataTransfer();
    files.forEach((f) => transfer.items.add(f));
    el.files = transfer.files;
    el.dispatchEvent(new Event('change'));
  }
}

async function nativePhotos(source: 'camera' | 'album', multiple: boolean): Promise<File[]> {
  const { Camera } = await import('@capacitor/camera');
  const paths: (string | undefined)[] = [];
  if (source === 'camera') {
    paths.push((await Camera.takePhoto(PHOTO_OPTIONS)).webPath);
  } else {
    const res = await Camera.chooseFromGallery({ ...PHOTO_OPTIONS, allowMultipleSelection: multiple });
    paths.push(...res.results.map((r) => r.webPath));
  }
  return Promise.all(paths.filter((p): p is string => !!p).map(toFile));
}

async function toFile(webPath: string, index: number): Promise<File> {
  const blob = await (await fetch(webPath)).blob();
  const png = blob.type === 'image/png' || /\.png$/i.test(webPath);
  const type = blob.type || (png ? 'image/png' : 'image/jpeg');
  return new File([blob], `photo-${Date.now()}-${index}.${png ? 'png' : 'jpg'}`, { type });
}

// CameraErrorCode.TakePhotoCancelled / ChooseMediaCancelled
const CANCEL_CODES = ['OS-PLUG-CAMR-0006', 'OS-PLUG-CAMR-0020'];

/** The user closed the camera / album without choosing anything */
function isCancel(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return CANCEL_CODES.includes(e?.code ?? '') || /cancel/i.test(e?.message ?? '');
}
