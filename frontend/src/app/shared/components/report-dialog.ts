import { AlertController, ToastController } from '@ionic/angular';

import { ReportTarget, ReviewService } from '../services/review.service';

/** Asks for a reason and sends a report about a job or a review to the admins */
export async function openReportDialog(
  alerts: AlertController,
  toasts: ToastController,
  reviews: ReviewService,
  targetType: ReportTarget,
  targetId: number,
  header = 'รายงาน',
): Promise<void> {
  const alert = await alerts.create({
    header,
    message: 'แอดมินจะตรวจสอบและดำเนินการ ข้อมูลผู้รายงานจะไม่แสดงให้อีกฝ่ายเห็น',
    inputs: [{ name: 'reason', type: 'textarea', placeholder: 'เหตุผล เช่น ข้อมูลเท็จ หลอกลวง ไม่สุภาพ', attributes: { maxlength: 500 } }],
    buttons: [
      { text: 'ยกเลิก', role: 'cancel' },
      {
        text: 'ส่งรายงาน',
        handler: (data: { reason?: string }) => {
          const reason = (data.reason ?? '').trim();
          if (!reason) {
            void toasts.create({ message: 'กรุณาระบุเหตุผล', color: 'danger', duration: 2000, position: 'top' }).then((t) => t.present());
            return false;
          }
          void reviews.report(targetType, targetId, reason).then(
            () => toasts.create({ message: 'ส่งรายงานแล้ว ขอบคุณที่ช่วยดูแลชุมชน', color: 'success', duration: 2500, position: 'top' }).then((t) => t.present()),
            () => undefined, // the interceptor shows the error toast (e.g. already reported)
          );
          return true;
        },
      },
    ],
  });
  await alert.present();
}
