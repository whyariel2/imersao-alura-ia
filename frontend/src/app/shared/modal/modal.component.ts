import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.escape)': 'onEscape()'
  }
})
export class ModalComponent {
  isOpen = input<boolean>(false);
  title = input<string>('');
  closeOnBackdrop = input<boolean>(true);

  close = output<void>();

  onEscape(): void {
    if (this.isOpen()) {
      this.close.emit();
    }
  }

  handleBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
