import { AlertController, ToastController } from '@ionic/angular';

/** Confirmation with a reason field. Resolves with the reason ('' when optional and empty), or null when cancelled. */
export async function askReason(
  alerts: AlertController,
  toasts: ToastController,
  options: { header: string; message?: string; confirmText: string; required: boolean; destructive?: boolean },
): Promise<string | null> {
  const alert = await alerts.create({
    header: options.header,
    message: options.message,
    inputs: [
      {
        name: 'reason',
        type: 'textarea',
        placeholder: options.required ? 'เหตุผล (จำเป็น)' : 'เหตุผล (ไม่บังคับ)',
        attributes: { maxlength: 500 },
      },
    ],
    buttons: [
      { text: 'ยกเลิก', role: 'cancel' },
      {
        text: options.confirmText,
        role: options.destructive ? 'destructive' : 'confirm',
        handler: (data: { reason?: string }) => {
          if (options.required && !(data.reason ?? '').trim()) {
            void toasts.create({ message: 'กรุณากรอกเหตุผล', color: 'danger', duration: 2000, position: 'top' }).then((t) => t.present());
            return false;
          }
          return true;
        },
      },
    ],
  });
  await alert.present();
  const { data, role } = await alert.onDidDismiss<{ values: { reason?: string } }>();
  if (role === 'cancel' || role === 'backdrop' || !data) return null;
  return (data.values.reason ?? '').trim();
}
