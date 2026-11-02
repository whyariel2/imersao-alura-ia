import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-stack-chip',
  standalone: true,
  templateUrl: './stack-chip.component.html',
  styleUrls: ['./stack-chip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StackChipComponent {
  name = input.required<string>();
  color = input<string>('#38bdf8');
}
