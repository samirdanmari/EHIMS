import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-pin-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pin-dialog.component.html',
  styleUrls: ['./pin-dialog.component.scss']
})
export class PinDialogComponent {
  authService = inject(AuthService);

  isOpen = signal(false);
  pinValue = signal('');
  isVerifying = signal(false);
  error = signal('');

  title = input('Manager Authorization Required');
  message = input('Enter your manager PIN to continue');

  private resolvePromise?: (value: {verified: boolean; user?: any}) => void;

  open(): Promise<{verified: boolean; user?: any}> {
    this.pinValue.set('');
    this.error.set('');
    this.isOpen.set(true);
    
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  close(result: {verified: boolean; user?: any} = {verified: false}) {
    this.isOpen.set(false);
    if (this.resolvePromise) {
      this.resolvePromise(result);
      this.resolvePromise = undefined;
    }
  }

  appendNumber(num: number) {
    if (this.pinValue().length < 6) {
      this.pinValue.update(v => v + num.toString());
      this.error.set('');
    }
  }

  clear() {
    this.pinValue.set('');
    this.error.set('');
  }

  async submit() {
    if (this.pinValue().length < 4) {
      this.error.set('PIN must be at least 4 digits');
      return;
    }

    this.isVerifying.set(true);
    this.error.set('');

    try {
      // Mocking verify PIN for now
      // const user = await this.authService.verifyPin(this.pinValue());
      const verified = this.pinValue() === '123456'; // dummy check
      
      if (verified) {
        this.close({ verified: true, user: { role: 'manager' } });
      } else {
        this.error.set('Invalid PIN. Please try again.');
        this.pinValue.set('');
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Verification failed');
      this.pinValue.set('');
    } finally {
      this.isVerifying.set(false);
    }
  }
}
