import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonList, IonItem, IonLabel, IonNote } from '@ionic/angular';

import { environment } from '../../../../environments/environment';

type HealthState = 'loading' | 'ok' | 'error';

// Temporary landing page for Phase 0: checks that the API and database are reachable.
@Component({
  selector: 'app-welcome',
  templateUrl: 'welcome.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonList, IonItem, IonLabel, IonNote, RouterLink],
})
export class WelcomePage {
  private readonly http = inject(HttpClient);

  readonly health = signal<HealthState>('loading');
  readonly detail = signal('');

  constructor() {
    this.checkHealth();
  }

  checkHealth(): void {
    this.health.set('loading');
    this.http.get<{ status: string; database: string; time: string }>(`${environment.apiUrl}/health`).subscribe({
      next: (res) => {
        this.health.set('ok');
        this.detail.set(`ฐานข้อมูล: ${res.database} · เวลาเซิร์ฟเวอร์ ${res.time}`);
      },
      error: () => {
        this.health.set('error');
        this.detail.set('เชื่อมต่อ API ไม่ได้');
      },
    });
  }
}
