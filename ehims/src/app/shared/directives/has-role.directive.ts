import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private authService = inject(AuthService);

  @Input() appHasRole!: UserRole | UserRole[];

  constructor() {
    effect(() => {
      const rolesToCheck = Array.isArray(this.appHasRole) ? this.appHasRole : [this.appHasRole];
      const hasPermission = this.authService.hasRole(rolesToCheck);
      
      this.viewContainer.clear();
      if (hasPermission) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}
